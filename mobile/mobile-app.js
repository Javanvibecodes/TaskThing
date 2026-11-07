// tasks.core - Mobile Hybrid Sync Engine & Touch Client
(function() {
  // Mobile State
  let mobileData = {
    settings: {
      themePreset: 'indigo',
      connected: false
    },
    activeTasks: [],
    completedTasks: []
  };

  // Sync Configuration
  let syncConfig = {
    host: '',
    hosts: [],
    port: 48721,
    token: '',
    connected: false,
    mode: 'disconnected' // 'lan' | 'hotspot' | 'webrtc' | 'disconnected'
  };

  let offlineQueue = [];
  let ws = null;
  let reconnectTimer = null;
  let heartbeatTimer = null;
  let isScanning = false;
  let html5QrScanner = null;
  let currentPriority = 'urgent';
  let currentTag = 'Design';

  // Standard Hotspot Gateway & Fallback IPs to test automatically
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
  const historyList = document.getElementById('mobile-history-list');
  const quickInput = document.getElementById('mobile-quick-input');
  const btnAdd = document.getElementById('mobile-btn-add');
  const btnPriority = document.getElementById('mobile-btn-priority');
  const priorityLabel = document.getElementById('mobile-priority-label');
  const btnTag = document.getElementById('mobile-btn-tag');
  const tagLabel = document.getElementById('mobile-tag-label');
  const remainingBadge = document.getElementById('mobile-remaining-badge');
  const historyCountBadge = document.getElementById('mobile-history-count');
  const searchInput = document.getElementById('mobile-history-search');
  const todayDateBadge = document.getElementById('mobile-today-date');

  // Sync Elements
  const btnToggleCamera = document.getElementById('btn-toggle-camera');
  const cameraBtnText = document.getElementById('camera-btn-text');
  const manualIpInput = document.getElementById('manual-ip-input');
  const btnManualConnect = document.getElementById('btn-manual-connect');
  const mobileSyncDot = document.getElementById('mobile-sync-dot');
  const mobileSyncText = document.getElementById('mobile-sync-text');
  const btnSyncHeader = document.getElementById('btn-sync-header');

  // ----------------- STORAGE HELPERS -----------------
  function loadPersistedState() {
    try {
      const savedData = localStorage.getItem('tasks_mobile_data');
      if (savedData) {
        mobileData = Object.assign(mobileData, JSON.parse(savedData));
      }
      const savedConfig = localStorage.getItem('tasks_sync_config');
      if (savedConfig) {
        syncConfig = Object.assign(syncConfig, JSON.parse(savedConfig));
      }
      const savedQueue = localStorage.getItem('tasks_offline_queue');
      if (savedQueue) {
        offlineQueue = JSON.parse(savedQueue);
      }
    } catch (e) {
      console.warn('Local storage load error:', e);
    }
  }

  function persistData() {
    try {
      localStorage.setItem('tasks_mobile_data', JSON.stringify(mobileData));
    } catch (e) {
      console.warn('Storage error:', e);
    }
  }

  function persistSyncConfig() {
    try {
      localStorage.setItem('tasks_sync_config', JSON.stringify({
        host: syncConfig.host,
        hosts: syncConfig.hosts,
        port: syncConfig.port,
        token: syncConfig.token
      }));
    } catch (e) {
      console.warn('Config storage error:', e);
    }
  }

  function queueOfflineMutation(mutation) {
    mutation.timestamp = Date.now();
    offlineQueue.push(mutation);
    try {
      localStorage.setItem('tasks_offline_queue', JSON.stringify(offlineQueue));
    } catch (e) {}
    updateConnectionUI();
  }

  function clearOfflineQueue() {
    offlineQueue = [];
    localStorage.removeItem('tasks_offline_queue');
  }

  // ----------------- HYBRID SYNC CLIENT -----------------
  async function connectToDesktop(customHost = null) {
    if (reconnectTimer) clearTimeout(reconnectTimer);
    if (ws && (ws.readyState === WebSocket.CONNECTING || ws.readyState === WebSocket.OPEN)) {
      return;
    }

    const hostToTry = customHost || syncConfig.host;
    if (!hostToTry) {
      updateConnectionUI();
      return;
    }

    const port = syncConfig.port || 48721;
    const token = syncConfig.token || '';
    const wsUrl = `ws://${hostToTry}:${port}?token=${encodeURIComponent(token)}`;

    updateConnectionUI('connecting', hostToTry);

    try {
      ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log(`[tasks.core Mobile] Connected to Desktop at ${hostToTry}:${port}`);
        syncConfig.host = hostToTry;
        syncConfig.connected = true;
        syncConfig.mode = isHotspotIp(hostToTry) ? 'hotspot' : 'lan';
        persistSyncConfig();
        updateConnectionUI('connected', hostToTry);

        // Request full state snapshot
        sendWsMessage({ type: 'SYNC_INIT_REQUEST' });

        // Flush queued mutations
        if (offlineQueue.length > 0) {
          sendWsMessage({
            type: 'OFFLINE_QUEUE_SYNC',
            payload: offlineQueue
          });
          clearOfflineQueue();
        }

        // Start heartbeat keep-alive
        startHeartbeat();
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          handleServerMessage(msg);
        } catch (e) {
          console.error('[tasks.core Mobile] Bad message:', e);
        }
      };

      ws.onclose = () => {
        syncConfig.connected = false;
        stopHeartbeat();
        updateConnectionUI('disconnected');
        scheduleAutoReconnect();
      };

      ws.onerror = (err) => {
        console.warn(`[tasks.core Mobile] Connection error on ${hostToTry}:`, err.message || err);
        ws.close();
      };
    } catch (err) {
      console.warn('WebSocket instantiation error:', err);
      scheduleAutoReconnect();
    }
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
    const sent = sendWsMessage(mutation);
    if (!sent) {
      queueOfflineMutation(mutation);
    }
  }

  // Handle updates coming from desktop
  function handleServerMessage(msg) {
    const { type, payload } = msg;

    if (type === 'STATE_SNAPSHOT') {
      if (payload) {
        if (Array.isArray(payload.activeTasks)) {
          mobileData.activeTasks = payload.activeTasks;
        }
        if (Array.isArray(payload.completedTasks)) {
          mobileData.completedTasks = payload.completedTasks;
        }
        if (payload.settings?.themePreset) {
          mobileData.settings.themePreset = payload.settings.themePreset;
          applyTheme(payload.settings.themePreset, false);
        }
        persistData();
        renderActiveTasks();
        renderHistory();
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
        completedAt: payload.completedAt || new Date().toISOString()
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
    } else if (type === 'THEME_CHANGED' && payload?.themePreset) {
      applyTheme(payload.themePreset, false);
    }
  }

  // Automatic Background Reconnect with Multi-Interface / Hotspot Failover
  function scheduleAutoReconnect() {
    if (reconnectTimer) clearTimeout(reconnectTimer);

    reconnectTimer = setTimeout(async () => {
      if (syncConfig.connected) return;

      // 1. Try primary host
      if (syncConfig.host) {
        connectToDesktop(syncConfig.host);
      }

      // 2. If primary fails, cycle through other known desktop IPs from QR payload
      const alternateCandidates = [...(syncConfig.hosts || []), ...HOTSPOT_CANDIDATES];
      for (const ip of alternateCandidates) {
        if (ip && ip !== syncConfig.host) {
          // Probe via fast fetch ping before full WS upgrade
          try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 1200);
            const res = await fetch(`http://${ip}:${syncConfig.port || 48721}/ping`, {
              signal: controller.signal
            });
            clearTimeout(timeoutId);
            if (res.ok) {
              console.log(`[tasks.core Mobile] Found desktop on alternate/hotspot IP: ${ip}`);
              connectToDesktop(ip);
              return;
            }
          } catch (e) {}
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

  // Update Visual Connection Pill
  function updateConnectionUI(state = null, host = null) {
    const isConn = state === 'connected' || syncConfig.connected;
    const isConnPending = state === 'connecting';

    if (isConn) {
      const modeText = syncConfig.mode === 'hotspot' ? 'Hotspot Synced' : 'LAN Synced';
      mobileSyncDot.className = 'w-2 h-2 rounded-full bg-secondary animate-pulse';
      mobileSyncText.textContent = host ? `${modeText}` : 'Desktop Synced';
      mobileSyncText.className = 'font-label-mono text-[10px] text-secondary font-semibold';
    } else if (isConnPending) {
      mobileSyncDot.className = 'w-2 h-2 rounded-full bg-tertiary animate-pulse';
      mobileSyncText.textContent = 'Connecting...';
      mobileSyncText.className = 'font-label-mono text-[10px] text-tertiary font-medium';
    } else {
      mobileSyncDot.className = 'w-2 h-2 rounded-full bg-outline';
      mobileSyncText.textContent = offlineQueue.length > 0 ? `Offline (${offlineQueue.length} Queued)` : 'Offline';
      mobileSyncText.className = 'font-label-mono text-[10px] text-outline font-medium';
    }
  }

  // ----------------- UI INTERACTIONS & RENDERING -----------------
  function renderActiveTasks() {
    activeTasksList.innerHTML = '';
    const tasks = mobileData.activeTasks || [];
    remainingBadge.textContent = `${tasks.length} remaining`;

    if (tasks.length === 0) {
      activeTasksList.innerHTML = `
        <div class="py-12 text-center flex flex-col items-center justify-center text-outline gap-1">
          <span class="material-symbols-outlined text-[32px]">task_alt</span>
          <span class="font-headline-sm text-on-surface-variant">All tasks done</span>
          <span class="font-label-mono text-[11px]">Add a task above or sync from desktop</span>
        </div>
      `;
      return;
    }

    tasks.forEach(task => {
      const item = document.createElement('div');
      item.className = 'bg-surface-container/70 active:bg-surface-container p-3 rounded-xl flex items-center justify-between gap-3 shadow-sm border border-outline-variant/10 transition-colors';
      
      let priorityClass = 'bg-secondary-container/30 text-secondary';
      if (task.priority === 'urgent') priorityClass = 'bg-error-container/40 text-error';
      else if (task.priority === 'medium') priorityClass = 'bg-tertiary-container/30 text-tertiary-fixed-dim';

      item.innerHTML = `
        <div class="flex items-center gap-3 min-w-0 flex-1">
          <button class="complete-btn w-6 h-6 rounded-full bg-surface-container-highest flex items-center justify-center text-transparent hover:text-primary active:scale-90 transition-all shrink-0">
            <span class="material-symbols-outlined text-[16px]">check</span>
          </button>
          <div class="flex flex-col min-w-0">
            <span class="font-body-md text-on-surface truncate font-medium">${escapeHtml(task.title)}</span>
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
                <span class="font-label-mono text-[10px] text-outline bg-surface-container-high px-1 rounded">
                  ${escapeHtml(task.tag)}
                </span>
              ` : ''}
            </div>
          </div>
        </div>
        <button class="delete-btn w-8 h-8 rounded-full flex items-center justify-center text-on-surface-variant active:text-error shrink-0">
          <span class="material-symbols-outlined text-[18px]">close</span>
        </button>
      `;

      item.querySelector('.complete-btn').addEventListener('click', () => {
        completeTask(task.id);
      });

      item.querySelector('.delete-btn').addEventListener('click', () => {
        deleteTask(task.id);
      });

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
      completedAt: new Date().toISOString()
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

  function renderHistory(query = '') {
    historyList.innerHTML = '';
    const q = query.toLowerCase().trim();
    const completed = mobileData.completedTasks || [];
    historyCountBadge.textContent = `${completed.length} Finished`;

    const filtered = completed.filter(c => c.title.toLowerCase().includes(q));

    if (filtered.length === 0) {
      historyList.innerHTML = `
        <div class="py-10 text-center text-outline flex flex-col items-center">
          <span class="material-symbols-outlined text-[24px]">history</span>
          <span class="font-body-sm mt-1">No completed tasks found</span>
        </div>
      `;
      return;
    }

    filtered.forEach(item => {
      const card = document.createElement('div');
      card.className = 'bg-surface-container/50 p-2.5 rounded-xl flex items-center justify-between gap-2 border border-outline-variant/10';
      card.innerHTML = `
        <div class="flex items-center gap-2.5 min-w-0 flex-1">
          <span class="w-4 h-4 rounded bg-secondary/80 text-on-secondary flex items-center justify-center shrink-0">
            <span class="material-symbols-outlined text-[12px]">check</span>
          </span>
          <span class="font-body-sm text-outline line-through truncate">${escapeHtml(item.title)}</span>
        </div>
        <button class="undo-btn px-2 py-1 rounded bg-surface-container-high text-on-surface font-label-mono text-[10px] shrink-0 active:scale-95">
          Undo
        </button>
      `;

      card.querySelector('.undo-btn').addEventListener('click', () => {
        mobileData.completedTasks = mobileData.completedTasks.filter(c => c.id !== item.id);
        const restoredTask = {
          id: 'm-' + Date.now(),
          title: item.title,
          priority: 'medium',
          tag: 'General'
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

      historyList.appendChild(card);
    });
  }

  function applyTheme(preset, broadcast = true) {
    document.body.setAttribute('data-theme', preset);
    mobileData.settings.themePreset = preset;
    persistData();

    document.querySelectorAll('.mobile-preset-btn').forEach(b => {
      if (b.dataset.preset === preset) {
        b.classList.add('border-primary/40');
        b.classList.remove('border-transparent');
        const chk = b.querySelector('.material-symbols-outlined');
        if (chk) chk.classList.remove('hidden');
      } else {
        b.classList.remove('border-primary/40');
        b.classList.add('border-transparent');
        const chk = b.querySelector('.material-symbols-outlined');
        if (chk) chk.classList.add('hidden');
      }
    });

    if (broadcast) {
      sendOrQueueMutation({
        type: 'THEME_CHANGED',
        payload: { themePreset: preset }
      });
    }
  }

  // ----------------- QR SCANNER & PAIRING -----------------
  async function startScanner() {
    if (typeof Html5Qrcode === 'undefined') {
      alert('Camera QR scanner module loading or unsupported. Please use manual IP connection below.');
      return;
    }

    try {
      html5QrScanner = new Html5Qrcode('qr-reader');
      await html5QrScanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 220, height: 220 } },
        (decodedText) => {
          handleScannedData(decodedText);
          stopScanner();
        },
        () => {}
      );
      isScanning = true;
      cameraBtnText.textContent = 'Stop Scanner';
    } catch (err) {
      console.error('Camera error:', err);
      alert('Camera permission denied or camera unavailable. You can enter the desktop IP manually below.');
    }
  }

  async function stopScanner() {
    if (html5QrScanner && isScanning) {
      try {
        await html5QrScanner.stop();
        html5QrScanner.clear();
      } catch (e) {}
      isScanning = false;
      cameraBtnText.textContent = 'Start QR Scanner';
      document.getElementById('qr-reader').innerHTML = `
        <span class="material-symbols-outlined text-[48px] text-outline mb-2">qr_code_scanner</span>
        <span class="font-label-mono text-[11px] text-on-surface-variant text-center px-4">
          Point camera at the desktop widget QR code
        </span>
      `;
    }
  }

  function handleScannedData(dataStr) {
    try {
      const parsed = JSON.parse(dataStr);
      if (parsed.app === 'tasks.core') {
        syncConfig.host = parsed.primaryHost || parsed.host;
        syncConfig.hosts = parsed.hosts || [syncConfig.host];
        syncConfig.port = parsed.port || 48721;
        syncConfig.token = parsed.token || '';
        persistSyncConfig();

        connectToDesktop(syncConfig.host);
        alert(`Paired successfully with Desktop! Connecting to ${syncConfig.host}...`);
        switchScreen('active-tasks');
      } else {
        alert('Unrecognized tasks.core QR code.');
      }
    } catch (e) {
      alert('Invalid QR code format: ' + dataStr);
    }
  }

  function switchScreen(targetKey) {
    tabButtons.forEach(btn => {
      const isTarget = btn.getAttribute('data-target') === targetKey;
      if (isTarget) {
        btn.classList.add('text-primary');
        btn.classList.remove('text-on-surface-variant');
      } else {
        btn.classList.remove('text-primary');
        btn.classList.add('text-on-surface-variant');
      }
    });

    screens.forEach(s => {
      if (s.id === `screen-${targetKey}`) {
        s.classList.remove('hidden');
      } else {
        s.classList.add('hidden');
      }
    });

    if (targetKey !== 'sync' && isScanning) {
      stopScanner();
    }
  }

  // ----------------- INITIALIZATION -----------------
  function init() {
    loadPersistedState();

    const now = new Date();
    todayDateBadge.textContent = now.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });

    applyTheme(mobileData.settings.themePreset || 'indigo', false);
    renderActiveTasks();
    renderHistory();

    // Auto-connect to paired desktop
    if (syncConfig.host) {
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

    btnSyncHeader.addEventListener('click', () => switchScreen('sync'));

    // Priority button
    const priorities = ['urgent', 'medium', 'low'];
    btnPriority.addEventListener('click', () => {
      const next = (priorities.indexOf(currentPriority) + 1) % priorities.length;
      currentPriority = priorities[next];
      priorityLabel.textContent = currentPriority.charAt(0).toUpperCase() + currentPriority.slice(1);
      if (currentPriority === 'urgent') {
        btnPriority.className = 'h-6 px-2 rounded bg-error-container/40 text-error font-label-mono text-[10px] font-semibold flex items-center gap-1';
      } else if (currentPriority === 'medium') {
        btnPriority.className = 'h-6 px-2 rounded bg-tertiary-container/30 text-tertiary-fixed-dim font-label-mono text-[10px] font-semibold flex items-center gap-1';
      } else {
        btnPriority.className = 'h-6 px-2 rounded bg-secondary-container/30 text-secondary font-label-mono text-[10px] font-semibold flex items-center gap-1';
      }
    });

    // Tag button
    const tags = ['Design', 'Dev', 'Ops', 'Personal'];
    btnTag.addEventListener('click', () => {
      const next = (tags.indexOf(currentTag) + 1) % tags.length;
      currentTag = tags[next];
      tagLabel.textContent = currentTag;
    });

    // Add task
    function submitTask() {
      const title = quickInput.value.trim();
      if (!title) return;
      const newTask = {
        id: 'm-' + Date.now(),
        title,
        priority: currentPriority,
        tag: currentTag,
        time: '17:00',
        createdAt: new Date().toISOString()
      };
      mobileData.activeTasks.push(newTask);
      persistData();

      sendOrQueueMutation({
        type: 'TASK_ADDED',
        payload: newTask
      });

      renderActiveTasks();
      quickInput.value = '';
    }

    btnAdd.addEventListener('click', submitTask);
    quickInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') submitTask();
    });

    searchInput.addEventListener('input', (e) => renderHistory(e.target.value));

    // Camera toggle
    btnToggleCamera.addEventListener('click', () => {
      if (isScanning) {
        stopScanner();
      } else {
        startScanner();
      }
    });

    // Manual connect
    btnManualConnect.addEventListener('click', () => {
      const val = manualIpInput.value.trim();
      if (!val) return;
      const parts = val.split(':');
      syncConfig.host = parts[0];
      syncConfig.port = parts[1] || 48721;
      persistSyncConfig();
      connectToDesktop(syncConfig.host);
      alert(`Connecting to ${val}...`);
      switchScreen('active-tasks');
    });

    // Theme selector
    document.querySelectorAll('.mobile-preset-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        applyTheme(btn.dataset.preset, true);
      });
    });
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>"']/g, m => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
    }[m]));
  }

  document.addEventListener('DOMContentLoaded', init);
})();
