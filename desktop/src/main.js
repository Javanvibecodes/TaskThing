const { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage, globalShortcut, clipboard } = require('electron');
const path = require('path');
const os = require('os');
const QRCode = require('qrcode');
const LocalStore = require('./store');
const SyncServer = require('./sync-server');

let mainWindow = null;
let tray = null;
let store = null;
let syncServer = null;
let isPinned = false;
let isCompact = false;

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

function initSyncServer() {
  const data = store.get();
  const port = data.settings?.syncPort || 48721;
  const token = data.settings?.pairingToken || 'TC-LOCAL';

  syncServer = new SyncServer({
    port,
    token,
    onRequestSnapshot: () => {
      return store.get();
    },
    onMutation: (mutation) => {
      handleRemoteMutation(mutation);
    },
    onClientCountChange: (count) => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('sync:clientCount', count);
      }
    }
  });

  syncServer.start(port, token);
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
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('sync:remoteMutation', mutation);
  }
}

function createTray() {
  const svgIcon = `
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16">
      <rect width="14" height="14" x="1" y="1" rx="4" fill="#8083ff"/>
      <path d="M4 8l3 3 5-5" stroke="#ffffff" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
  `;
  const icon = nativeImage.createFromBuffer(Buffer.from(svgIcon));
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
      label: 'Compact Mode',
      type: 'checkbox',
      checked: isCompact,
      click: (menuItem) => {
        toggleCompactMode(menuItem.checked);
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

function toggleCompactMode(forceState) {
  isCompact = typeof forceState === 'boolean' ? forceState : !isCompact;
  if (isCompact) {
    mainWindow.setMinimumSize(320, 68);
    mainWindow.setSize(340, 68);
    mainWindow.setResizable(false);
  } else {
    mainWindow.setMinimumSize(360, 480);
    mainWindow.setSize(440, 600);
    mainWindow.setResizable(true);
  }
  return isCompact;
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

ipcMain.handle('window:toggleCompact', () => {
  return toggleCompactMode();
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
  return store.save(data);
});

ipcMain.handle('export:markdown', (event, content) => {
  clipboard.writeText(content);
  return true;
});

// Broadcast local desktop changes to mobile clients
ipcMain.handle('sync:broadcastMutation', (event, mutation) => {
  if (syncServer && mutation) {
    syncServer.broadcast(mutation.type, mutation.payload);
    return true;
  }
  return false;
});

ipcMain.handle('sync:getNetworkInfo', () => {
  const ip = getPrimaryIpAddress();
  const allIps = getAllLocalIpAddresses();
  const data = store ? store.get() : {};
  const port = data.settings?.syncPort || 48721;
  const token = data.settings?.pairingToken || 'TC-LOCAL';
  const clientCount = syncServer ? syncServer.getClientCount() : 0;

  return {
    ip,
    allIps,
    port,
    token,
    clientCount,
    url: `http://${ip}:${port}`,
    wsUrl: `ws://${ip}:${port}?token=${token}`
  };
});

ipcMain.handle('sync:generatePairingQR', async () => {
  const ip = getPrimaryIpAddress();
  const allIps = getAllLocalIpAddresses().map(a => a.address);
  const data = store ? store.get() : {};
  const port = data.settings?.syncPort || 48721;
  const token = data.settings?.pairingToken || 'TC-LOCAL';

  const payload = JSON.stringify({
    app: 'tasks.core',
    version: '1.0.0',
    primaryHost: ip,
    hosts: allIps,
    port: port,
    token: token
  });

  try {
    const qrDataUrl = await QRCode.toDataURL(payload, {
      margin: 1,
      color: {
        dark: '#dae2fd',
        light: '#131b2e'
      },
      width: 180
    });
    return { success: true, qr: qrDataUrl, payload };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

app.whenReady().then(() => {
  createWindow();
  createTray();

  globalShortcut.register('CommandOrControl+Shift+T', () => {
    if (mainWindow.isVisible()) {
      mainWindow.hide();
    } else {
      mainWindow.show();
      mainWindow.focus();
    }
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('will-quit', () => {
  if (syncServer) syncServer.stop();
  globalShortcut.unregisterAll();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
