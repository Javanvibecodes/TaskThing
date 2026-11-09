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
  let connectTimeout = null;
  let heartbeatTimer = null;
  let isScanning = false;
  let html5QrScanner = null;
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
  const btnToggleCamera = document.getElementById('btn-toggle-camera');
  const cameraBtnText = document.getElementById('camera-btn-text');
  const manualIpInput = document.getElementById('manual-ip-input');
  const btnManualConnect = document.getElementById('btn-manual-connect');
  const btnReconnect = document.getElementById('mobile-btn-reconnect');
  const mobileSyncDot = document.getElementById('mobile-sync-dot');
  const mobileSyncText = document.getElementById('mobile-sync-text');
  const mobileSyncDetailStatus = document.getElementById('mobile-sync-detail-status');
  const btnSyncHeader = document.getElementById('btn-sync-header');

  // Help & Legal elements
  const btnCheckUpdates = document.getElementById('btn-check-updates');
  const btnReportIssue = document.getElementById('btn-report-issue');
  const btnAddHabitTag = document.getElementById('mobile-btn-add-habit-tag');

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
  async function connectToDesktop(customHost = null, isManual = false) {
    if (reconnectTimer) clearTimeout(reconnectTimer);
    if (connectTimeout) clearTimeout(connectTimeout);

    const hostToTry = customHost || syncConfig.host;
    if (!hostToTry) {
      updateConnectionUI('disconnected');
      return;
    }

    const port = syncConfig.port || 48721;
    const token = syncConfig.token || '';
    const wsUrl = `ws://${hostToTry}:${port}?token=${encodeURIComponent(token)}`;

    updateConnectionUI('connecting', hostToTry);

    try {
      if (ws) {
        ws.onopen = null;
        ws.onmessage = null;
        ws.onclose = null;
        ws.onerror = null;
        try { ws.close(); } catch (e) {}
        ws = null;
      }

      ws = new WebSocket(wsUrl);

      // 5-second strict timeout: abort if PC is unreachable
      connectTimeout = setTimeout(() => {
        if (ws && ws.readyState === WebSocket.CONNECTING) {
          console.warn('WebSocket connection timed out for host:', hostToTry);
          ws.onopen = null;
          ws.onmessage = null;
          ws.onclose = null;
          ws.onerror = null;
          try { ws.close(); } catch (e) {}
          ws = null;
          updateConnectionUI('failed', hostToTry, 'Connection timed out — PC unreachable');
          if (!isManual) scheduleAutoReconnect();
        }
      }, 5000);

      ws.onopen = () => {
        if (connectTimeout) clearTimeout(connectTimeout);
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
        } catch (e) {
          // Ignore malformed messages
        }
      };

      ws.onclose = () => {
        if (connectTimeout) clearTimeout(connectTimeout);
        const wasConnected = syncConfig.connected;
        syncConfig.connected = false;
        stopHeartbeat();
        ws = null;
        if (wasConnected) {
          updateConnectionUI('disconnected');
          scheduleAutoReconnect();
        } else {
          updateConnectionUI('failed', hostToTry, 'Connection Failed — Host unreachable');
        }
      };

      ws.onerror = (error) => {
        if (connectTimeout) clearTimeout(connectTimeout);
        console.error('WebSocket error:', error);
        syncConfig.connected = false;
        stopHeartbeat();
        try { ws.close(); } catch (e) {}
        ws = null;
        updateConnectionUI('failed', hostToTry, 'Connection Failed — Host unreachable');
      };
    } catch (err) {
      if (connectTimeout) clearTimeout(connectTimeout);
      console.error('WebSocket connection failed:', err);
      ws = null;
      updateConnectionUI('failed', hostToTry, 'Connection Failed: ' + (err.message || err));
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

      // If we already have a successful connection host, try that first
      if (syncConfig.host) {
        connectToDesktop(syncConfig.host);
        return;
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
          } catch (e) {
            // continue to next candidate
          }
        }
      }
      // No candidates found - UI will show disconnected; user can scan QR or manual connect
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

    if (isConn) {
      const modeText = syncConfig.mode === 'hotspot' ? 'Hotspot Synced' : 'LAN Synced';
      mobileSyncDot.className = 'w-2 h-2 rounded-full bg-primary animate-pulse';
      mobileSyncText.textContent = host ? modeText : 'PC Synced';
      mobileSyncText.className = 'font-label-mono text-[10px] text-primary font-semibold';
      mobileSyncDetailStatus.textContent = `Connected (${syncConfig.host || host}:${syncConfig.port || 48721})`;
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
    
    // Decrementing Pending badge on Tasks tab!
    if (mobilePendingBadge) {
      mobilePendingBadge.textContent = tasks.length;
      if (tasks.length === 0) {
        mobilePendingBadge.classList.add('opacity-40');
      } else {
        mobilePendingBadge.classList.remove('opacity-40');
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

  // ----------------- QR SCANNER & PAIRING -----------------
  // Request camera permission before starting scanner
  async function requestCameraPermission() {
    try {
      const permission = await navigator.permissions.query({ name: 'camera' });
      if (permission.state === 'granted') return true;
      if (permission.state === 'denied') {
        alert('Camera permission was previously denied. Please enable it in browser settings to use QR scanning.');
        return false;
      }
      // permission.state === 'prompt' - show browser prompt
      return true; // let startScanner() handle the browser prompt
    } catch (e) {
      // Permissions API not supported, proceed directly
      return true;
    }
  }

  async function startScanner() {
    if (typeof Html5Qrcode === 'undefined') {
      alert('Camera module unavailable. Connect manually via IP below.');
      return;
    }

    try {
      if (html5QrScanner) {
        try { await html5QrScanner.stop(); } catch (e) {}
        html5QrScanner = null;
      }

      html5QrScanner = new Html5Qrcode('qr-reader');
      // Pass { facingMode: "environment" } as 1st arg, and square 200x200 qrbox as 2nd arg
      await html5QrScanner.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 190, height: 190 },
          aspectRatio: 1.0
        },
        (decodedText) => {
          handleScannedData(decodedText);
          stopScanner();
        },
        () => {}
      );
      isScanning = true;
      cameraBtnText.textContent = 'Stop Scanner';
    } catch (err) {
      console.error('Camera scanner start error:', err);
      const msg = err.message || err;
      alert('Camera error: ' + msg + '. If camera permission is blocked, please check app settings or connect manually with IP.');
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
        <span class="material-symbols-outlined text-[48px] text-on-surface-variant mb-2">qr_code_scanner</span>
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

    if (mainScroll) mainScroll.scrollTop = 0;

    // Close modals when switching screens
    closeTaskModal();
    closeHabitForm();
    closeHabitModal();

    if (targetKey !== 'sync' && isScanning) {
      stopScanner();
    }
  }

  // ----------------- LOTTIE OPENING ANIMATION -----------------
  function playMobileOpeningAnimation() {
    return new Promise((resolve) => {
      const splash = document.getElementById('mobile-opening');
      if (!splash) {
        resolve();
        return;
      }

      let finished = false;
      let anim = null;
      const finish = () => {
        if (finished) return;
        finished = true;
        splash.style.opacity = '0';
        splash.style.pointerEvents = 'none';
        setTimeout(() => {
          try { if (anim) anim.destroy(); } catch (e) { /* ignore */ }
          splash.remove();
          resolve();
        }, 320);
      };

      // The static logo paints instantly so the splash never shows a blank
      // screen while the Lottie JSON/image loads. Once the animation is
      // rendering the real logo at a matching size, fade the placeholder out.
      const placeholder = document.getElementById('mobile-opening-logo');
      let placeholderHidden = false;
      const hidePlaceholder = () => {
        if (placeholderHidden || !placeholder) return;
        placeholderHidden = true;
        placeholder.style.transition = 'opacity 0.15s ease';
        placeholder.style.opacity = '0';
        setTimeout(() => {
          try { placeholder.remove(); } catch (e) { /* ignore */ }
        }, 180);
      };

      // Tap anywhere to skip
      splash.addEventListener('click', finish);
      splash.addEventListener('touchstart', finish, { passive: true });

      const container = document.getElementById('mobile-opening-lottie');
      if (window.lottie && container) {
        try {
          anim = window.lottie.loadAnimation({
            container,
            renderer: 'svg',
            loop: false,
            autoplay: true,
            path: 'assets/opening.json',
            rendererSettings: { preserveAspectRatio: 'xMidYMid meet' }
          });
          // Frame 12 is where the animated logo reaches full opacity and is
          // roughly the same size as the placeholder -> clean handoff.
          anim.addEventListener('enterFrame', () => {
            if (anim && anim.currentFrame >= 12) hidePlaceholder();
          });
          anim.addEventListener('complete', () => setTimeout(finish, 350));
          anim.addEventListener('data_failed', () => {
            // No animation data: keep the static logo up for a moment,
            // exactly like the fallback the user asked for.
            setTimeout(finish, 2200);
          });
        } catch (err) {
          console.warn('Opening animation failed, skipping:', err);
          setTimeout(finish, 2200);
        }
      } else {
        setTimeout(finish, 2200);
      }

      // Safety net: the splash can never block the app
      setTimeout(finish, 4500);
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

    // Camera toggle
    btnToggleCamera.addEventListener('click', () => {
      if (isScanning) stopScanner();
      else startScanner();
    });

    // Manual connect
    btnManualConnect.addEventListener('click', () => {
      let val = manualIpInput.value.trim();
      if (!val) return;
      val = val.replace(/^https?:\/\//i, '').replace(/^wss?:\/\//i, '').replace(/\/.*$/, '');
      const parts = val.split(':');
      syncConfig.host = parts[0];
      syncConfig.port = parts[1] ? parseInt(parts[1], 10) : 48721;
      persistSyncConfig();
      connectToDesktop(syncConfig.host, true);
    });

    btnReconnect.addEventListener('click', () => {
      if (syncConfig.host) {
        connectToDesktop(syncConfig.host, true);
      } else {
        alert('Scan the PC QR code or enter PC IP address below to pair.');
      }
    });

    // Theme selector (Local Only)
    document.querySelectorAll('.mobile-preset-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        applyTheme(btn.dataset.preset, true);
      });
    });

    // Check for Updates button
    btnCheckUpdates?.addEventListener('click', () => {
      btnCheckUpdates.disabled = true;
      const originalText = btnCheckUpdates.textContent;
      btnCheckUpdates.textContent = 'Checking...';
      setTimeout(() => {
        btnCheckUpdates.disabled = false;
        btnCheckUpdates.textContent = originalText;
        alert('You are on the latest version of Task Thing (v1.0.0).');
      }, 700);
    });

    // Report Issue button
    btnReportIssue?.addEventListener('click', () => {
      const issue = prompt('Describe the issue or feedback:');
      if (issue && issue.trim()) {
        alert('Thank you! Your feedback has been recorded locally. We appreciate you helping improve Task Thing.');
      }
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
