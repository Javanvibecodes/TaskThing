// Task Thing — Mobile Hybrid Sync Engine & Touch Client
(function() {
  let mobileData = {
    settings: {
      themePreset: 'cobalt',
      connected: false
    },
    tagsBank: ['Design', 'Dev', 'Ops', 'Team', 'Personal'],
    repeatedTasks: [],
    tomorrowTasks: [],
    activeTasks: [],
    completedTasks: []
  };

  let syncConfig = {
    host: '',
    hosts: [],
    port: 0,           // 0 = not known yet; the PC picks a free port at runtime
    token: '',
    desktopName: '',
    desktopPlatform: '',
    connected: false,
    mode: 'disconnected'
  };

  let offlineQueue = [];
  let ws = null;
  let reconnectTimer = null;
  let connectTimeout = null;
  let heartbeatTimer = null;
  let manualDisconnect = false;
  let refreshPending = false;
  let hintTimer = null;
  let currentPriority = 'urgent';
  let currentTagIndex = 0;
  let schedulingTarget = 'today'; // 'today' | 'tomorrow'

  // Editing state
  let editingTaskId = null;
  let editPriority = 'medium';
  let editTagIndex = 0;
  let editingHabitId = null;
  let habitPriority = 'medium';
  let habitTagIndex = 0;

  const HOTSPOT_CANDIDATES = [
    '172.20.10.1',  // iPhone hotspot gateway
    '172.20.10.2',  // PC on iPhone hotspot
    '192.168.43.1', // Android hotspot gateway
    '192.168.43.2', // PC on Android hotspot
    '192.168.1.1'
  ];

  // DOM Elements
  const tabButtons = document.querySelectorAll('.mobile-tab-btn');
  const screens = document.querySelectorAll('.mobile-screen');
  const activeTasksList = document.getElementById('mobile-tasks-list');
  const repeatedTasksList = document.getElementById('mobile-repeated-list');
  const historyList = document.getElementById('mobile-history-list');
  const mobilePendingBadge = document.getElementById('mobile-nav-pending-badge');
  const historyCountBadge = document.getElementById('mobile-history-count');
  const searchInput = document.getElementById('mobile-history-search');
  const todayDateBadge = document.getElementById('mobile-today-date');
  const mobileSkeleton = document.getElementById('mobile-skeleton');
  const emptyNoTasks = document.getElementById('mobile-empty-no-tasks');
  const emptyAllCompleted = document.getElementById('mobile-empty-all-completed');
  const allCompletedText = document.getElementById('mobile-all-completed-text');
  const btnEmptyAdd = document.getElementById('mobile-btn-empty-add');

  // Quick Add Elements
  const quickAddBox = document.getElementById('mobile-quick-add-box');
  const toggleAddBtn = document.getElementById('mobile-toggle-add-btn');
  const addIcon = document.getElementById('mobile-add-icon');
  const addText = document.getElementById('mobile-add-text');
  const btnAddDropdown = document.getElementById('mobile-btn-add-dropdown');
  const addMenu = document.getElementById('mobile-add-menu');
  const optToday = document.getElementById('mobile-opt-today');
  const optTomorrow = document.getElementById('mobile-opt-tomorrow');
  const quickInput = document.getElementById('mobile-quick-input');
  const btnSubmit = document.getElementById('mobile-btn-submit');
  const btnPriority = document.getElementById('mobile-btn-priority');
  const priorityDot = document.getElementById('mobile-priority-dot');
  const priorityLabel = document.getElementById('mobile-priority-label');
  const btnTag = document.getElementById('mobile-btn-tag');
  const tagLabel = document.getElementById('mobile-tag-label');
  const btnAddTag = document.getElementById('mobile-btn-add-tag');
  const schedBadge = document.getElementById('mobile-sched-badge');

  // Mobile Tag Modal Elements
  const newTagModal = document.getElementById('mobile-new-tag-modal');
  const inputNewTag = document.getElementById('mobile-input-new-tag');
  const btnSaveNewTag = document.getElementById('mobile-btn-save-new-tag');
  const btnCancelTagModal = document.getElementById('mobile-btn-cancel-tag-modal');
  const btnCloseTagModal = document.getElementById('mobile-btn-close-tag-modal');

  // Mobile Edit Task Modal Elements
  const taskModal = document.getElementById('mobile-task-modal');
  const taskModalTitle = document.getElementById('mobile-task-modal-title');
  const editTaskTitle = document.getElementById('mobile-edit-task-title');
  const editPriorityBtn = document.getElementById('mobile-edit-priority');
  const editPriorityDot = document.getElementById('mobile-edit-priority-dot');
  const editPriorityLabel = document.getElementById('mobile-edit-priority-label');
  const editTimeInput = document.getElementById('mobile-edit-time');
  const editTagBtn = document.getElementById('mobile-edit-tag');
  const editTagLabel = document.getElementById('mobile-edit-tag-label');
  const btnSaveTaskEdit = document.getElementById('mobile-btn-save-task-edit');
  const btnCancelTaskModal = document.getElementById('mobile-btn-cancel-task-modal');
  const btnCloseTaskModal = document.getElementById('mobile-btn-close-task-modal');

  // Mobile Habit Inline Form Elements (shared by create + edit)
  const habitAddBox = document.getElementById('mobile-habit-add-box');
  const habitTitleInput = document.getElementById('mobile-habit-title');
  const habitPriorityBtn = document.getElementById('mobile-habit-priority');
  const habitPriorityDot = document.getElementById('mobile-habit-priority-dot');
  const habitPriorityLabel = document.getElementById('mobile-habit-priority-label');
  const habitTimeInput = document.getElementById('mobile-habit-time');
  const habitTagBtn = document.getElementById('mobile-habit-tag');
  const habitTagLabel = document.getElementById('mobile-habit-tag-label');
  const btnSaveHabit = document.getElementById('mobile-btn-save-habit');
  const btnCancelHabit = document.getElementById('mobile-btn-cancel-habit');
  const saveHabitText = document.getElementById('mobile-save-habit-text');
  const addHabitIcon = document.getElementById('mobile-add-habit-icon');
  const addHabitText = document.getElementById('mobile-add-habit-text');

  const mainScroll = document.getElementById('mobile-main-scroll');

  // Tomorrow Banner
  const tomorrowBanner = document.getElementById('mobile-tomorrow-banner');
  const tomorrowCountText = document.getElementById('mobile-tomorrow-count');
  const btnViewTomorrow = document.getElementById('mobile-btn-view-tomorrow');
  const btnAddHabit = document.getElementById('mobile-btn-add-habit');

  // Sync screen elements
  const manualIpInput = document.getElementById('manual-ip-input');
  const manualCodeInput = document.getElementById('manual-code-input');
  const btnManualConnect = document.getElementById('btn-manual-connect');
  const btnReconnect = document.getElementById('mobile-btn-reconnect');
  const btnDisconnect = document.getElementById('mobile-btn-disconnect');
  const btnRefresh = document.getElementById('mobile-btn-refresh');
  const syncPeer = document.getElementById('mobile-sync-peer');
  const syncHint = document.getElementById('mobile-sync-hint');
  const mobileSyncDot = document.getElementById('mobile-sync-dot');
  const mobileSyncText = document.getElementById('mobile-sync-text');
  const mobileSyncDetailStatus = document.getElementById('mobile-sync-detail-status');
  const btnSyncHeader = document.getElementById('btn-sync-header');

  // Help & Legal elements
  const btnCheckUpdates = document.getElementById('btn-check-updates');
  const btnDownloadUpdate = document.getElementById('btn-download-update');
  const updateStatus = document.getElementById('update-status');
  const currentAppVersionEl = document.getElementById('current-app-version');
  const btnReportIssue = document.getElementById('btn-report-issue');
  const reportIssueText = document.getElementById('report-issue-text');
  const reportStatus = document.getElementById('report-status');

  const APP_VERSION = (document.querySelector('meta[name="app-version"]')?.content || '1.0.4').trim();
  const LATEST_RELEASE_API = 'https://api.github.com/repos/Javanvibecodes/TaskThing/releases/latest';
  const btnAddHabitTag = document.getElementById('mobile-btn-add-habit-tag');

  // ----------------- STORAGE & PERSISTENCE -----------------
  function loadPersistedState() {
    try {
      const savedData = localStorage.getItem('tasks_mobile_data');
      if (savedData) {
        mobileData = Object.assign(mobileData, JSON.parse(savedData));
      } else {
        mobileData.activeTasks = [];
        mobileData.completedTasks = [];
      }

      if (!mobileData.tagsBank) mobileData.tagsBank = ['Design', 'Dev', 'Ops', 'Team', 'Personal'];
      if (!mobileData.repeatedTasks) mobileData.repeatedTasks = [];
      if (!mobileData.tomorrowTasks) mobileData.tomorrowTasks = [];
      if (!mobileData.activeTasks) mobileData.activeTasks = [];
      if (!mobileData.completedTasks) mobileData.completedTasks = [];

      const savedConfig = localStorage.getItem('tasks_sync_config');
      if (savedConfig) {
        syncConfig = Object.assign(syncConfig, JSON.parse(savedConfig));
      }
      const savedQueue = localStorage.getItem('tasks_offline_queue');
      if (savedQueue) {
        offlineQueue = JSON.parse(savedQueue);
        compactOfflineQueue();
        if (offlineQueue.length > 0) {
          localStorage.setItem('tasks_offline_queue', JSON.stringify(offlineQueue));
        } else {
          localStorage.removeItem('tasks_offline_queue');
        }
      }

      checkDayRollover();
    } catch (e) {
      console.warn('Local storage load error:', e);
    }
  }

  function checkDayRollover() {
    const today = getTodayString();
    const lastDate = mobileData.lastActiveDate || today;

    if (lastDate !== today) {
      // 1. Move tomorrowTasks to activeTasks
      if (mobileData.tomorrowTasks && mobileData.tomorrowTasks.length > 0) {
        mobileData.tomorrowTasks.forEach(task => {
          task.date = today;
          task.isRollover = false;
          mobileData.activeTasks.push(task);
        });
        mobileData.tomorrowTasks = [];
      }

      // 2. Mark uncompleted active tasks from yesterday as rollover (red highlight)
      if (mobileData.activeTasks && mobileData.activeTasks.length > 0) {
        mobileData.activeTasks.forEach(task => {
          if (task.date && task.date < today) {
            task.isRollover = true;
          }
        });
      }

      // 3. Instantiate repeated tasks
      if (mobileData.repeatedTasks && mobileData.repeatedTasks.length > 0) {
        mobileData.repeatedTasks.forEach(rep => {
          if (rep.enabled) {
            const exists = mobileData.activeTasks.some(t => t.repeatedOriginId === rep.id && t.date === today);
            if (!exists) {
              mobileData.activeTasks.push({
                id: 'm-rep-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
                repeatedOriginId: rep.id,
                title: rep.title,
                priority: rep.priority || 'medium',
                time: rep.time || '',
                tag: rep.tag || 'Daily',
                date: today,
                isRollover: false,
                createdAt: new Date().toISOString()
              });
            }
          }
        });
      }

      mobileData.lastActiveDate = today;
      persistData();
    }
  }

  function persistData() {
    try {
      localStorage.setItem('tasks_mobile_data', JSON.stringify(mobileData));
    } catch (e) {}
  }

  function persistSyncConfig() {
    try {
      localStorage.setItem('tasks_sync_config', JSON.stringify({
        host: syncConfig.host,
        hosts: syncConfig.hosts,
        port: syncConfig.port,
        token: syncConfig.token,
        desktopName: syncConfig.desktopName,
        desktopPlatform: syncConfig.desktopPlatform
      }));
    } catch (e) {}
  }

  // Collapse the offline queue down to actual pending changes. An add that is
  // followed by a delete of the same item cancels out, and repeated edits of
  // the same task/habit keep only the latest one. Without this, the Sync screen
  // could report "N changes queued" even though the net change set is empty.
  function compactOfflineQueue() {
    if (!offlineQueue.length) return;

    const out = [];
    const pendingAdd = new Map();
    const lastByType = new Map();
    const indicesByKey = new Map();

    offlineQueue.forEach(mutation => {
      if (!mutation || !mutation.type) return;
      const id = mutation.payload && mutation.payload.id;
      if (!id) {
        out.push(mutation);
        return;
      }

      const isHabit = mutation.type.startsWith('HABIT');
      const key = (isHabit ? 'h:' : 't:') + id;
      const isAdd = mutation.type === 'TASK_ADDED' || mutation.type === 'HABIT_ADDED';
      const isDelete = mutation.type === 'TASK_DELETED' || mutation.type === 'HABIT_DELETED';

      if (isAdd) {
        pendingAdd.set(key, out.length);
        indicesByKey.set(key, [out.length]);
        out.push(mutation);
        return;
      }

      if (isDelete) {
        if (pendingAdd.has(key)) {
          // The item was created offline and is now gone again: nothing to sync.
          (indicesByKey.get(key) || []).forEach(index => { out[index] = null; });
          pendingAdd.delete(key);
          indicesByKey.delete(key);
        } else {
          const indices = indicesByKey.get(key) || [];
          indices.push(out.length);
          indicesByKey.set(key, indices);
          out.push(mutation);
        }
        return;
      }

      // Edited / completed / reopened: keep only the most recent one per type.
      const typeKey = mutation.type + ':' + key;
      const indices = indicesByKey.get(key) || [];
      if (lastByType.has(typeKey)) {
        out[lastByType.get(typeKey)] = mutation;
      } else {
        lastByType.set(typeKey, out.length);
        indices.push(out.length);
        indicesByKey.set(key, indices);
        out.push(mutation);
      }
    });

    offlineQueue = out
      .filter(Boolean)
      .sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
  }

  function queueOfflineMutation(mutation) {
    // DO NOT queue theme mutations — themes stay local!
    if (mutation.type === 'THEME_CHANGED') return;

    mutation.timestamp = Date.now();
    offlineQueue.push(mutation);
    compactOfflineQueue();
    try {
      localStorage.setItem('tasks_offline_queue', JSON.stringify(offlineQueue));
    } catch (e) {}
    updateConnectionUI();
  }

  function clearOfflineQueue() {
    offlineQueue = [];
    localStorage.removeItem('tasks_offline_queue');
  }

  // ----------------- REAL-TIME SYNC CLIENT -----------------
  function teardownSocket() {
    if (connectTimeout) clearTimeout(connectTimeout);
    connectTimeout = null;
    stopHeartbeat();
    if (ws) {
      ws.onopen = null;
      ws.onmessage = null;
      ws.onclose = null;
      ws.onerror = null;
      try { ws.close(); } catch (e) {}
      ws = null;
    }
  }

  // Kill the attempt at once, show why it failed, then settle back into the
  // plain "no connection" state so nothing keeps retrying behind the user.
  function failConnection(message) {
    teardownSocket();
    syncConfig.connected = false;
    updateConnectionUI('failed', null, message);
    setTimeout(() => {
      if (!syncConfig.connected && !ws) updateConnectionUI('disconnected');
    }, 4000);
  }

  function disconnectFromDesktop() {
    manualDisconnect = true;
    if (reconnectTimer) clearTimeout(reconnectTimer);
    reconnectTimer = null;
    teardownSocket();
    syncConfig.connected = false;
    updateConnectionUI('disconnected');
    if (syncConfig.host) {
      mobileSyncDetailStatus.textContent = 'Disconnected — tap Reconnect to sync again';
    }
  }

  async function connectToDesktop(customHost = null, options = {}) {
    const pairingCode = String(options.code || '').replace(/\D/g, '');

    if (reconnectTimer) clearTimeout(reconnectTimer);
    reconnectTimer = null;
    teardownSocket();

    const hostToTry = customHost || syncConfig.host;
    if (!hostToTry) {
      updateConnectionUI('disconnected');
      return;
    }

    manualDisconnect = false;

    updateConnectionUI('connecting', hostToTry);

    // The PC never promises a fixed port (it takes the first one that is free),
    // so probe for it instead of assuming. A port typed in by hand wins.
    let port = options.rediscover ? 0 : (syncConfig.port || 0);
    if (!port) {
      setSyncHint('Looking for Task Thing on ' + hostToTry + '…');
      const found = await discoverDesktop(hostToTry);
      if (!found) {
        setSyncHint('');
        failConnection('No Task Thing answered at ' + hostToTry + '. Check the IP and that both devices are on the same Wi-Fi.');
        return;
      }
      port = found.port;
      if (found.device) syncConfig.desktopName = found.device;
    }

    syncConfig.host = hostToTry;
    syncConfig.port = port;
    persistSyncConfig();
    setSyncHint('');

    // A code is only ever used for the first pairing; reconnects use the
    // long-lived token the desktop handed back after that pairing.
    const wsUrl = `ws://${hostToTry}:${port}`;
    const authProtocol = pairingCode
      ? `taskthing-code-${pairingCode}`
      : `taskthing-token-${syncConfig.token || ''}`;

    try {
      ws = new WebSocket(wsUrl, ['taskthing', authProtocol]);

      // Strict timeout: abort the attempt instead of leaving it hanging.
      connectTimeout = setTimeout(() => {
        if (ws && ws.readyState === WebSocket.CONNECTING) {
          failConnection('Connection timed out — the PC did not answer. Check the IP and that both devices are on the same Wi-Fi.');
        }
      }, 6000);

      ws.onopen = () => {
        if (connectTimeout) clearTimeout(connectTimeout);
        connectTimeout = null;
        syncConfig.host = hostToTry;
        syncConfig.connected = true;
        syncConfig.mode = isHotspotIp(hostToTry) ? 'hotspot' : 'lan';
        persistSyncConfig();
        updateConnectionUI('connected', hostToTry);

        // Introduce this phone so the PC can show which device is linked.
        sendWsMessage({
          type: 'HELLO',
          payload: { name: getThisDeviceName(), platform: getPlatformLabel() }
        });

        // Fetch state snapshot
        sendWsMessage({ type: 'SYNC_INIT_REQUEST' });

        // Flush queued mutations
        if (offlineQueue.length > 0) {
          sendWsMessage({
            type: 'OFFLINE_QUEUE_SYNC',
            payload: offlineQueue
          });
          clearOfflineQueue();
        }

        startHeartbeat();
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          handleServerMessage(msg);
        } catch (e) {
          // Ignore malformed messages
        }
      };

      ws.onclose = () => {
        if (connectTimeout) clearTimeout(connectTimeout);
        connectTimeout = null;
        const wasConnected = syncConfig.connected;
        syncConfig.connected = false;
        stopHeartbeat();
        ws = null;

        if (wasConnected) {
          updateConnectionUI('disconnected');
          if (!manualDisconnect) scheduleAutoReconnect();
          return;
        }

        if (manualDisconnect) {
          updateConnectionUI('disconnected');
          return;
        }

        // The PC may have come back on a different port (it takes the first one
        // that is free), so scan once more before declaring failure.
        if (!pairingCode && !options.rediscover && syncConfig.host) {
          connectToDesktop(syncConfig.host, Object.assign({}, options, { rediscover: true }));
          return;
        }

        failConnection(pairingCode
          ? 'Pairing failed — that code is not valid for this PC. Get the current code from the PC Preferences and try again.'
          : 'Connection failed — check the PC IP, the port, and that the phone is on the same Wi-Fi.');
      };

      ws.onerror = () => {
        // onclose reports the failure with a readable reason.
      };
    } catch (err) {
      console.error('WebSocket connection failed:', err);
      failConnection('Connection failed: ' + (err.message || err));
    }
  }

  // ----------------- PORT DISCOVERY -----------------
  // The PC binds the first free port from this range, so the phone asks each
  // candidate for its /ping instead of assuming 48721 is the one.
  const PORT_SCAN_START = 48721;
  const PORT_SCAN_COUNT = 25;

  function probeDesktopPort(host, port) {
    return new Promise((resolve) => {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 900);
      fetch(`http://${host}:${port}/ping`, { signal: controller.signal })
        .then((res) => (res.ok ? res.json() : null))
        .then((info) => {
          clearTimeout(timer);
          if (info && info.app === 'Task Thing') {
            resolve({ port: Number(info.port) || port, device: info.device || '' });
          } else {
            resolve(null);
          }
        })
        .catch(() => {
          clearTimeout(timer);
          resolve(null);
        });
    });
  }

  async function discoverDesktop(host) {
    if (!host) return null;

    // A port already known to work is tried first, then the whole range.
    const ports = [];
    if (syncConfig.port) ports.push(syncConfig.port);
    for (let i = 0; i < PORT_SCAN_COUNT; i += 1) {
      const candidate = PORT_SCAN_START + i;
      if (!ports.includes(candidate)) ports.push(candidate);
    }

    const results = await Promise.all(ports.map((port) => probeDesktopPort(host, port)));
    return results.find(Boolean) || null;
  }

  function setSyncHint(message, autoHideMs = 0) {
    if (!syncHint) return;
    if (hintTimer) {
      clearTimeout(hintTimer);
      hintTimer = null;
    }
    if (!message) {
      syncHint.textContent = '';
      syncHint.classList.add('hidden');
      return;
    }
    syncHint.textContent = message;
    syncHint.classList.remove('hidden');
    if (autoHideMs > 0) {
      hintTimer = setTimeout(() => {
        hintTimer = null;
        syncHint.textContent = '';
        syncHint.classList.add('hidden');
      }, autoHideMs);
    }
  }

  function platformName(platform) {
    if (!platform) return '';
    if (platform === 'win32') return 'Windows PC';
    if (platform === 'android') return 'Android';
    if (platform === 'ios') return 'iPhone';
    return platform.charAt(0).toUpperCase() + platform.slice(1);
  }

  function getThisDeviceName() {
    const ua = navigator.userAgent || '';
    const android = ua.match(/Android[^;]*;\s*([^;)]+?)(?:\s+Build|\))/);
    if (android && android[1]) return android[1].trim();
    if (/iPhone/.test(ua)) return 'iPhone';
    if (/iPad/.test(ua)) return 'iPad';
    if (/Windows/.test(ua)) return 'Phone browser on Windows';
    if (/Macintosh/.test(ua)) return 'Browser on Mac';
    return 'Phone browser';
  }

  function isHotspotIp(ip) {
    return ip.startsWith('172.20.10.') || ip.startsWith('192.168.43.');
  }

  function sendWsMessage(msg) {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(msg));
      return true;
    }
    return false;
  }

  function sendOrQueueMutation(mutation) {
    // Never send theme changes to desktop
    if (mutation.type === 'THEME_CHANGED') return;

    const sent = sendWsMessage(mutation);
    if (!sent) {
      queueOfflineMutation(mutation);
    }
  }

  function handleServerMessage(msg) {
    const { type, payload } = msg;

    if (type === 'PAIR_ACCEPTED' && payload && payload.token) {
      // First pairing succeeded: remember the long-lived token and drop the
      // one-time code so it is never reused.
      syncConfig.token = payload.token;
      persistSyncConfig();
      if (manualCodeInput) manualCodeInput.value = '';
      return;
    }

    if (type === 'WELCOME' && payload) {
      // The PC tells us who it is, so the phone can name the machine it is on.
      syncConfig.desktopName = payload.name || syncConfig.desktopName;
      syncConfig.desktopPlatform = payload.platform || syncConfig.desktopPlatform;
      persistSyncConfig();
      if (ws && ws.readyState === WebSocket.OPEN) updateConnectionUI('connected', syncConfig.host);
      return;
    }

    if (type === 'STATE_SNAPSHOT') {
      if (payload) {
        if (Array.isArray(payload.activeTasks)) {
          mobileData.activeTasks = payload.activeTasks;
        }
        if (Array.isArray(payload.tomorrowTasks)) {
          mobileData.tomorrowTasks = payload.tomorrowTasks;
        }
        if (Array.isArray(payload.completedTasks)) {
          mobileData.completedTasks = payload.completedTasks;
        }
        if (Array.isArray(payload.repeatedTasks)) {
          mobileData.repeatedTasks = payload.repeatedTasks;
        }
        if (Array.isArray(payload.tagsBank)) {
          mobileData.tagsBank = payload.tagsBank;
          updateTagUI();
        }
        // Note: We deliberately do NOT overwrite mobileData.settings.themePreset!
        persistData();
        renderActiveTasks();
        renderHistory();
        renderRepeatedTasks();
        updateTomorrowBanner();

        if (refreshPending) {
          refreshPending = false;
          const active = (payload.activeTasks || []).length;
          setSyncHint(`Refreshed from your PC · ${active} active task${active === 1 ? '' : 's'}`, 4000);
        }
      }
      return;
    }

    if (type === 'TASK_ADDED' && payload) {
      if (!mobileData.activeTasks.some(t => t.id === payload.id)) {
        mobileData.activeTasks.push(payload);
        persistData();
        renderActiveTasks();
      }
    } else if (type === 'TASK_COMPLETED' && payload) {
      mobileData.activeTasks = mobileData.activeTasks.filter(t => t.id !== payload.id);
      const compItem = {
        id: payload.completedId || ('mc-' + Date.now()),
        title: payload.title,
        completedAt: payload.completedAt || new Date().toISOString(),
        group: 'today'
      };
      mobileData.completedTasks.unshift(compItem);
      persistData();
      renderActiveTasks();
      renderHistory();
    } else if (type === 'TASK_REOPENED' && payload) {
      mobileData.completedTasks = mobileData.completedTasks.filter(c => c.id !== payload.id);
      if (payload.newActiveTask && !mobileData.activeTasks.some(t => t.id === payload.newActiveTask.id)) {
        mobileData.activeTasks.push(payload.newActiveTask);
      }
      persistData();
      renderActiveTasks();
      renderHistory();
    } else if (type === 'TASK_DELETED' && payload?.id) {
      mobileData.activeTasks = mobileData.activeTasks.filter(t => t.id !== payload.id);
      mobileData.completedTasks = mobileData.completedTasks.filter(c => c.id !== payload.id);
      persistData();
      renderActiveTasks();
      renderHistory();
    } else if (type === 'TASK_EDITED' && payload?.id) {
      const item = mobileData.activeTasks.find(t => t.id === payload.id);
      if (item) {
        Object.assign(item, payload);
        persistData();
        renderActiveTasks();
      }
    }
  }

  function scheduleAutoReconnect() {
    if (manualDisconnect) return;
    if (reconnectTimer) clearTimeout(reconnectTimer);

    reconnectTimer = setTimeout(async () => {
      if (syncConfig.connected || manualDisconnect) return;

      // If we already have a successful connection host, try that first. The
      // PC's port may have changed while the phone was away, so rediscover it.
      if (syncConfig.host) {
        connectToDesktop(syncConfig.host, { rediscover: true });
        return;
      }

      // Otherwise look for the PC on known hosts and the usual hotspot IPs.
      const candidates = [...(syncConfig.hosts || []), ...HOTSPOT_CANDIDATES];
      for (const ip of candidates) {
        if (!ip) continue;
        const found = await discoverDesktop(ip);
        if (found) {
          connectToDesktop(ip, { rediscover: true });
          return;
        }
      }
    }, 3000);
  }

  function startHeartbeat() {
    stopHeartbeat();
    heartbeatTimer = setInterval(() => {
      sendWsMessage({ type: 'PING', timestamp: Date.now() });
    }, 15000);
  }

  function stopHeartbeat() {
    if (heartbeatTimer) clearInterval(heartbeatTimer);
  }

  // Update Visual Real-Time Indicators
  function updateConnectionUI(state = null, host = null, errorMsg = null) {
    const isConn = state === 'connected' || (ws && ws.readyState === WebSocket.OPEN);
    const isConnPending = state === 'connecting' || (ws && ws.readyState === WebSocket.CONNECTING);
    const isFailed = state === 'failed';

    // Only ever show one primary action at a time: Disconnect while a session
    // is live (or starting), Reconnect when there is nothing to disconnect.
    if (btnDisconnect) {
      btnDisconnect.classList.toggle('hidden', !(isConn || isConnPending));
    }
    if (btnReconnect) {
      btnReconnect.classList.toggle('hidden', isConn || isConnPending);
    }

    if (syncPeer) {
      const desktopName = syncConfig.desktopName || '';
      if (isConn && desktopName) {
        const plat = platformName(syncConfig.desktopPlatform);
        syncPeer.textContent = `Connected to ${desktopName}${plat ? ' · ' + plat : ''} · ${syncConfig.host}:${syncConfig.port}`;
        syncPeer.classList.remove('hidden');
      } else {
        syncPeer.textContent = '';
        syncPeer.classList.add('hidden');
      }
    }

    if (isConn) {
      const modeText = syncConfig.mode === 'hotspot' ? 'Hotspot Synced' : 'LAN Synced';
      mobileSyncDot.className = 'w-2 h-2 rounded-full bg-primary animate-pulse';
      mobileSyncText.textContent = host ? modeText : 'PC Synced';
      mobileSyncText.className = 'font-label-mono text-[10px] text-primary font-semibold';
      mobileSyncDetailStatus.textContent = `Connected (${syncConfig.host || host}:${syncConfig.port})`;
      mobileSyncDetailStatus.className = 'font-headline-sm text-body-md text-primary font-semibold';
    } else if (isConnPending) {
      mobileSyncDot.className = 'w-2 h-2 rounded-full bg-tertiary animate-pulse';
      mobileSyncText.textContent = 'Connecting...';
      mobileSyncText.className = 'font-label-mono text-[10px] text-tertiary font-medium';
      mobileSyncDetailStatus.textContent = 'Searching for PC Widget...';
      mobileSyncDetailStatus.className = 'font-headline-sm text-body-md text-tertiary font-semibold';
    } else if (isFailed) {
      mobileSyncDot.className = 'w-2 h-2 rounded-full bg-error';
      mobileSyncText.textContent = 'Connection Failed';
      mobileSyncText.className = 'font-label-mono text-[10px] text-error font-medium';
      mobileSyncDetailStatus.textContent = errorMsg || 'Connection Failed — PC Unreachable (Check Wi-Fi / Hotspot)';
      mobileSyncDetailStatus.className = 'font-headline-sm text-body-md text-error font-semibold';
    } else {
      mobileSyncDot.className = 'w-2 h-2 rounded-full bg-outline';
      mobileSyncText.textContent = offlineQueue.length > 0 ? `Offline (${offlineQueue.length} Queued)` : 'Offline';
      mobileSyncText.className = 'font-label-mono text-[10px] text-on-surface-variant font-medium';
      mobileSyncDetailStatus.textContent = offlineQueue.length > 0 ? `Offline (${offlineQueue.length} changes queued to sync)` : 'Disconnected / Standalone';
      mobileSyncDetailStatus.className = 'font-headline-sm text-body-md text-on-surface font-semibold';
    }
  }

  // ----------------- ACTIVE TASKS & EMPTY STATES -----------------
  function renderActiveTasks() {
    activeTasksList.innerHTML = '';
    const tasks = mobileData.activeTasks || [];
    
    // Pending badge on the Today tab: only visible when tasks are pending
    if (mobilePendingBadge) {
      if (tasks.length > 0) {
        mobilePendingBadge.textContent = tasks.length;
        mobilePendingBadge.classList.remove('hidden');
        mobilePendingBadge.classList.add('flex');
      } else {
        mobilePendingBadge.textContent = '';
        mobilePendingBadge.classList.add('hidden');
        mobilePendingBadge.classList.remove('flex');
      }
    }

    const todayCompletedCount = (mobileData.completedTasks || []).filter(c => c.group === 'today' || !c.group).length;

    if (tasks.length === 0) {
      if (todayCompletedCount > 0) {
        emptyNoTasks.classList.add('hidden');
        emptyAllCompleted.classList.remove('hidden');
        allCompletedText.textContent = `You completed ${todayCompletedCount} task${todayCompletedCount > 1 ? 's' : ''} today. Everything is done!`;
      } else {
        emptyAllCompleted.classList.add('hidden');
        emptyNoTasks.classList.remove('hidden');
      }
      return;
    }

    emptyNoTasks.classList.add('hidden');
    emptyAllCompleted.classList.add('hidden');

    tasks.forEach(task => {
      const item = document.createElement('div');
      
      let borderStyle = '';
      if (task.isRollover) {
        borderStyle = 'border border-error/40 bg-error-container/40 ring-1 ring-error/20';
      } else {
        borderStyle = 'bg-surface-container active:bg-surface-container-high border border-outline-variant';
      }

      item.className = `${borderStyle} p-3 rounded-xl flex items-center justify-between gap-3 shadow-sm transition-all`;
      
      let priorityClass = 'bg-surface-container-highest text-on-surface-variant';
      if (task.priority === 'urgent') priorityClass = 'bg-error-container text-error';
      else if (task.priority === 'medium') priorityClass = 'bg-primary-container text-on-primary-container';

      item.innerHTML = `
        <div class="flex items-center gap-3 min-w-0 flex-1">
          <button class="complete-btn w-6 h-6 rounded-full bg-surface-container-highest flex items-center justify-center text-transparent hover:text-primary active:scale-90 transition-all shrink-0">
            <span class="material-symbols-outlined text-[16px]">check</span>
          </button>
          <div class="flex flex-col min-w-0 task-title-box cursor-pointer">
            <div class="flex items-center gap-1.5 min-w-0">
              <span class="font-body-md text-on-surface truncate font-medium">${escapeHtml(task.title)}</span>
              ${task.isRollover ? `
                <span class="h-3.5 px-1 rounded bg-error text-on-error font-label-mono text-[8px] font-bold uppercase shrink-0">Overdue</span>
              ` : ''}
            </div>
            <div class="flex items-center gap-2 mt-1">
              <span class="h-4 px-1.5 rounded ${priorityClass} font-label-mono text-[9px] font-semibold">
                ${task.priority ? task.priority.toUpperCase() : 'NORMAL'}
              </span>
              ${task.time ? `
                <span class="font-label-mono text-[10px] text-on-surface-variant flex items-center gap-0.5">
                  <span class="material-symbols-outlined text-[11px]">schedule</span>
                  ${escapeHtml(task.time)}
                </span>
              ` : ''}
              ${task.tag ? `
                <span class="font-label-mono text-[10px] text-on-surface-variant bg-surface-container-high px-1 rounded">
                  ${escapeHtml(task.tag)}
                </span>
              ` : ''}
              ${task.isRollover ? `
                <button class="move-today-btn font-label-mono text-[9px] text-error hover:underline flex items-center gap-0.5">
                  <span class="material-symbols-outlined text-[10px]">update</span>
                  <span>Move to Today</span>
                </button>
              ` : ''}
            </div>
          </div>
        </div>
        <div class="flex items-center gap-1 shrink-0">
          <button class="edit-btn w-8 h-8 rounded-full flex items-center justify-center text-on-surface-variant active:text-primary">
            <span class="material-symbols-outlined text-[17px]">edit</span>
          </button>
          <button class="delete-btn w-8 h-8 rounded-full flex items-center justify-center text-on-surface-variant active:text-error">
            <span class="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>
      `;

      item.querySelector('.complete-btn').addEventListener('click', () => completeTask(task.id));
      item.querySelector('.delete-btn').addEventListener('click', () => deleteTask(task.id));
      item.querySelector('.edit-btn').addEventListener('click', () => openTaskEditModal(task.id));
      item.querySelector('.task-title-box').addEventListener('click', (e) => {
        if (!e.target.closest('.move-today-btn')) openTaskEditModal(task.id);
      });

      const moveBtn = item.querySelector('.move-today-btn');
      if (moveBtn) {
        moveBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          task.isRollover = false;
          task.date = getTodayString();
          persistData();
          sendOrQueueMutation({ type: 'TASK_EDITED', payload: task });
          renderActiveTasks();
        });
      }

      activeTasksList.appendChild(item);
    });
  }

  function completeTask(id) {
    const idx = mobileData.activeTasks.findIndex(t => t.id === id);
    if (idx === -1) return;
    const [t] = mobileData.activeTasks.splice(idx, 1);
    const compItem = {
      id: 'mc-' + Date.now(),
      title: t.title,
      completedAt: new Date().toISOString(),
      group: 'today'
    };
    mobileData.completedTasks.unshift(compItem);
    persistData();

    sendOrQueueMutation({
      type: 'TASK_COMPLETED',
      payload: {
        id: t.id,
        completedId: compItem.id,
        title: t.title,
        completedAt: compItem.completedAt
      }
    });

    renderActiveTasks();
    renderHistory();
  }

  function deleteTask(id) {
    mobileData.activeTasks = mobileData.activeTasks.filter(t => t.id !== id);
    persistData();

    sendOrQueueMutation({
      type: 'TASK_DELETED',
      payload: { id }
    });

    renderActiveTasks();
  }

  // ----------------- TOMORROW SCHEDULING -----------------
  function updateTomorrowBanner() {
    const tomorrowCount = (mobileData.tomorrowTasks || []).length;
    if (tomorrowCount > 0) {
      tomorrowBanner.classList.remove('hidden');
      tomorrowCountText.textContent = `${tomorrowCount} task${tomorrowCount > 1 ? 's' : ''} queued for tomorrow`;
    } else {
      tomorrowBanner.classList.add('hidden');
    }
  }

  // ----------------- REPEATED HABITS -----------------
  function renderRepeatedTasks() {
    repeatedTasksList.innerHTML = '';
    const habits = mobileData.repeatedTasks || [];

    if (habits.length === 0) {
      repeatedTasksList.innerHTML = `
        <div class="py-12 text-center flex flex-col items-center justify-center text-on-surface-variant gap-1">
          <span class="material-symbols-outlined text-[32px]">event_repeat</span>
          <span class="font-headline-sm text-on-surface-variant font-semibold">No daily habits configured</span>
          <span class="font-body-sm text-on-surface-variant text-[12px]">Add habits you repeat every day to automatically appear each morning.</span>
        </div>
      `;
      return;
    }

    habits.forEach(habit => {
      const card = document.createElement('div');
      card.className = 'bg-surface-container p-3 rounded-xl flex items-center justify-between gap-3 border border-outline-variant';
      card.innerHTML = `
        <div class="flex items-center gap-3 min-w-0 flex-1">
          <input type="checkbox" ${habit.enabled ? 'checked' : ''} class="w-4 h-4 accent-primary rounded cursor-pointer"/>
          <div class="flex flex-col min-w-0">
            <span class="font-body-md text-on-surface truncate ${habit.enabled ? '' : 'text-on-surface-variant line-through'} font-medium">${escapeHtml(habit.title)}</span>
            <div class="flex items-center gap-2 mt-0.5 font-label-mono text-[10px] text-on-surface-variant">
              <span class="text-primary font-semibold">Repeats Daily</span>
              ${habit.time ? `<span>• ${escapeHtml(habit.time)}</span>` : ''}
              ${habit.tag ? `<span class="bg-surface-container-high px-1 rounded text-on-surface-variant">${escapeHtml(habit.tag)}</span>` : ''}
            </div>
          </div>
        </div>
        <div class="flex items-center gap-1 shrink-0">
          <button class="edit-habit-btn w-8 h-8 rounded-full flex items-center justify-center text-on-surface-variant active:text-primary">
            <span class="material-symbols-outlined text-[16px]">edit</span>
          </button>
          <button class="delete-habit-btn w-8 h-8 rounded-full flex items-center justify-center text-on-surface-variant active:text-error">
            <span class="material-symbols-outlined text-[16px]">delete</span>
          </button>
        </div>
      `;

      card.querySelector('input').addEventListener('change', (e) => {
        habit.enabled = e.target.checked;
        persistData();
        renderRepeatedTasks();
      });

      card.querySelector('.edit-habit-btn').addEventListener('click', () => openHabitForm(habit.id));

      card.querySelector('.delete-habit-btn').addEventListener('click', () => {
        mobileData.repeatedTasks = mobileData.repeatedTasks.filter(h => h.id !== habit.id);
        persistData();
        sendOrQueueMutation({ type: 'HABIT_DELETED', payload: { id: habit.id } });
        renderRepeatedTasks();
      });

      repeatedTasksList.appendChild(card);
    });
  }

  // ----------------- COMPLETED HISTORY -----------------
  function historyGroupFor(item) {
    const raw = item.completedAt || item.completedDate || null;
    const completed = raw ? new Date(raw) : new Date();
    if (isNaN(completed.getTime())) return 'earlier';
    const now = new Date();
    const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startItem = new Date(completed.getFullYear(), completed.getMonth(), completed.getDate());
    const diffDays = Math.round((startToday - startItem) / 86400000);
    if (diffDays <= 0) return 'today';
    if (diffDays === 1) return 'yesterday';
    return 'earlier';
  }

  function formatHistoryTime(isoString) {
    if (!isoString) return '';
    try {
      const d = new Date(isoString);
      if (isNaN(d.getTime())) return '';
      return `Completed ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } catch (e) {
      return '';
    }
  }

  function createHistoryCard(item) {
    const card = document.createElement('div');
    card.className = 'bg-surface-container p-2.5 rounded-xl flex items-center justify-between gap-2 border border-outline-variant';
    const timeLabel = formatHistoryTime(item.completedAt);
    card.innerHTML = `
      <div class="flex items-center gap-2.5 min-w-0 flex-1">
        <span class="w-4 h-4 rounded bg-primary text-white flex items-center justify-center shrink-0">
          <span class="material-symbols-outlined text-[12px]">check</span>
        </span>
        <div class="flex flex-col min-w-0">
          <span class="font-body-sm text-on-surface-variant line-through truncate">${escapeHtml(item.title)}</span>
          ${timeLabel ? `<span class="font-label-mono text-[9px] text-on-surface-variant/80">${timeLabel}</span>` : ''}
        </div>
      </div>
      <button class="undo-btn px-2.5 py-1 rounded-lg bg-primary-container text-on-primary-container font-label-mono text-[10px] shrink-0 active:scale-95 font-semibold">
        Undo
      </button>
    `;

    card.querySelector('.undo-btn').addEventListener('click', () => {
      mobileData.completedTasks = mobileData.completedTasks.filter(c => c.id !== item.id);
      const restoredTask = {
        id: 'm-' + Date.now(),
        title: item.title,
        priority: 'medium',
        tag: 'General',
        date: getTodayString(),
        isRollover: false
      };
      mobileData.activeTasks.push(restoredTask);
      persistData();

      sendOrQueueMutation({
        type: 'TASK_REOPENED',
        payload: { id: item.id, title: item.title, newActiveTask: restoredTask }
      });

      renderActiveTasks();
      renderHistory();
    });

    return card;
  }

  function renderHistory(query = '') {
    historyList.innerHTML = '';
    const q = query.toLowerCase().trim();
    const completed = mobileData.completedTasks || [];
    historyCountBadge.textContent = `${completed.length} Finished`;

    const filtered = completed.filter(c => (c.title || '').toLowerCase().includes(q));

    if (filtered.length === 0) {
      historyList.innerHTML = `
        <div class="py-10 text-center text-on-surface-variant flex flex-col items-center">
          <span class="material-symbols-outlined text-[24px]">history</span>
          <span class="font-body-sm mt-1">No completed tasks found</span>
        </div>
      `;
      return;
    }

    const groups = [
      { key: 'today', label: 'Today' },
      { key: 'yesterday', label: 'Yesterday' },
      { key: 'earlier', label: 'Earlier This Week' }
    ];

    groups.forEach(group => {
      const items = filtered.filter(c => historyGroupFor(c) === group.key);
      if (items.length === 0) return;
      const section = document.createElement('div');
      section.className = 'flex flex-col gap-2';
      section.innerHTML = `
        <div class="flex items-center justify-between font-label-mono text-[10px] font-semibold uppercase tracking-wider text-on-surface-variant">
          <span>${group.label}</span>
          <span class="text-primary">${items.length}</span>
        </div>
        <div class="flex flex-col gap-2 history-group-items"></div>
      `;
      const list = section.querySelector('.history-group-items');
      items.forEach(item => list.appendChild(createHistoryCard(item)));
      historyList.appendChild(section);
    });
  }

  // ----------------- THEMES (LOCAL TO MOBILE) -----------------
  function applyTheme(preset, save = false) {
    document.documentElement.setAttribute('data-theme', preset);
    document.body.setAttribute('data-theme', preset);
    mobileData.settings.themePreset = preset;

    document.querySelectorAll('.mobile-preset-btn').forEach(b => {
      const chk = b.querySelector('.material-symbols-outlined');
      if (b.dataset.preset === preset) {
        b.classList.remove('border-transparent');
        b.classList.add('border-primary');
        if (chk) chk.classList.remove('hidden');
      } else {
        b.classList.remove('border-primary', 'border-primary/40');
        b.classList.add('border-transparent');
        if (chk) chk.classList.add('hidden');
      }
    });

    if (save) {
      persistData(); // LOCAL ONLY — never broadcast theme!
    }
  }

  function updateTagUI() {
    const tags = mobileData.tagsBank;
    if (currentTagIndex >= tags.length) currentTagIndex = 0;
    tagLabel.textContent = tags[currentTagIndex];
  }

  // Accepts "ip", "ip:port", a query link, or a full pairing link such as
  // ws://192.168.1.15:48722?token=TC-AB12CD34 (what the PC copies). A missing
  // port stays 0, which makes the caller discover the PC's live port.
  function parseManualTarget(rawValue) {
    let value = (rawValue || '').trim();
    if (!value) return null;

    if (/^(wss?|https?):\/\//i.test(value)) {
      try {
        const parsed = new URL(value);
        if (!parsed.hostname) return null;
        return {
          host: parsed.hostname,
          port: parseInt(parsed.port, 10) || 0,
          token: parsed.searchParams.get('token') || ''
        };
      } catch (e) {
        // Fall through to the plain host:port parser below
      }
    }

    let token = '';
    const queryIndex = value.indexOf('?');
    if (queryIndex >= 0) {
      token = new URLSearchParams(value.slice(queryIndex + 1)).get('token') || '';
      value = value.slice(0, queryIndex);
    }

    value = value.replace(/\/.*$/, '');
    const parts = value.split(':');
    const host = (parts[0] || '').trim();
    if (!host) return null;

    return {
      host,
      port: parseInt(parts[1], 10) || 0,
      token
    };
  }

  function switchScreen(targetKey) {
    // Only one class drives the active look, so the icon and the label always
    // share the same colour.
    tabButtons.forEach(btn => {
      const isTarget = btn.getAttribute('data-target') === targetKey;
      btn.classList.toggle('is-active', isTarget);
      btn.setAttribute('aria-selected', isTarget ? 'true' : 'false');
    });

    screens.forEach(s => {
      if (s.id === `screen-${targetKey}`) {
        s.classList.remove('hidden');
      } else {
        s.classList.add('hidden');
      }
    });

    if (mainScroll) mainScroll.scrollTop = 0;

    // Close modals when switching screens
    closeTaskModal();
    closeHabitForm();
    closeHabitModal();

  }

  // ----------------- MOBILE OPENING (clean logo splash) -----------------
  function playMobileOpeningAnimation() {
    return new Promise((resolve) => {
      const splash = document.getElementById('mobile-opening');
      if (!splash) {
        resolve();
        return;
      }
      let finished = false;
      const finish = () => {
        if (finished) return;
        finished = true;
        splash.style.transition = 'opacity 0.25s ease';
        splash.style.opacity = '0';
        splash.style.pointerEvents = 'none';
        setTimeout(() => {
          try { splash.remove(); } catch (e) { /* ignore */ }
          resolve();
        }, 260);
      };

      splash.addEventListener('click', finish);
      splash.addEventListener('touchstart', finish, { passive: true });
      setTimeout(finish, 650);
    });
  }

  // ----------------- TASK / HABIT EDIT MODALS -----------------
  const PRIORITY_ORDER = ['urgent', 'medium', 'low'];

  function stylePriorityButton(btn, dot, label, priority) {
    label.textContent = priority.charAt(0).toUpperCase() + priority.slice(1);
    if (priority === 'urgent') {
      dot.className = 'w-1.5 h-1.5 rounded-full bg-error';
      btn.className = 'h-6 px-2 rounded bg-error-container text-error font-label-mono text-[10px] font-semibold flex items-center gap-1';
    } else if (priority === 'medium') {
      dot.className = 'w-1.5 h-1.5 rounded-full bg-tertiary';
      btn.className = 'h-6 px-2 rounded bg-primary-container text-on-primary-container font-label-mono text-[10px] font-semibold flex items-center gap-1';
    } else {
      dot.className = 'w-1.5 h-1.5 rounded-full bg-secondary';
      btn.className = 'h-6 px-2 rounded bg-surface-container-high text-on-surface-variant font-label-mono text-[10px] font-semibold flex items-center gap-1';
    }
  }

  function openTaskEditModal(taskId) {
    const task = (mobileData.activeTasks || []).find(t => t.id === taskId);
    if (!task || !taskModal) return;
    editingTaskId = taskId;
    editPriority = task.priority || 'medium';
    editTagIndex = (mobileData.tagsBank || []).indexOf(task.tag);
    taskModalTitle.textContent = 'Edit Task';
    editTaskTitle.value = task.title || '';
    editTimeInput.value = task.time || '17:00';
    editTagLabel.textContent = task.tag || 'General';
    stylePriorityButton(editPriorityBtn, editPriorityDot, editPriorityLabel, editPriority);
    taskModal.classList.remove('hidden');
    setTimeout(() => editTaskTitle.focus(), 80);
  }

  function closeTaskModal() {
    if (taskModal) taskModal.classList.add('hidden');
    editingTaskId = null;
  }

  function saveTaskEdit() {
    if (!editingTaskId) return;
    const task = (mobileData.activeTasks || []).find(t => t.id === editingTaskId);
    if (!task) { closeTaskModal(); return; }
    const title = editTaskTitle.value.trim();
    if (!title) return;
    task.title = title;
    task.priority = editPriority;
    task.time = editTimeInput.value || '';
    task.tag = editTagIndex >= 0
      ? (mobileData.tagsBank[editTagIndex] || task.tag || 'General')
      : (task.tag || 'General');
    persistData();
    sendOrQueueMutation({ type: 'TASK_EDITED', payload: task });
    closeTaskModal();
    renderActiveTasks();
  }

  function openHabitForm(habitId = null) {
    if (!habitAddBox) return;
    editingHabitId = habitId;
    if (habitId) {
      const habit = (mobileData.repeatedTasks || []).find(h => h.id === habitId);
      if (!habit) return;
      habitPriority = habit.priority || 'medium';
      habitTagIndex = (mobileData.tagsBank || []).indexOf(habit.tag);
      habitTitleInput.value = habit.title || '';
      habitTimeInput.value = habit.time || '09:00';
      habitTagLabel.textContent = habit.tag || 'Daily';
      if (saveHabitText) saveHabitText.textContent = 'Save Changes';
    } else {
      habitPriority = 'medium';
      habitTagIndex = -1;
      habitTitleInput.value = '';
      habitTimeInput.value = '09:00';
      habitTagLabel.textContent = 'Daily';
      if (saveHabitText) saveHabitText.textContent = 'Save Habit';
    }
    stylePriorityButton(habitPriorityBtn, habitPriorityDot, habitPriorityLabel, habitPriority);
    habitAddBox.classList.remove('hidden');
    if (addHabitIcon) addHabitIcon.textContent = 'close';
    if (addHabitText) addHabitText.textContent = 'Close';
    setTimeout(() => {
      habitTitleInput.focus();
      if (mainScroll) habitAddBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 80);
  }

  function closeHabitForm() {
    if (habitAddBox) habitAddBox.classList.add('hidden');
    editingHabitId = null;
    if (addHabitIcon) addHabitIcon.textContent = 'add';
    if (addHabitText) addHabitText.textContent = 'Add Habit';
  }

  function toggleHabitForm() {
    if (habitAddBox && habitAddBox.classList.contains('hidden')) {
      openHabitForm();
    } else {
      closeHabitForm();
    }
  }

  function saveHabit() {
    const title = habitTitleInput.value.trim();
    if (!title) return;
    const tag = habitTagIndex >= 0
      ? ((mobileData.tagsBank || [])[habitTagIndex] || 'Daily')
      : 'Daily';

    if (editingHabitId) {
      const habit = (mobileData.repeatedTasks || []).find(h => h.id === editingHabitId);
      if (habit) {
        habit.title = title;
        habit.priority = habitPriority;
        habit.time = habitTimeInput.value || '09:00';
        habit.tag = tag;
        persistData();
        sendOrQueueMutation({ type: 'HABIT_EDITED', payload: habit });
        renderRepeatedTasks();
      }
    } else {
      const habit = {
        id: 'rep-m-' + Date.now(),
        title,
        priority: habitPriority,
        time: habitTimeInput.value || '09:00',
        tag,
        enabled: true
      };
      mobileData.repeatedTasks.push(habit);
      persistData();
      sendOrQueueMutation({ type: 'HABIT_ADDED', payload: habit });
      renderRepeatedTasks();
    }
    closeHabitForm();
  }

  // ----------------- INITIALIZATION -----------------
  function init() {
    playMobileOpeningAnimation();
    if (mobileSkeleton) mobileSkeleton.classList.remove('hidden');

    try {
      loadPersistedState();

      const now = new Date();
      if (todayDateBadge) {
        todayDateBadge.textContent = now.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
      }

      applyTheme(mobileData.settings.themePreset || 'cobalt', false);
      updateTagUI();
      renderActiveTasks();
      renderHistory();
      renderRepeatedTasks();
      updateTomorrowBanner();
    } catch (err) {
      console.error('Task Thing Mobile init error:', err);
    } finally {
      if (mobileSkeleton) mobileSkeleton.classList.add('hidden');
    }

    // Only auto-reconnect when this phone has already paired (has a token);
    // otherwise wait for the user's code entry instead of failing on launch.
    if (manualIpInput) {
      manualIpInput.value = syncConfig.host
        ? `${syncConfig.host}${syncConfig.port ? ':' + syncConfig.port : ''}`
        : '';
    }

    if (syncConfig.host && syncConfig.token) {
      connectToDesktop(syncConfig.host);
    } else {
      updateConnectionUI('disconnected');
    }

    // Tab buttons
    tabButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const target = btn.getAttribute('data-target');
        if (target) switchScreen(target);
      });
    });

    if (btnSyncHeader) {
      btnSyncHeader.addEventListener('click', () => switchScreen('sync'));
    }

    // Toggle Quick Add Form (Hidden by default)
    function openQuickAdd(target = 'today') {
      schedulingTarget = target;
      schedBadge.textContent = target === 'tomorrow' ? 'Tomorrow' : 'Today';
      quickAddBox.classList.remove('hidden');
      addText.textContent = 'Close';
      addIcon.textContent = 'close';
      quickInput.focus();
      addMenu.classList.add('hidden');
    }

    function closeQuickAdd() {
      quickAddBox.classList.add('hidden');
      addText.textContent = 'Add Task';
      addIcon.textContent = 'add';
      quickInput.value = '';
    }

    toggleAddBtn.addEventListener('click', () => {
      if (quickAddBox.classList.contains('hidden')) {
        openQuickAdd('today');
      } else {
        closeQuickAdd();
      }
    });

    btnEmptyAdd?.addEventListener('click', () => openQuickAdd('today'));

    btnAddDropdown.addEventListener('click', (e) => {
      e.stopPropagation();
      addMenu.classList.toggle('hidden');
    });

    optToday.addEventListener('click', () => openQuickAdd('today'));
    optTomorrow.addEventListener('click', () => openQuickAdd('tomorrow'));

    // Submit Task
    function submitTask() {
      const title = quickInput.value.trim();
      if (!title) return;

      const newTask = {
        id: 'm-' + Date.now(),
        title,
        priority: currentPriority,
        tag: mobileData.tagsBank[currentTagIndex],
        time: '17:00',
        date: schedulingTarget === 'tomorrow' ? getTomorrowString() : getTodayString(),
        isRollover: false,
        createdAt: new Date().toISOString()
      };

      if (schedulingTarget === 'tomorrow') {
        mobileData.tomorrowTasks.push(newTask);
        persistData();
        updateTomorrowBanner();
        alert('Queued for Tomorrow!');
      } else {
        mobileData.activeTasks.push(newTask);
        persistData();
        sendOrQueueMutation({ type: 'TASK_ADDED', payload: newTask });
        renderActiveTasks();
      }

      quickInput.value = '';
      closeQuickAdd();
    }

    btnSubmit.addEventListener('click', submitTask);

    // Priority button
    const priorities = ['urgent', 'medium', 'low'];
    btnPriority.addEventListener('click', () => {
      const next = (priorities.indexOf(currentPriority) + 1) % priorities.length;
      currentPriority = priorities[next];
      stylePriorityButton(btnPriority, priorityDot, priorityLabel, currentPriority);
    });

    // Tag button & New Tag
    btnTag.addEventListener('click', () => {
      currentTagIndex = (currentTagIndex + 1) % mobileData.tagsBank.length;
      updateTagUI();
    });

    // Mobile Tag Modal Controls
    let tagModalSource = 'task'; // 'task' or 'habit'

    function openTagModal(source = 'task') {
      tagModalSource = source;
      if (!newTagModal) return;
      newTagModal.classList.remove('hidden');
      if (inputNewTag) {
        inputNewTag.value = '';
        setTimeout(() => inputNewTag.focus(), 80);
      }
    }

    function closeTagModal() {
      if (newTagModal) newTagModal.classList.add('hidden');
    }

    function saveTagFromInput() {
      if (!inputNewTag) return;
      const clean = inputNewTag.value.trim();
      if (clean) {
        if (!mobileData.tagsBank.includes(clean)) {
          mobileData.tagsBank.push(clean);
          persistData();
          sendWsMessage({ type: 'TAG_ADDED', payload: clean });
        }
        
        if (tagModalSource === 'habit') {
          habitTagIndex = mobileData.tagsBank.indexOf(clean);
          if (habitTagLabel) habitTagLabel.textContent = clean;
        } else {
          currentTagIndex = mobileData.tagsBank.indexOf(clean);
          updateTagUI();
        }
      }
      closeTagModal();
    }

    btnAddTag?.addEventListener('click', () => openTagModal('task'));
    btnAddHabitTag?.addEventListener('click', () => openTagModal('habit'));
    btnSaveNewTag?.addEventListener('click', saveTagFromInput);
    btnCancelTagModal?.addEventListener('click', closeTagModal);
    btnCloseTagModal?.addEventListener('click', closeTagModal);

    inputNewTag?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        saveTagFromInput();
      } else if (e.key === 'Escape') {
        closeTagModal();
      }
    });

    // Mobile Task Edit Modal Controls
    editPriorityBtn?.addEventListener('click', () => {
      editPriority = PRIORITY_ORDER[(PRIORITY_ORDER.indexOf(editPriority) + 1) % PRIORITY_ORDER.length];
      stylePriorityButton(editPriorityBtn, editPriorityDot, editPriorityLabel, editPriority);
    });

    editTagBtn?.addEventListener('click', () => {
      if (!mobileData.tagsBank.length) return;
      editTagIndex = (editTagIndex + 1) % mobileData.tagsBank.length;
      editTagLabel.textContent = mobileData.tagsBank[editTagIndex];
    });

    btnSaveTaskEdit?.addEventListener('click', saveTaskEdit);
    btnCancelTaskModal?.addEventListener('click', closeTaskModal);
    btnCloseTaskModal?.addEventListener('click', closeTaskModal);

    editTaskTitle?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        saveTaskEdit();
      } else if (e.key === 'Escape') {
        closeTaskModal();
      }
    });

    // Mobile Habit Inline Form Controls (New + Edit)
    btnAddHabit.addEventListener('click', toggleHabitForm);

    habitPriorityBtn?.addEventListener('click', () => {
      habitPriority = PRIORITY_ORDER[(PRIORITY_ORDER.indexOf(habitPriority) + 1) % PRIORITY_ORDER.length];
      stylePriorityButton(habitPriorityBtn, habitPriorityDot, habitPriorityLabel, habitPriority);
    });

    habitTagBtn?.addEventListener('click', () => {
      if (!mobileData.tagsBank.length) return;
      habitTagIndex = (habitTagIndex + 1) % mobileData.tagsBank.length;
      habitTagLabel.textContent = mobileData.tagsBank[habitTagIndex];
    });

    btnSaveHabit?.addEventListener('click', saveHabit);
    btnCancelHabit?.addEventListener('click', closeHabitForm);

    habitTitleInput?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        saveHabit();
      } else if (e.key === 'Escape') {
        closeHabitForm();
      }
    });

    btnViewTomorrow.addEventListener('click', () => {
      alert(`Queued for Tomorrow (${mobileData.tomorrowTasks.length} tasks):\n\n` +
        mobileData.tomorrowTasks.map((t, i) => `${i+1}. ${t.title}`).join('\n')
      );
    });

    searchInput.addEventListener('input', (e) => renderHistory(e.target.value));

    // Pairing code input: digits only, six max.
    manualCodeInput?.addEventListener('input', () => {
      manualCodeInput.value = manualCodeInput.value.replace(/\D/g, '').slice(0, 6);
    });

    // Manual / code pairing
    btnManualConnect.addEventListener('click', () => {
      const target = parseManualTarget(manualIpInput.value);
      if (!target) {
        alert('Enter your PC IP address, for example 192.168.1.15, or paste the pairing link from the PC.');
        return;
      }

      const code = manualCodeInput ? manualCodeInput.value.replace(/\D/g, '') : '';
      if (target.token) {
        syncConfig.token = target.token;
        if (manualCodeInput) manualCodeInput.value = '';
      }

      if (!code && !target.token && !syncConfig.token) {
        alert('Enter the 6-digit pairing code shown in the PC Preferences.');
        return;
      }

      syncConfig.host = target.host;
      syncConfig.port = target.port;
      persistSyncConfig();
      connectToDesktop(syncConfig.host, { isManual: true, code });
    });

    manualCodeInput?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        btnManualConnect.click();
      }
    });

    btnReconnect.addEventListener('click', () => {
      if (syncConfig.host) {
        connectToDesktop(syncConfig.host, { isManual: true });
      } else {
        alert('Enter the PC IP address and the 6-digit pairing code above.');
      }
    });

    btnDisconnect?.addEventListener('click', () => disconnectFromDesktop());

    // Pull the current state on demand, in case a push was missed.
    btnRefresh?.addEventListener('click', () => {
      if (ws && ws.readyState === WebSocket.OPEN) {
        refreshPending = true;
        setSyncHint('Refreshing from your PC…');
        sendWsMessage({ type: 'SYNC_INIT_REQUEST' });
        setTimeout(() => {
          if (refreshPending) {
            refreshPending = false;
            setSyncHint('The PC did not answer the refresh. Check it is still running.', 6000);
          }
        }, 6000);
        return;
      }

      renderActiveTasks();
      renderHistory();
      renderRepeatedTasks();
      updateTomorrowBanner();
      setSyncHint('Showing the data saved on this phone. Connect to pull the latest from your PC.', 6000);
    });

    // Theme selector (Local Only)
    document.querySelectorAll('.mobile-preset-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        applyTheme(btn.dataset.preset, true);
      });
    });

    // Check for Updates button
    if (currentAppVersionEl) currentAppVersionEl.textContent = 'v' + APP_VERSION;
    btnCheckUpdates?.addEventListener('click', async () => {
      if (btnCheckUpdates.disabled) return;
      const originalText = btnCheckUpdates.textContent.trim();
      btnCheckUpdates.disabled = true;
      btnCheckUpdates.textContent = 'Checking...';
      btnDownloadUpdate?.classList.add('hidden');
      setUpdateStatus('Looking for the latest release on GitHub...');

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 12000);
      try {
        const res = await fetch(LATEST_RELEASE_API, {
          cache: 'no-store',
          headers: { Accept: 'application/vnd.github+json' },
          signal: controller.signal
        });
        if (!res.ok) throw new Error('GitHub responded with ' + res.status);
        const release = await res.json();
        const latest = String(release.tag_name || '').replace(/^v/i, '').trim();
        if (!latest) throw new Error('Release has no version tag');

        if (isNewerVersion(latest, APP_VERSION)) {
          setUpdateStatus('v' + latest + ' is available — you are on v' + APP_VERSION + '.');
          if (btnDownloadUpdate) {
            btnDownloadUpdate.href = release.html_url || 'https://github.com/Javanvibecodes/TaskThing/releases/latest';
            btnDownloadUpdate.classList.remove('hidden');
          }
        } else {
          setUpdateStatus('You are on the latest version (v' + APP_VERSION + ').');
        }
      } catch (err) {
        setUpdateStatus('Could not reach GitHub to check for updates. Check your internet connection and try again.');
      } finally {
        clearTimeout(timeout);
        btnCheckUpdates.disabled = false;
        btnCheckUpdates.textContent = originalText;
      }
    });

    // Report Issue: prefill the GitHub issue form from the draft + diagnostics
    if (reportIssueText) {
      try {
        const draft = localStorage.getItem('tasks_report_draft');
        if (draft) reportIssueText.value = draft;
      } catch (e) {}
      reportIssueText.addEventListener('input', () => {
        try { localStorage.setItem('tasks_report_draft', reportIssueText.value); } catch (e) {}
      });
    }

    btnReportIssue?.addEventListener('click', () => {
      const note = (reportIssueText?.value || '').trim();
      const title = note ? note.split('\n')[0].trim().slice(0, 90) : 'Mobile app feedback';
      const syncState = !syncConfig.host
        ? 'not paired'
        : (syncConfig.connected ? 'connected to ' + syncConfig.host : 'paired, offline');
      const body = [
        note || '(No description yet — please add what happened.)',
        '',
        '---',
        'App version: v' + APP_VERSION,
        'Platform: ' + getPlatformLabel(),
        'Sync: ' + syncState
      ].join('\n');

      btnReportIssue.href = 'https://github.com/Javanvibecodes/TaskThing/issues/new'
        + '?title=' + encodeURIComponent(title)
        + '&body=' + encodeURIComponent(body);
      setReportStatus('Opening GitHub in your browser. Your note is kept here as a draft.');
    });

    document.addEventListener('click', () => {
      addMenu.classList.add('hidden');
    });
  }

  function setReportStatus(message) {
    if (!reportStatus) return;
    reportStatus.textContent = message;
    reportStatus.classList.remove('hidden');
  }

  function getPlatformLabel() {
    const platform = (window.Capacitor && typeof window.Capacitor.getPlatform === 'function')
      ? window.Capacitor.getPlatform()
      : 'web';
    const size = window.screen ? window.screen.width + 'x' + window.screen.height : 'unknown';
    return platform + ' ' + size;
  }

  function setUpdateStatus(message) {
    if (!updateStatus) return;
    updateStatus.textContent = message;
    updateStatus.classList.remove('hidden');
  }

  function isNewerVersion(candidate, current) {
    const parse = (v) => String(v).replace(/^v/i, '').split('-')[0].split('.').map(n => parseInt(n, 10) || 0);
    const a = parse(candidate);
    const b = parse(current);
    for (let i = 0; i < Math.max(a.length, b.length); i++) {
      const x = a[i] || 0;
      const y = b[i] || 0;
      if (x !== y) return x > y;
    }
    return false;
  }

  function getTodayString() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  function getTomorrowString() {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>"']/g, m => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
    }[m]));
  }

  document.addEventListener('DOMContentLoaded', init);
})();
