// Task Thing — Mobile Hybrid Sync Engine & Touch Client
(function() {
  let mobileData = {
    settings: {
      themePreset: 'cobalt',
      connected: false
    },
    tagsBank: ['Design', 'Dev', 'Ops', 'Team', 'Personal'],
    repeatedTasks: [
      { id: 'rep-m-1', title: 'Morning standup & planning', priority: 'medium', time: '09:00', tag: 'Team', enabled: true },
      { id: 'rep-m-2', title: 'Zero inbox & review pull requests', priority: 'low', time: '17:30', tag: 'Dev', enabled: true }
    ],
    tomorrowTasks: [],
    activeTasks: [],
    completedTasks: []
  };

  let syncConfig = {
    host: '',
    hosts: [],
    port: 48721,
    token: '',
    connected: false,
    mode: 'disconnected'
  };

  let offlineQueue = [];
  let ws = null;
  let reconnectTimer = null;
  let heartbeatTimer = null;
  let isScanning = false;
  let html5QrScanner = null;
  let currentPriority = 'urgent';
  let currentTagIndex = 0;
  let schedulingTarget = 'today'; // 'today' | 'tomorrow'

  const HOTSPOT_CANDIDATES = [
    '172.20.10.1',  // iPhone hotspot gateway
    '172.20.10.2',  // PC on iPhone hotspot
    '192.168.43.1', // Android hotspot gateway
    '192.168.43.2', // PC on Android hotspot
    '192.168.1.1'
  ];

  // DOM Elements
  const mobileLaunchSplash = document.getElementById('mobile-launch-splash');
  const mobileSplashProgress = document.getElementById('mobile-splash-progress');
  const tabButtons = document.querySelectorAll('.mobile-tab-btn');
  const screens = document.querySelectorAll('.mobile-screen');
  const activeTasksList = document.getElementById('mobile-tasks-list');
  const repeatedTasksList = document.getElementById('mobile-repeated-list');
  const historyList = document.getElementById('mobile-history-list');
  const mobilePendingBadge = document.getElementById('mobile-pending-badge');
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

  // Tomorrow Banner
  const tomorrowBanner = document.getElementById('mobile-tomorrow-banner');
  const tomorrowCountText = document.getElementById('mobile-tomorrow-count');
  const btnViewTomorrow = document.getElementById('mobile-btn-view-tomorrow');
  const btnAddHabit = document.getElementById('mobile-btn-add-habit');

  // Sync screen elements
  const btnToggleCamera = document.getElementById('btn-toggle-camera');
  const cameraBtnText = document.getElementById('camera-btn-text');
  const manualIpInput = document.getElementById('manual-ip-input');
  const btnManualConnect = document.getElementById('btn-manual-connect');
  const btnReconnect = document.getElementById('mobile-btn-reconnect');
  const mobileSyncDot = document.getElementById('mobile-sync-dot');
  const mobileSyncText = document.getElementById('mobile-sync-text');
  const mobileSyncDetailStatus = document.getElementById('mobile-sync-detail-status');
  const btnSyncHeader = document.getElementById('btn-sync-header');

  // ----------------- STORAGE & PERSISTENCE -----------------
  function loadPersistedState() {
    try {
      const savedData = localStorage.getItem('tasks_mobile_data');
      if (savedData) {
        mobileData = Object.assign(mobileData, JSON.parse(savedData));
      } else {
        // Fallback sample tasks
        mobileData.activeTasks = [
          { id: 'm-1', title: 'Review Q4 design system specs', priority: 'urgent', time: '14:00', tag: 'Design', date: getTodayString() },
          { id: 'm-2', title: 'Send team retrospective notes', priority: 'medium', time: '15:30', tag: 'Team', date: getTodayString() },
          { id: 'm-3', title: 'Prepare client prototype demo', priority: 'urgent', time: '16:45', tag: 'Client', date: getTodayString() },
          { id: 'm-4', title: 'Update billing invoice details', priority: 'medium', time: '18:00', tag: 'Ops', date: getTodayString() }
        ];
        mobileData.completedTasks = [
          { id: 'mc-1', title: 'Ship widget micro-interactions polish', completedAt: new Date(Date.now() - 3600000).toISOString(), group: 'today' },
          { id: 'mc-2', title: 'Review telemetry payload constraints', completedAt: new Date(Date.now() - 7200000).toISOString(), group: 'today' }
        ];
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
        token: syncConfig.token
      }));
    } catch (e) {}
  }

  function queueOfflineMutation(mutation) {
    // DO NOT queue theme mutations — themes stay local!
    if (mutation.type === 'THEME_CHANGED') return;

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

  // ----------------- REAL-TIME SYNC CLIENT -----------------
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
        syncConfig.host = hostToTry;
        syncConfig.connected = true;
        syncConfig.mode = isHotspotIp(hostToTry) ? 'hotspot' : 'lan';
        persistSyncConfig();
        updateConnectionUI('connected', hostToTry);

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
        } catch (e) {}
      };

      ws.onclose = () => {
        syncConfig.connected = false;
        stopHeartbeat();
        updateConnectionUI('disconnected');
        scheduleAutoReconnect();
      };

      ws.onerror = () => {
        ws.close();
      };
    } catch (err) {
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
    // Never send theme changes to desktop
    if (mutation.type === 'THEME_CHANGED') return;

    const sent = sendWsMessage(mutation);
    if (!sent) {
      queueOfflineMutation(mutation);
    }
  }

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
    if (reconnectTimer) clearTimeout(reconnectTimer);

    reconnectTimer = setTimeout(async () => {
      if (syncConfig.connected) return;

      if (syncConfig.host) {
        connectToDesktop(syncConfig.host);
      }

      // Check alternate hotspot candidates
      const candidates = [...(syncConfig.hosts || []), ...HOTSPOT_CANDIDATES];
      for (const ip of candidates) {
        if (ip && ip !== syncConfig.host) {
          try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 1000);
            const res = await fetch(`http://${ip}:${syncConfig.port || 48721}/ping`, {
              signal: controller.signal
            });
            clearTimeout(timeoutId);
            if (res.ok) {
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

  // Update Visual Real-Time Indicators
  function updateConnectionUI(state = null, host = null) {
    const isConn = state === 'connected' || (ws && ws.readyState === WebSocket.OPEN);
    const isConnPending = state === 'connecting' || (ws && ws.readyState === WebSocket.CONNECTING);

    if (isConn) {
      const modeText = syncConfig.mode === 'hotspot' ? 'Hotspot Synced' : 'LAN Synced';
      mobileSyncDot.className = 'w-2 h-2 rounded-full bg-secondary animate-pulse';
      mobileSyncText.textContent = host ? modeText : 'PC Synced';
      mobileSyncText.className = 'font-label-mono text-[10px] text-secondary font-semibold';
      mobileSyncDetailStatus.textContent = `Connected (${syncConfig.host || host}:${syncConfig.port || 48721})`;
      mobileSyncDetailStatus.className = 'font-headline-sm text-body-md text-secondary font-semibold';
    } else if (isConnPending) {
      mobileSyncDot.className = 'w-2 h-2 rounded-full bg-tertiary animate-pulse';
      mobileSyncText.textContent = 'Connecting...';
      mobileSyncText.className = 'font-label-mono text-[10px] text-tertiary font-medium';
      mobileSyncDetailStatus.textContent = 'Searching for PC Widget...';
      mobileSyncDetailStatus.className = 'font-headline-sm text-body-md text-tertiary font-semibold';
    } else {
      mobileSyncDot.className = 'w-2 h-2 rounded-full bg-outline';
      mobileSyncText.textContent = offlineQueue.length > 0 ? `Offline (${offlineQueue.length} Queued)` : 'Offline';
      mobileSyncText.className = 'font-label-mono text-[10px] text-outline font-medium';
      mobileSyncDetailStatus.textContent = offlineQueue.length > 0 ? `Offline (${offlineQueue.length} changes queued to sync)` : 'Disconnected / Standalone';
      mobileSyncDetailStatus.className = 'font-headline-sm text-body-md text-on-surface font-semibold';
    }
  }

  // ----------------- ACTIVE TASKS & EMPTY STATES -----------------
  function renderActiveTasks() {
    activeTasksList.innerHTML = '';
    const tasks = mobileData.activeTasks || [];
    
    // Decrementing Pending badge on Tasks tab!
    mobilePendingBadge.textContent = tasks.length;
    if (tasks.length === 0) {
      mobilePendingBadge.classList.add('opacity-40');
    } else {
      mobilePendingBadge.classList.remove('opacity-40');
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
        borderStyle = 'border border-error/50 bg-error-container/20 ring-1 ring-error/30';
      } else {
        borderStyle = 'bg-surface-container/70 active:bg-surface-container border border-outline-variant/10';
      }

      item.className = `${borderStyle} p-3 rounded-xl flex items-center justify-between gap-3 shadow-sm transition-all`;
      
      let priorityClass = 'bg-secondary-container/30 text-secondary';
      if (task.priority === 'urgent') priorityClass = 'bg-error-container/40 text-error';
      else if (task.priority === 'medium') priorityClass = 'bg-tertiary-container/30 text-tertiary';

      item.innerHTML = `
        <div class="flex items-center gap-3 min-w-0 flex-1">
          <button class="complete-btn w-6 h-6 rounded-full bg-surface-container-highest flex items-center justify-center text-transparent hover:text-primary active:scale-90 transition-all shrink-0">
            <span class="material-symbols-outlined text-[16px]">check</span>
          </button>
          <div class="flex flex-col min-w-0">
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
                <span class="font-label-mono text-[10px] text-outline bg-surface-container-high px-1 rounded">
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
        <button class="delete-btn w-8 h-8 rounded-full flex items-center justify-center text-on-surface-variant active:text-error shrink-0">
          <span class="material-symbols-outlined text-[18px]">close</span>
        </button>
      `;

      item.querySelector('.complete-btn').addEventListener('click', () => completeTask(task.id));
      item.querySelector('.delete-btn').addEventListener('click', () => deleteTask(task.id));

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
        <div class="py-12 text-center flex flex-col items-center justify-center text-outline gap-1">
          <span class="material-symbols-outlined text-[32px]">event_repeat</span>
          <span class="font-headline-sm text-on-surface-variant font-semibold">No daily habits configured</span>
          <span class="font-body-sm text-outline text-[12px]">Add habits you repeat every day to automatically appear each morning.</span>
        </div>
      `;
      return;
    }

    habits.forEach(habit => {
      const card = document.createElement('div');
      card.className = 'bg-surface-container/70 p-3 rounded-xl flex items-center justify-between gap-3 border border-outline-variant/10';
      card.innerHTML = `
        <div class="flex items-center gap-3 min-w-0 flex-1">
          <input type="checkbox" ${habit.enabled ? 'checked' : ''} class="w-4 h-4 accent-primary rounded cursor-pointer"/>
          <div class="flex flex-col min-w-0">
            <span class="font-body-md text-on-surface truncate ${habit.enabled ? '' : 'text-outline line-through'} font-medium">${escapeHtml(habit.title)}</span>
            <div class="flex items-center gap-2 mt-0.5 font-label-mono text-[10px] text-on-surface-variant">
              <span class="text-secondary font-semibold">Repeats Daily</span>
              ${habit.time ? `<span>• ${habit.time}</span>` : ''}
              ${habit.tag ? `<span class="bg-surface-container-high px-1 rounded text-outline">${habit.tag}</span>` : ''}
            </div>
          </div>
        </div>
        <button class="w-8 h-8 rounded-full flex items-center justify-center text-outline active:text-error">
          <span class="material-symbols-outlined text-[16px]">delete</span>
        </button>
      `;

      card.querySelector('input').addEventListener('change', (e) => {
        habit.enabled = e.target.checked;
        persistData();
        renderRepeatedTasks();
      });

      card.querySelector('button').addEventListener('click', () => {
        mobileData.repeatedTasks = mobileData.repeatedTasks.filter(h => h.id !== habit.id);
        persistData();
        renderRepeatedTasks();
      });

      repeatedTasksList.appendChild(card);
    });
  }

  // ----------------- COMPLETED HISTORY -----------------
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
        <button class="undo-btn px-2.5 py-1 rounded-lg bg-surface-container-high text-on-surface font-label-mono text-[10px] shrink-0 active:scale-95 font-semibold">
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

      historyList.appendChild(card);
    });
  }

  // ----------------- THEMES (LOCAL TO MOBILE) -----------------
  function applyTheme(preset, save = false) {
    document.body.setAttribute('data-theme', preset);
    mobileData.settings.themePreset = preset;

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

    if (save) {
      persistData(); // LOCAL ONLY — never broadcast theme!
    }
  }

  function updateTagUI() {
    const tags = mobileData.tagsBank;
    if (currentTagIndex >= tags.length) currentTagIndex = 0;
    tagLabel.textContent = tags[currentTagIndex];
  }

  // ----------------- QR SCANNER & PAIRING -----------------
  async function startScanner() {
    if (typeof Html5Qrcode === 'undefined') {
      alert('Camera module unavailable. Connect manually via IP below.');
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
      alert('Camera permission denied or camera not found. Use manual IP connect below.');
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
      if (parsed.app === 'Task Thing' || parsed.app === 'tasks.core') {
        syncConfig.host = parsed.primaryHost || parsed.host;
        syncConfig.hosts = parsed.hosts || [syncConfig.host];
        syncConfig.port = parsed.port || 48721;
        syncConfig.token = parsed.token || '';
        persistSyncConfig();

        connectToDesktop(syncConfig.host);
        alert(`Paired with PC at ${syncConfig.host}:${syncConfig.port}!`);
        switchScreen('active-tasks');
      } else {
        alert('Unrecognized Task Thing QR code.');
      }
    } catch (e) {
      alert('Invalid QR code format.');
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

  // ----------------- LAUNCH ANIMATION -----------------
  function playMobileLaunchAnimation() {
    return new Promise((resolve) => {
      if (!mobileLaunchSplash || !mobileSplashProgress) {
        resolve();
        return;
      }
      setTimeout(() => { if (mobileSplashProgress) mobileSplashProgress.style.width = '35%'; }, 150);
      setTimeout(() => { if (mobileSplashProgress) mobileSplashProgress.style.width = '70%'; }, 500);
      setTimeout(() => { if (mobileSplashProgress) mobileSplashProgress.style.width = '100%'; }, 900);
      setTimeout(() => {
        mobileLaunchSplash.classList.add('opacity-0', 'pointer-events-none');
        setTimeout(() => {
          mobileLaunchSplash.remove();
          resolve();
        }, 500);
      }, 1200);
    });
  }

  // ----------------- INITIALIZATION -----------------
  function init() {
    playMobileLaunchAnimation();
    mobileSkeleton.classList.remove('hidden');

    loadPersistedState();

    const now = new Date();
    todayDateBadge.textContent = now.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });

    applyTheme(mobileData.settings.themePreset || 'cobalt', false);
    updateTagUI();
    renderActiveTasks();
    renderHistory();
    renderRepeatedTasks();
    updateTomorrowBanner();

    mobileSkeleton.classList.add('hidden');

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
    quickInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') submitTask();
    });

    // Priority button
    const priorities = ['urgent', 'medium', 'low'];
    btnPriority.addEventListener('click', () => {
      const next = (priorities.indexOf(currentPriority) + 1) % priorities.length;
      currentPriority = priorities[next];
      priorityLabel.textContent = currentPriority.charAt(0).toUpperCase() + currentPriority.slice(1);
      if (currentPriority === 'urgent') {
        priorityDot.className = 'w-1.5 h-1.5 rounded-full bg-error';
        btnPriority.className = 'h-6 px-2 rounded bg-error-container/40 text-error font-label-mono text-[10px] font-semibold flex items-center gap-1';
      } else if (currentPriority === 'medium') {
        priorityDot.className = 'w-1.5 h-1.5 rounded-full bg-tertiary';
        btnPriority.className = 'h-6 px-2 rounded bg-tertiary-container/30 text-tertiary font-label-mono text-[10px] font-semibold flex items-center gap-1';
      } else {
        priorityDot.className = 'w-1.5 h-1.5 rounded-full bg-secondary';
        btnPriority.className = 'h-6 px-2 rounded bg-secondary-container/30 text-secondary font-label-mono text-[10px] font-semibold flex items-center gap-1';
      }
    });

    // Tag button & New Tag
    btnTag.addEventListener('click', () => {
      currentTagIndex = (currentTagIndex + 1) % mobileData.tagsBank.length;
      updateTagUI();
    });

    btnAddTag.addEventListener('click', () => {
      const newTag = prompt('Create a new tag (e.g. Finance, Fitness, Study):');
      if (newTag && newTag.trim()) {
        const clean = newTag.trim();
        if (!mobileData.tagsBank.includes(clean)) {
          mobileData.tagsBank.push(clean);
          currentTagIndex = mobileData.tagsBank.length - 1;
          persistData();
          updateTagUI();
        }
      }
    });

    // Add repeated habit
    btnAddHabit.addEventListener('click', () => {
      const title = prompt('Enter a daily recurring habit:');
      if (title && title.trim()) {
        mobileData.repeatedTasks.push({
          id: 'rep-m-' + Date.now(),
          title: title.trim(),
          priority: 'medium',
          time: '09:00',
          tag: 'Daily',
          enabled: true
        });
        persistData();
        renderRepeatedTasks();
      }
    });

    btnViewTomorrow.addEventListener('click', () => {
      alert(`Queued for Tomorrow (${mobileData.tomorrowTasks.length} tasks):\n\n` +
        mobileData.tomorrowTasks.map((t, i) => `${i+1}. ${t.title}`).join('\n')
      );
    });

    searchInput.addEventListener('input', (e) => renderHistory(e.target.value));

    // Camera toggle
    btnToggleCamera.addEventListener('click', () => {
      if (isScanning) stopScanner();
      else startScanner();
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

    btnReconnect.addEventListener('click', () => {
      if (syncConfig.host) {
        connectToDesktop(syncConfig.host);
      } else {
        alert('Scan the PC QR code first to pair.');
      }
    });

    // Theme selector (Local Only)
    document.querySelectorAll('.mobile-preset-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        applyTheme(btn.dataset.preset, true);
      });
    });

    document.addEventListener('click', () => {
      addMenu.classList.add('hidden');
    });
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
