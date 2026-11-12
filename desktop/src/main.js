const { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage, clipboard } = require('electron');
const path = require('path');
const crypto = require('crypto');
const os = require('os');
const LocalStore = require('./store');
const SyncServer = require('./sync-server');
const { findFreePort } = require('./port-utils');

let mainWindow = null;
let tray = null;
let store = null;
let syncServer = null;
let isPinned = false;

// Discover all non-internal IPv4 LAN & Hotspot network interfaces
function getAllLocalIpAddresses() {
  const interfaces = os.networkInterfaces();
  const addresses = [];
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        addresses.push({
          name,
          address: iface.address,
          isHotspot: iface.address.startsWith('172.20.10.') || iface.address.startsWith('192.168.43.')
        });
      }
    }
  }
  return addresses;
}

function getPrimaryIpAddress() {
  const addrs = getAllLocalIpAddresses();
  // If there's a hotspot interface, prioritize or use the first non-loopback
  if (addrs.length > 0) {
    return addrs[0].address;
  }
  return '127.0.0.1';
}

function createWindow() {
  store = new LocalStore();
  const settings = store.get().settings || {};

  const iconPath = path.join(__dirname, 'assets', 'blob.png');

  mainWindow = new BrowserWindow({
    width: 440,
    height: 600,
    minWidth: 360,
    minHeight: 480,
    frame: false,
    transparent: true,
    hasShadow: false,
    resizable: true,
    alwaysOnTop: settings.alwaysOnTop || false,
    skipTaskbar: false,
    backgroundColor: '#00000000',
    icon: iconPath,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true
    }
  });

  isPinned = !!settings.alwaysOnTop;

  mainWindow.loadFile(path.join(__dirname, 'index.html'));

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  mainWindow.webContents.setWindowOpenHandler(() => {
    return { action: 'deny' };
  });

  // Start Sync Server
  initSyncServer();
}

function sendToRenderer(channel, payload) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(channel, payload);
  }
}

async function initSyncServer() {
  const data = store.get();
  data.settings = data.settings || {};
  let token = data.settings.pairingToken;
  if (!/^[a-f0-9]{64}$/i.test(token || '')) {
    token = crypto.randomBytes(32).toString('hex');
    data.settings.pairingToken = token;
  }

  // Never assume the stored port is ours: a previous copy of the app, or any
  // other program, may still be holding it. Take the first port that is free.
  const port = await findFreePort(data.settings.syncPort);
  data.settings.syncPort = port;
  store.save(data);

  syncServer = new SyncServer({
    port,
    deviceName: os.hostname(),
    onRequestSnapshot: () => {
      return store.get();
    },
    onMutation: (mutation) => {
      handleRemoteMutation(mutation);
    },
    onClientCountChange: (count) => {
      sendToRenderer('sync:clientCount', count);
    },
    onClientsChange: (clients) => {
      sendToRenderer('sync:clients', clients);
    },
    onPairingCodeChange: (code) => {
      sendToRenderer('sync:pairingCode', code);
    }
  });

  syncServer.start(port, token);
  sendToRenderer('sync:networkChanged');
}

function handleRemoteMutation(mutation) {
  if (!store || !mutation) return;
  const data = store.get();
  const { type, payload } = mutation;

  switch (type) {
    case 'TASK_ADDED':
      if (payload && !data.activeTasks.some(t => t.id === payload.id)) {
        data.activeTasks.push(payload);
        store.save(data);
      }
      break;

    case 'TASK_COMPLETED':
      if (payload) {
        data.activeTasks = data.activeTasks.filter(t => t.id !== payload.id);
        const compItem = {
          id: payload.completedId || ('comp-' + Date.now()),
          title: payload.title,
          completedAt: payload.completedAt || new Date().toISOString(),
          group: 'today'
        };
        data.completedTasks.unshift(compItem);
        store.save(data);
      }
      break;

    case 'TASK_REOPENED':
      if (payload) {
        data.completedTasks = data.completedTasks.filter(c => c.id !== payload.id);
        if (!data.activeTasks.some(t => t.id === payload.newActiveTask?.id)) {
          data.activeTasks.push(payload.newActiveTask || {
            id: 'task-' + Date.now(),
            title: payload.title,
            priority: 'medium',
            tag: 'General',
            createdAt: new Date().toISOString()
          });
        }
        store.save(data);
      }
      break;

    case 'TASK_DELETED':
      if (payload?.id) {
        data.activeTasks = data.activeTasks.filter(t => t.id !== payload.id);
        data.completedTasks = data.completedTasks.filter(c => c.id !== payload.id);
        store.save(data);
      }
      break;

    case 'TASK_EDITED':
      if (payload?.id) {
        const item = data.activeTasks.find(t => t.id === payload.id);
        if (item) {
          Object.assign(item, payload);
          store.save(data);
        }
      }
      break;

    default:
      break;
  }

  // Forward to renderer so the desktop UI updates instantly
  sendToRenderer('sync:remoteMutation', mutation);
}

function createTray() {
  const blobIconPath = path.join(__dirname, 'assets', 'blob.png');
  let icon;
  try {
    icon = nativeImage.createFromPath(blobIconPath).resize({ width: 16, height: 16 });
  } catch (e) {
    const svgIcon = `
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16">
        <rect width="14" height="14" x="1" y="1" rx="4" fill="#0381FC"/>
        <path d="M4 8l3 3 5-5" stroke="#ffffff" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    `;
    icon = nativeImage.createFromBuffer(Buffer.from(svgIcon));
  }
  tray = new Tray(icon);
  tray.setToolTip('Task Thing — Get your things together');

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Toggle Widget',
      click: () => {
        if (mainWindow.isVisible()) {
          mainWindow.hide();
        } else {
          mainWindow.show();
          mainWindow.focus();
        }
      }
    },
    {
      label: 'Always On Top',
      type: 'checkbox',
      checked: isPinned,
      click: (menuItem) => {
        isPinned = menuItem.checked;
        mainWindow.setAlwaysOnTop(isPinned);
      }
    },
    { type: 'separator' },
    {
      label: 'Quick Add Task',
      click: () => {
        if (!mainWindow.isVisible()) mainWindow.show();
        mainWindow.focus();
        mainWindow.webContents.send('action:quick-add');
      }
    },
    { type: 'separator' },
    {
      label: 'Quit Task Thing',
      click: () => {
        app.isQuitting = true;
        app.quit();
      }
    }
  ]);

  tray.setContextMenu(contextMenu);
  tray.on('click', () => {
    if (mainWindow.isVisible()) {
      mainWindow.hide();
    } else {
      mainWindow.show();
      mainWindow.focus();
    }
  });
}

// IPC Handlers
ipcMain.on('window:minimize', () => {
  if (mainWindow) mainWindow.minimize();
});

ipcMain.on('window:close', () => {
  if (mainWindow) mainWindow.hide();
});

ipcMain.handle('window:togglePin', () => {
  if (!mainWindow) return false;
  isPinned = !isPinned;
  mainWindow.setAlwaysOnTop(isPinned);
  return isPinned;
});

ipcMain.handle('system:getPlatform', () => {
  return process.platform; // 'win32', 'darwin', or 'linux'
});

ipcMain.handle('storage:loadData', () => {
  if (!store) store = new LocalStore();
  return store.get();
});

ipcMain.handle('storage:saveData', (event, data) => {
  if (!store) store = new LocalStore();
  const saved = store.save(data);

  // Push the authoritative state to every connected phone on *every* save.
  // Relying on each call site to describe its own change meant edits such as
  // "queue for tomorrow" never reached the phone at all.
  if (syncServer) syncServer.broadcastSnapshot();
  return saved;
});

ipcMain.handle('export:markdown', (event, content) => {
  clipboard.writeText(content);
  return true;
});

ipcMain.handle('clipboard:write', (event, content) => {
  clipboard.writeText(String(content || ''));
  return true;
});

// Broadcast local desktop changes to mobile clients
ipcMain.handle('sync:broadcastMutation', (event, mutation) => {
  if (!syncServer) return false;
  syncServer.broadcastSnapshot();
  return true;
});

// Manual refresh: re-read the store from disk and push it to every device.
ipcMain.handle('sync:refresh', () => {
  if (!store) store = new LocalStore();
  store.data = store.load();
  if (syncServer) syncServer.broadcastSnapshot();
  return store.get();
});

ipcMain.handle('sync:getNetworkInfo', () => {
  const ip = getPrimaryIpAddress();
  const allIps = getAllLocalIpAddresses();
  const data = store ? store.get() : {};
  const port = data.settings?.syncPort || 0;
  const token = data.settings?.pairingToken || '';
  const clientCount = syncServer ? syncServer.getClientCount() : 0;

  return {
    ip,
    allIps,
    port,
    token,
    deviceName: os.hostname(),
    pairingCode: syncServer ? syncServer.getPairingCode() : '',
    clientCount,
    clients: syncServer ? syncServer.getClients() : [],
    url: port ? `http://${ip}:${port}` : '',
    wsUrl: port ? `ws://${ip}:${port}` : ''
  };
});

ipcMain.handle('sync:regeneratePairingCode', () => {
  if (!syncServer) return null;
  return syncServer.rotatePairingCode();
});

ipcMain.handle('app:checkLatestVersion', async () => {
  const { execSync } = require('child_process');
  const currentVersion = '1.0.0';
  let latestTag = null;
  let changelog = '';
  try {
    // Fetch all tags from origin (may fail if no remote configured)
    const tagsOutput = execSync('git fetch --tags && git tag --sort=-version:refname', { encoding: 'utf8' });
    const tags = tagsOutput.split('\n').filter(t => t.trim());
    if (tags.length > 0) {
      latestTag = tags[0].trim();
      // Try to read the CHANGELOG.md for the latest tag
      try {
        const changelogContent = require('fs').readFileSync(path.join(__dirname, '..', '..', 'CHANGELOG.md'), 'utf8');
        // Extract changelog section for the latest tag
        const lines = changelogContent.split('\n');
        let inSection = false;
        for (const line of lines) {
          if (line.trim() === '## [' + latestTag) { inSection = true; continue; }
          if (inSection) {
            if (line.trim() === '## [' || line.startsWith('###') && line.includes('[')) { break; }
            changelog += line + '\n';
          }
        }
      } catch (e) {
        // CHANGELOG.md not found - that's ok
      }
    }
  } catch (e) {
    // No git remote or tags available
    latestTag = null;
  }
  return {
    current: currentVersion,
    latest: latestTag || currentVersion,
    changelog: changelog.trim() || null
  };
});

app.whenReady().then(() => {
  createWindow();
  createTray();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('will-quit', () => {
  if (syncServer) syncServer.stop();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
