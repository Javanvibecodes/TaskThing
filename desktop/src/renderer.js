// tasks.core - Desktop Widget Renderer Engine with Real-Time Mobile Sync
(async function() {
  // Global State
  let appData = {
    settings: {
      themePreset: 'indigo',
      colorMode: 'dark',
      radius: 'rounded',
      opacity: 95,
      alwaysOnTop: false,
      compactMode: false
    },
    activeTasks: [],
    completedTasks: []
  };

  let currentPriority = 'urgent';
  let currentTag = 'Design';
  let toastTimer = null;

  // DOM Elements
  const container = document.getElementById('main-widget-container');
  const compactBar = document.getElementById('compact-widget-bar');
  const navItems = document.querySelectorAll('.nav-item[data-path]');
  const viewPanels = document.querySelectorAll('.view-panel');
  const completedBadge = document.getElementById('nav-completed-badge');
  const currentDateBadge = document.getElementById('current-date-badge');
  const remainingCountBadge = document.getElementById('remaining-count-badge');
  const activeTasksList = document.getElementById('active-tasks-list');
  const quickInput = document.getElementById('quick-input');
  const toggleAddBtn = document.getElementById('toggle-add-btn');
  const btnQuickPriority = document.getElementById('btn-quick-priority');
  const quickPriorityDot = document.getElementById('quick-priority-dot');
  const quickPriorityText = document.getElementById('quick-priority-text');
  const quickTimeInput = document.getElementById('quick-time-input');
  const btnQuickTag = document.getElementById('btn-quick-tag');
  const quickTagText = document.getElementById('quick-tag-text');
  
  // History Elements
  const historyFinishedBadge = document.getElementById('history-finished-badge');
  const historyFilterInput = document.getElementById('history-filter-input');
  const listToday = document.getElementById('list-history-today');
  const listYesterday = document.getElementById('list-history-yesterday');
  const listEarlier = document.getElementById('list-history-earlier');
  const countToday = document.getElementById('count-today');
  const countYesterday = document.getElementById('count-yesterday');
  const countEarlier = document.getElementById('count-earlier');
  const noResultsNotice = document.getElementById('history-no-results');
  const btnExportHistory = document.getElementById('btn-export-history');
  const btnClearHistory = document.getElementById('btn-clear-history');
  const velocityPercentage = document.getElementById('velocity-percentage');

  // Theme Elements
  const themePresets = document.querySelectorAll('.theme-preset-btn');
  const radiusButtons = document.querySelectorAll('.radius-btn');
  const opacitySlider = document.getElementById('opacity-slider');
  const opacityLabel = document.getElementById('opacity-label');
  const btnThemeSave = document.getElementById('btn-theme-save');
  const btnThemeReset = document.getElementById('btn-theme-reset');
  const themeActiveLabel = document.getElementById('theme-active-label');

  // Settings & Pairing
  const qrCodeImg = document.getElementById('qr-code-img');
  const syncHostIp = document.getElementById('sync-host-ip');
  const syncPort = document.getElementById('sync-port');
  const syncToken = document.getElementById('sync-token');
  const btnSettingsPin = document.getElementById('btn-settings-pin');
  const footerSyncStatus = document.getElementById('footer-sync-status');

  // Window Controls
  const btnWinClose = document.getElementById('btn-win-close');
  const btnWinMin = document.getElementById('btn-win-min');
  const btnWinCompact = document.getElementById('btn-win-compact');
  const btnPinToggle = document.getElementById('btn-pin-toggle');
  const pinIcon = document.getElementById('pin-icon');
  const btnHeaderMinimize = document.getElementById('btn-header-minimize');
  const btnCompactSidebar = document.getElementById('btn-compact-sidebar');

  // Compact Bar Elements
  const compactTaskTitle = document.getElementById('compact-task-title');
  const compactCompleteBtn = document.getElementById('compact-complete-btn');
  const compactExpandBtn = document.getElementById('compact-expand-btn');
  const compactCloseBtn = document.getElementById('compact-close-btn');

  // Toast
  const toastBar = document.getElementById('toast-bar');
  const toastText = document.getElementById('toast-text');

  // Helper: Toast Notification
  function showToast(message) {
    if (toastTimer) clearTimeout(toastTimer);
    toastText.textContent = message;
    toastBar.classList.remove('opacity-0', 'translate-y-2', 'pointer-events-none');
    toastBar.classList.add('opacity-100', 'translate-y-0');
    toastTimer = setTimeout(() => {
      toastBar.classList.add('opacity-0', 'translate-y-2', 'pointer-events-none');
      toastBar.classList.remove('opacity-100', 'translate-y-0');
    }, 2200);
  }

  // Load Initial Data
  async function init() {
    try {
      if (window.tasksAPI) {
        appData = await window.tasksAPI.loadData();
      }
    } catch (err) {
      console.warn('Using memory store:', err);
    }

    renderCurrentDate();
    applyTheme(appData.settings.themePreset || 'indigo', false);
    applyRadius(appData.settings.radius || 'rounded');
    applyOpacity(appData.settings.opacity || 95);
    updatePinUI(appData.settings.alwaysOnTop || false);

    renderActiveTasks();
    renderCompletedHistory();
    setupEventListeners();
    setupSyncListeners();
    loadNetworkInfo();
  }

  // Format Today's Date
  function renderCurrentDate() {
    const now = new Date();
    const options = { weekday: 'short', month: 'short', day: 'numeric' };
    currentDateBadge.textContent = now.toLocaleDateString('en-US', options);
  }

  // Save to disk & broadcast
  async function persist(mutation = null) {
    if (window.tasksAPI) {
      await window.tasksAPI.saveData(appData);
      if (mutation) {
        await window.tasksAPI.broadcastMutation(mutation);
      }
    }
  }

  // Setup Real-Time Sync IPC Listeners
  function setupSyncListeners() {
    if (!window.tasksAPI) return;

    // Receive mutations from phone
    window.tasksAPI.onRemoteMutation((mutation) => {
      handleIncomingRemoteMutation(mutation);
    });

    // Receive live connected client count
    window.tasksAPI.onClientCountChange((count) => {
      if (count > 0) {
        footerSyncStatus.textContent = `SYNCED (${count} DEVICE${count > 1 ? 'S' : ''})`;
        footerSyncStatus.className = 'text-secondary font-semibold';
      } else {
        footerSyncStatus.textContent = 'LOCAL READY';
        footerSyncStatus.className = '';
      }
    });
  }

  // Handle Incoming Remote Mutation from Phone
  async function handleIncomingRemoteMutation(mutation) {
    // Reload full data to stay in sync
    if (window.tasksAPI) {
      appData = await window.tasksAPI.loadData();
    }
    renderActiveTasks();
    renderCompletedHistory();

    const title = mutation.payload?.title ? `"${mutation.payload.title.slice(0, 18)}..."` : 'item';
    if (mutation.type === 'TASK_ADDED') {
      showToast(`Phone added ${title}`);
    } else if (mutation.type === 'TASK_COMPLETED') {
      showToast(`Phone completed ${title}`);
    } else if (mutation.type === 'TASK_REOPENED') {
      showToast(`Phone reopened ${title}`);
    } else if (mutation.type === 'TASK_DELETED') {
      showToast(`Phone deleted task`);
    } else if (mutation.type === 'THEME_CHANGED') {
      applyTheme(appData.settings.themePreset, false);
      showToast(`Phone synced theme: ${appData.settings.themePreset}`);
    }
  }

  // Navigation Switcher
  function switchView(targetPath) {
    navItems.forEach(item => {
      const isTarget = item.getAttribute('data-path') === targetPath;
      if (isTarget) {
        item.setAttribute('aria-current', 'page');
        item.className = 'nav-item relative w-10 h-10 flex items-center justify-center rounded-lg transition-colors bg-primary-container text-on-primary-container shadow-sm';
      } else {
        item.removeAttribute('aria-current');
        item.className = 'nav-item relative w-10 h-10 flex items-center justify-center rounded-lg text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-colors';
      }
    });

    viewPanels.forEach(panel => {
      if (panel.id === `view-${targetPath}`) {
        panel.classList.remove('hidden');
        panel.classList.add('animate-in');
      } else {
        panel.classList.add('hidden');
        panel.classList.remove('animate-in');
      }
    });

    if (targetPath === 'widget-settings') {
      loadNetworkInfo();
    }
  }

  // Render Active Tasks
  function renderActiveTasks() {
    activeTasksList.innerHTML = '';
    const tasks = appData.activeTasks || [];
    
    remainingCountBadge.textContent = `${tasks.length} remaining`;
    
    if (tasks.length === 0) {
      activeTasksList.innerHTML = `
        <div class="flex flex-col items-center justify-center py-8 text-center text-outline gap-1">
          <span class="material-symbols-outlined text-[24px]">task_alt</span>
          <span class="font-headline-sm text-body-sm text-on-surface-variant">All tasks done!</span>
          <span class="font-label-mono text-[11px]">Type in the box above to add a new task.</span>
        </div>
      `;
      compactTaskTitle.textContent = 'All tasks completed';
      return;
    }

    // Set first task on compact bar
    compactTaskTitle.textContent = tasks[0].title;

    tasks.forEach((task) => {
      const card = document.createElement('div');
      card.className = 'group relative bg-surface-container/70 hover:bg-surface-container p-space-sm rounded-lg shadow-sm flex items-center justify-between gap-space-xs transition-colors';
      
      const priorityBadge = getPriorityBadge(task.priority);

      card.innerHTML = `
        <div class="flex items-center gap-space-sm min-w-0 flex-1">
          <button data-task-id="${task.id}" class="task-check-btn w-4 h-4 rounded-full bg-surface-container-highest hover:bg-primary/20 flex items-center justify-center text-transparent hover:text-primary transition-colors flex-shrink-0" title="Mark done">
            <span class="material-symbols-outlined text-[13px]">check</span>
          </button>
          <div class="flex flex-col min-w-0 cursor-pointer task-title-box">
            <span class="font-body-sm text-body-sm text-on-surface truncate">${escapeHtml(task.title)}</span>
            <div class="flex items-center gap-space-xs mt-0.5">
              ${priorityBadge}
              ${task.time ? `
                <span class="font-label-mono text-label-mono text-on-surface-variant flex items-center gap-0.5">
                  <span class="material-symbols-outlined text-[10px]">schedule</span>
                  ${escapeHtml(task.time)}
                </span>
              ` : ''}
              ${task.tag ? `
                <span class="font-label-mono text-[10px] text-outline-variant bg-surface-container-high px-1 rounded">
                  ${escapeHtml(task.tag)}
                </span>
              ` : ''}
            </div>
          </div>
        </div>
        <div class="relative task-actions-wrap flex items-center">
          <button class="task-menu-btn w-6 h-6 rounded flex items-center justify-center text-on-surface-variant hover:text-on-surface hover:bg-surface-variant transition-colors flex-shrink-0">
            <span class="material-symbols-outlined text-[15px]">more_horiz</span>
          </button>
          <div class="task-dropdown hidden absolute right-0 top-7 w-28 bg-surface-container-highest shadow-xl rounded-lg py-1 z-30 flex flex-col border border-outline-variant/20">
            <button data-action="edit" class="px-space-sm py-1 flex items-center gap-space-xs text-on-surface hover:bg-surface-bright text-left font-label-md text-label-md">
              <span class="material-symbols-outlined text-[13px] text-on-surface-variant">edit</span>
              <span>Edit</span>
            </button>
            <button data-action="delete" class="px-space-sm py-1 flex items-center gap-space-xs text-error hover:bg-error-container/20 text-left font-label-md text-label-md">
              <span class="material-symbols-outlined text-[13px] text-error">delete</span>
              <span>Delete</span>
            </button>
          </div>
        </div>
      `;

      // Checkbox listener
      const checkBtn = card.querySelector('.task-check-btn');
      checkBtn.addEventListener('click', () => completeTask(task.id));

      // Title click to edit
      card.querySelector('.task-title-box').addEventListener('click', () => editTask(task.id));

      // Dropdown menu toggle
      const menuBtn = card.querySelector('.task-menu-btn');
      const dropdown = card.querySelector('.task-dropdown');
      menuBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        document.querySelectorAll('.task-dropdown').forEach(d => {
          if (d !== dropdown) d.classList.add('hidden');
        });
        dropdown.classList.toggle('hidden');
      });

      // Menu Actions
      dropdown.querySelector('[data-action="edit"]').addEventListener('click', (e) => {
        e.stopPropagation();
        dropdown.classList.add('hidden');
        editTask(task.id);
      });

      dropdown.querySelector('[data-action="delete"]').addEventListener('click', (e) => {
        e.stopPropagation();
        dropdown.classList.add('hidden');
        deleteActiveTask(task.id);
      });

      activeTasksList.appendChild(card);
    });
  }

  function getPriorityBadge(priority) {
    if (priority === 'urgent') {
      return `
        <span class="h-4 px-1 rounded bg-error-container/40 text-error font-label-mono text-[9px] font-semibold flex items-center gap-0.5">
          <span class="w-1 h-1 rounded-full bg-error"></span>
          Urgent
        </span>
      `;
    } else if (priority === 'medium') {
      return `
        <span class="h-4 px-1 rounded bg-tertiary-container/30 text-tertiary-fixed-dim font-label-mono text-[9px] font-semibold flex items-center gap-0.5">
          <span class="w-1 h-1 rounded-full bg-tertiary"></span>
          Medium
        </span>
      `;
    } else {
      return `
        <span class="h-4 px-1 rounded bg-secondary-container/20 text-secondary font-label-mono text-[9px] font-semibold flex items-center gap-0.5">
          <span class="w-1 h-1 rounded-full bg-secondary"></span>
          Low
        </span>
      `;
    }
  }

  // Complete a Task
  function completeTask(taskId) {
    const taskIndex = appData.activeTasks.findIndex(t => t.id === taskId);
    if (taskIndex === -1) return;

    const [task] = appData.activeTasks.splice(taskIndex, 1);
    const completedItem = {
      id: 'comp-' + Date.now(),
      title: task.title,
      completedAt: new Date().toISOString(),
      group: 'today'
    };

    appData.completedTasks.unshift(completedItem);
    
    // Persist & Broadcast
    persist({
      type: 'TASK_COMPLETED',
      payload: {
        id: task.id,
        completedId: completedItem.id,
        title: task.title,
        completedAt: completedItem.completedAt
      }
    });

    renderActiveTasks();
    renderCompletedHistory();
    showToast(`Done: "${task.title.slice(0, 24)}..."`);
  }

  // Edit Task
  function editTask(taskId) {
    const task = appData.activeTasks.find(t => t.id === taskId);
    if (!task) return;
    const newTitle = prompt('Edit task title:', task.title);
    if (newTitle && newTitle.trim()) {
      task.title = newTitle.trim();
      persist({
        type: 'TASK_EDITED',
        payload: { id: task.id, title: task.title }
      });
      renderActiveTasks();
      showToast('Task updated');
    }
  }

  // Delete Active Task
  function deleteActiveTask(taskId) {
    appData.activeTasks = appData.activeTasks.filter(t => t.id !== taskId);
    persist({
      type: 'TASK_DELETED',
      payload: { id: taskId }
    });
    renderActiveTasks();
    showToast('Task deleted');
  }

  // Render Completed History
  function renderCompletedHistory() {
    const completed = appData.completedTasks || [];
    completedBadge.textContent = completed.length;
    historyFinishedBadge.textContent = `${completed.length} Finished`;

    listToday.innerHTML = '';
    listYesterday.innerHTML = '';
    listEarlier.innerHTML = '';

    const todayItems = completed.filter(t => t.group === 'today');
    const yesterdayItems = completed.filter(t => t.group === 'yesterday');
    const earlierItems = completed.filter(t => t.group === 'earlier' || (!t.group && t.group !== 'today' && t.group !== 'yesterday'));

    countToday.textContent = `${todayItems.length} TASKS`;
    countYesterday.textContent = `${yesterdayItems.length} TASKS`;
    countEarlier.textContent = `${earlierItems.length} TASKS`;

    todayItems.forEach(t => listToday.appendChild(createCompletedCard(t)));
    yesterdayItems.forEach(t => listYesterday.appendChild(createCompletedCard(t)));
    earlierItems.forEach(t => listEarlier.appendChild(createCompletedCard(t)));

    // Dynamic Velocity
    const total = (appData.activeTasks.length + completed.length) || 1;
    const velocityRate = Math.min(99, Math.round((completed.length / total) * 100));
    velocityPercentage.textContent = `↑${velocityRate}%`;
  }

  function createCompletedCard(item) {
    const card = document.createElement('div');
    card.className = 'history-item group flex items-center justify-between p-2 rounded-lg bg-surface-container/60 hover:bg-surface-container transition-all';
    card.setAttribute('data-title', item.title.toLowerCase());

    const timeString = formatCompletedTime(item.completedAt);

    card.innerHTML = `
      <div class="flex items-center gap-space-sm min-w-0 pr-2">
        <button class="reopen-trigger w-4 h-4 rounded flex items-center justify-center bg-secondary text-on-secondary shrink-0 hover:opacity-80 transition-opacity" title="Click to undo / reopen">
          <span class="material-symbols-outlined text-[12px]" style="font-variation-settings: 'FILL' 1;">check</span>
        </button>
        <div class="flex flex-col min-w-0">
          <span class="font-body-sm text-body-sm line-through text-outline truncate group-hover:text-on-surface-variant transition-colors">${escapeHtml(item.title)}</span>
          <div class="flex items-center gap-1 font-label-mono text-label-sm text-outline">
            <span class="material-symbols-outlined text-[10px]">schedule</span>
            <span>${timeString}</span>
          </div>
        </div>
      </div>
      <div class="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        <button class="reopen-btn px-1.5 py-0.5 rounded bg-surface-container-high hover:bg-surface-bright text-on-surface font-label-mono text-label-sm transition-colors" title="Reopen Task">
          Undo
        </button>
        <button class="delete-btn w-6 h-6 flex items-center justify-center rounded text-on-surface-variant hover:text-error hover:bg-surface-variant transition-colors" title="Remove permanently">
          <span class="material-symbols-outlined text-[14px]">close</span>
        </button>
      </div>
    `;

    // Undo action
    const undoAction = () => {
      appData.completedTasks = appData.completedTasks.filter(c => c.id !== item.id);
      const restoredTask = {
        id: 'task-' + Date.now(),
        title: item.title,
        priority: 'medium',
        tag: 'General',
        createdAt: new Date().toISOString()
      };
      appData.activeTasks.push(restoredTask);

      persist({
        type: 'TASK_REOPENED',
        payload: { id: item.id, title: item.title, newActiveTask: restoredTask }
      });

      renderActiveTasks();
      renderCompletedHistory();
      showToast(`Reopened: "${item.title.slice(0, 20)}..."`);
    };

    card.querySelector('.reopen-trigger').addEventListener('click', undoAction);
    card.querySelector('.reopen-btn').addEventListener('click', undoAction);

    // Delete action
    card.querySelector('.delete-btn').addEventListener('click', () => {
      appData.completedTasks = appData.completedTasks.filter(c => c.id !== item.id);
      persist({
        type: 'TASK_DELETED',
        payload: { id: item.id }
      });
      renderCompletedHistory();
      showToast('Removed from history log');
    });

    return card;
  }

  function formatCompletedTime(isoString) {
    if (!isoString) return 'Completed';
    try {
      const date = new Date(isoString);
      return `Completed at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } catch {
      return 'Completed';
    }
  }

  // Filter History Items
  function filterHistory(query) {
    const q = query.toLowerCase().trim();
    let totalVisible = 0;

    const items = document.querySelectorAll('.history-item');
    items.forEach(el => {
      const title = el.getAttribute('data-title') || '';
      const match = title.includes(q);
      el.style.display = match ? 'flex' : 'none';
      if (match) totalVisible++;
    });

    document.querySelectorAll('.history-group').forEach(group => {
      const visibleInGroup = group.querySelectorAll('.history-item:not([style*="display: none"])');
      group.style.display = visibleInGroup.length > 0 ? 'block' : 'none';
    });

    noResultsNotice.style.display = totalVisible === 0 ? 'flex' : 'none';
  }

  // Apply Theme
  function applyTheme(preset, shouldSave = true) {
    document.body.setAttribute('data-theme', preset);
    appData.settings.themePreset = preset;

    themePresets.forEach(btn => {
      const checkIcon = btn.querySelector('.check-icon');
      if (btn.dataset.preset === preset) {
        btn.classList.add('ring-1', 'ring-primary/40', 'bg-surface-container/60');
        btn.classList.remove('bg-surface-container/40');
        if (checkIcon) checkIcon.classList.remove('hidden');
      } else {
        btn.classList.remove('ring-1', 'ring-primary/40', 'bg-surface-container/60');
        btn.classList.add('bg-surface-container/40');
        if (checkIcon) checkIcon.classList.add('hidden');
      }
    });

    themeActiveLabel.textContent = preset.charAt(0).toUpperCase() + preset.slice(1);

    if (shouldSave) {
      persist({
        type: 'THEME_CHANGED',
        payload: { themePreset: preset }
      });
    }
  }

  // Apply Radius
  function applyRadius(radius) {
    appData.settings.radius = radius;
    radiusButtons.forEach(btn => {
      if (btn.dataset.radius === radius) {
        btn.className = 'radius-btn px-2 py-0.5 rounded text-[11px] font-label-mono bg-surface-container-high text-on-surface font-semibold shadow-sm';
      } else {
        btn.className = 'radius-btn px-2 py-0.5 rounded text-[11px] font-label-mono text-on-surface-variant hover:text-on-surface';
      }
    });

    const rMap = { sharp: '0.125rem', rounded: '0.75rem', pill: '1.25rem' };
    container.style.borderRadius = rMap[radius] || '0.75rem';
  }

  // Apply Opacity
  function applyOpacity(val) {
    appData.settings.opacity = val;
    opacitySlider.value = val;
    opacityLabel.textContent = `${val}%`;
    container.style.opacity = (val / 100).toString();
  }

  // Update Pin UI
  function updatePinUI(pinned) {
    appData.settings.alwaysOnTop = pinned;
    if (pinned) {
      pinIcon.style.color = '#c0c1ff';
      btnSettingsPin.textContent = 'Pin: ON';
      btnSettingsPin.classList.add('text-secondary');
    } else {
      pinIcon.style.color = '';
      btnSettingsPin.textContent = 'Pin: OFF';
      btnSettingsPin.classList.remove('text-secondary');
    }
  }

  // Load Network & QR Code
  async function loadNetworkInfo() {
    if (!window.tasksAPI) return;
    try {
      const net = await window.tasksAPI.getNetworkInfo();
      syncHostIp.textContent = net.ip;
      syncPort.textContent = net.port;
      syncToken.textContent = net.token;

      if (net.clientCount > 0) {
        footerSyncStatus.textContent = `SYNCED (${net.clientCount} DEVICE${net.clientCount > 1 ? 'S' : ''})`;
        footerSyncStatus.className = 'text-secondary font-semibold';
      }

      const qrResult = await window.tasksAPI.generatePairingQR();
      if (qrResult.success) {
        qrCodeImg.src = qrResult.qr;
      }
    } catch (err) {
      console.error('Error fetching network info:', err);
    }
  }

  // Event Listeners setup
  function setupEventListeners() {
    navItems.forEach(btn => {
      btn.addEventListener('click', () => {
        const path = btn.getAttribute('data-path');
        if (path) switchView(path);
      });
    });

    // Quick add Task Submit
    function submitQuickTask() {
      const text = quickInput.value.trim();
      if (!text) return;

      const newTask = {
        id: 'task-' + Date.now(),
        title: text,
        priority: currentPriority,
        time: quickTimeInput.value || '17:00',
        tag: currentTag,
        createdAt: new Date().toISOString()
      };

      appData.activeTasks.push(newTask);
      persist({
        type: 'TASK_ADDED',
        payload: newTask
      });

      renderActiveTasks();
      quickInput.value = '';
      showToast('Task created');
    }

    quickInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        submitQuickTask();
      } else if (e.key === 'Escape') {
        quickInput.value = '';
        quickInput.blur();
      }
    });

    toggleAddBtn.addEventListener('click', () => {
      quickInput.focus();
      quickInput.select();
    });

    // Priority Cycle
    const priorities = ['urgent', 'medium', 'low'];
    btnQuickPriority.addEventListener('click', () => {
      const nextIdx = (priorities.indexOf(currentPriority) + 1) % priorities.length;
      currentPriority = priorities[nextIdx];
      quickPriorityText.textContent = currentPriority.charAt(0).toUpperCase() + currentPriority.slice(1);
      if (currentPriority === 'urgent') {
        quickPriorityDot.className = 'w-1.5 h-1.5 rounded-full bg-error';
        btnQuickPriority.className = 'h-[20px] px-1.5 bg-error-container/40 text-error font-label-mono text-[10px] rounded flex items-center gap-1';
      } else if (currentPriority === 'medium') {
        quickPriorityDot.className = 'w-1.5 h-1.5 rounded-full bg-tertiary';
        btnQuickPriority.className = 'h-[20px] px-1.5 bg-tertiary-container/30 text-tertiary-fixed-dim font-label-mono text-[10px] rounded flex items-center gap-1';
      } else {
        quickPriorityDot.className = 'w-1.5 h-1.5 rounded-full bg-secondary';
        btnQuickPriority.className = 'h-[20px] px-1.5 bg-secondary-container/20 text-secondary font-label-mono text-[10px] rounded flex items-center gap-1';
      }
    });

    // Tag Cycle
    const tags = ['Design', 'Dev', 'Ops', 'Team', 'Personal'];
    btnQuickTag.addEventListener('click', () => {
      const nextIdx = (tags.indexOf(currentTag) + 1) % tags.length;
      currentTag = tags[nextIdx];
      quickTagText.textContent = currentTag;
    });

    // History filter
    historyFilterInput.addEventListener('input', (e) => filterHistory(e.target.value));
    historyFilterInput.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        historyFilterInput.value = '';
        filterHistory('');
        historyFilterInput.blur();
      }
    });

    // Export history
    btnExportHistory.addEventListener('click', async () => {
      const completed = appData.completedTasks || [];
      if (completed.length === 0) {
        showToast('No history to export');
        return;
      }
      const mdLines = ['# tasks.core - Completed Tasks Log\n'];
      completed.forEach(c => {
        mdLines.push(`- [x] ${c.title} _(${formatCompletedTime(c.completedAt)})_`);
      });
      const mdContent = mdLines.join('\n');
      if (window.tasksAPI) {
        await window.tasksAPI.exportMarkdown(mdContent);
      } else {
        navigator.clipboard.writeText(mdContent);
      }
      showToast(`Exported ${completed.length} tasks to clipboard`);
    });

    // Clear history
    btnClearHistory.addEventListener('click', () => {
      if (confirm('Clear completed history? This action cannot be undone.')) {
        appData.completedTasks = [];
        persist();
        renderCompletedHistory();
        showToast('History cleared');
      }
    });

    // Themes selection
    themePresets.forEach(btn => {
      btn.addEventListener('click', () => {
        applyTheme(btn.dataset.preset, true);
      });
    });

    // Radius buttons
    radiusButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        applyRadius(btn.dataset.radius);
      });
    });

    // Opacity slider
    opacitySlider.addEventListener('input', (e) => {
      applyOpacity(e.target.value);
    });

    // Theme Save / Reset
    btnThemeSave.addEventListener('click', () => {
      persist();
      const orig = btnThemeSave.innerHTML;
      btnThemeSave.innerHTML = '<span class="material-symbols-outlined text-[16px]">done_all</span><span>Applied!</span>';
      setTimeout(() => btnThemeSave.innerHTML = orig, 1400);
    });

    btnThemeReset.addEventListener('click', () => {
      applyTheme('indigo', true);
      applyRadius('rounded');
      applyOpacity(95);
      showToast('Theme reset to defaults');
    });

    // Window controls
    btnWinClose.addEventListener('click', () => window.tasksAPI?.closeWindow());
    btnWinMin.addEventListener('click', () => window.tasksAPI?.minimizeWindow());
    btnHeaderMinimize.addEventListener('click', () => window.tasksAPI?.minimizeWindow());

    // Pin Toggle
    async function togglePin() {
      if (window.tasksAPI) {
        const pinned = await window.tasksAPI.togglePin();
        updatePinUI(pinned);
        showToast(pinned ? 'Always On Top: ON' : 'Always On Top: OFF');
      }
    }
    btnPinToggle.addEventListener('click', togglePin);
    btnSettingsPin.addEventListener('click', togglePin);

    // Compact Mode Toggle
    async function toggleCompact() {
      if (window.tasksAPI) {
        const compact = await window.tasksAPI.toggleCompact();
        if (compact) {
          container.classList.add('hidden');
          compactBar.classList.remove('hidden');
          renderActiveTasks();
        } else {
          compactBar.classList.add('hidden');
          container.classList.remove('hidden');
        }
      }
    }
    btnWinCompact.addEventListener('click', toggleCompact);
    btnCompactSidebar.addEventListener('click', toggleCompact);
    compactExpandBtn.addEventListener('click', toggleCompact);
    compactCloseBtn.addEventListener('click', () => window.tasksAPI?.closeWindow());

    compactCompleteBtn.addEventListener('click', () => {
      if (appData.activeTasks.length > 0) {
        completeTask(appData.activeTasks[0].id);
      }
    });

    // Global / IPC shortcut listener
    if (window.tasksAPI) {
      window.tasksAPI.onQuickAddTriggered(() => {
        switchView('active-tasks');
        quickInput.focus();
        quickInput.select();
      });
    }

    // Close dropdowns on outside click
    document.addEventListener('click', () => {
      document.querySelectorAll('.task-dropdown').forEach(d => d.classList.add('hidden'));
    });

    // Shortcut Cmd+K / Ctrl+K inside window
    window.addEventListener('keydown', (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        switchView('active-tasks');
        quickInput.focus();
        quickInput.select();
      }
    });

    document.getElementById('btn-footer-quick')?.addEventListener('click', () => {
      switchView('active-tasks');
      quickInput.focus();
      quickInput.select();
    });
  }

  // Utilities
  function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>"']/g, m => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
    }[m]));
  }

  // Initialize
  init();
})();
