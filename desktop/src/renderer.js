// Task Thing — Desktop Renderer Engine
(async function() {
  let appData = {
    settings: {
      themePreset: 'cobalt',
      colorMode: 'light',
      alwaysOnTop: false
    },
    tagsBank: ['Design', 'Dev', 'Ops', 'Team', 'Personal'],
    repeatedTasks: [],
    tomorrowTasks: [],
    activeTasks: [],
    completedTasks: []
  };

  let currentPriority = 'urgent';
  let currentTagIndex = 0;
  let schedulingTarget = 'today'; // 'today' | 'tomorrow'
  let toastTimer = null;
  let isMac = false;

  // Habit editing state
  let editingHabitId = null;
  let habitPriority = 'medium';
  let habitTagIndex = -1;

  // DOM Elements
  const launchSplashScreen = document.getElementById('launch-splash-screen');
  const navItems = document.querySelectorAll('.nav-item[data-path]');
  const viewPanels = document.querySelectorAll('.view-panel');
  const navPendingBadge = document.getElementById('nav-pending-badge');
  const currentDateBadge = document.getElementById('current-date-badge');
  const remainingCountBadge = document.getElementById('remaining-count-badge');
  const activeTasksList = document.getElementById('active-tasks-list');
  const tasksLoadingSkeleton = document.getElementById('tasks-loading-skeleton');
  const stateNoTasksToday = document.getElementById('state-no-tasks-today');
  const stateAllCompletedToday = document.getElementById('state-all-completed-today');
  const completedSummaryText = document.getElementById('completed-summary-text');
  const btnEmptyAdd = document.getElementById('btn-empty-add');
  
  // Quick Add Elements
  const quickAddSection = document.getElementById('quick-add-section');
  const toggleAddBtn = document.getElementById('toggle-add-btn');
  const addBtnIcon = document.getElementById('add-btn-icon');
  const addBtnText = document.getElementById('add-btn-text');
  const btnAddDropdown = document.getElementById('btn-add-dropdown');
  const addOptionsMenu = document.getElementById('add-options-menu');
  const optAddToday = document.getElementById('opt-add-today');
  const optSetTomorrow = document.getElementById('opt-set-tomorrow');
  const quickInput = document.getElementById('quick-input');
  const btnCancelAdd = document.getElementById('btn-cancel-add');
  const btnQuickPriority = document.getElementById('btn-quick-priority');
  const quickPriorityDot = document.getElementById('quick-priority-dot');
  const quickPriorityText = document.getElementById('quick-priority-text');
  const quickTimeInput = document.getElementById('quick-time-input');
  const btnQuickTag = document.getElementById('btn-quick-tag');
  const quickTagText = document.getElementById('quick-tag-text');
  const btnAddNewTag = document.getElementById('btn-add-new-tag');
  const schedulingTargetBadge = document.getElementById('scheduling-target-badge');

  // Tomorrow Prep Banner
  const tomorrowPrepBanner = document.getElementById('tomorrow-prep-banner');
  const tomorrowPrepCount = document.getElementById('tomorrow-prep-count');
  const btnViewTomorrow = document.getElementById('btn-view-tomorrow');

  // Repeated Tasks Elements
  const repeatedTasksList = document.getElementById('repeated-tasks-list');
  const btnAddRepeated = document.getElementById('btn-add-repeated');

  // History Elements
  const historyFilterInput = document.getElementById('history-filter-input');
  const groupToday = document.getElementById('group-today');
  const groupYesterday = document.getElementById('group-yesterday');
  const groupEarlier = document.getElementById('group-earlier');
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
  const btnThemeSave = document.getElementById('btn-theme-save');
  const btnThemeReset = document.getElementById('btn-theme-reset');

  // Settings & Pairing
  const pairingCodeEl = document.getElementById('pairing-code');
  const btnNewPairingCode = document.getElementById('btn-new-pairing-code');
  const syncHostIp = document.getElementById('sync-host-ip');
  const syncPort = document.getElementById('sync-port');
  const syncToken = document.getElementById('sync-token');
  const syncCardDot = document.getElementById('sync-card-dot');
  const syncCardText = document.getElementById('sync-card-text');
  const btnCopySync = document.getElementById('btn-copy-sync');
  const btnSettingsPin = document.getElementById('btn-settings-pin');
  // Tag Popover Elements
  const newTagPopover = document.getElementById('new-tag-popover');
  const inputNewTagName = document.getElementById('input-new-tag-name');
  const btnSaveNewTag = document.getElementById('btn-save-new-tag');
  const btnCancelTagPopover = document.getElementById('btn-cancel-tag-popover');
  const btnCloseTagPopover = document.getElementById('btn-close-tag-popover');

  // Habit Inline Form Elements (create + edit)
  const habitAddSection = document.getElementById('habit-add-section');
  const inputHabitTitle = document.getElementById('input-habit-title');
  const btnHabitPriority = document.getElementById('btn-habit-priority');
  const habitPriorityDot = document.getElementById('habit-priority-dot');
  const habitPriorityText = document.getElementById('habit-priority-text');
  const habitTimeInput = document.getElementById('habit-time-input');
  const btnHabitTag = document.getElementById('btn-habit-tag');
  const habitTagText = document.getElementById('habit-tag-text');
  const btnSaveHabit = document.getElementById('btn-save-habit');
  const btnCancelHabit = document.getElementById('btn-cancel-habit');
  const saveHabitText = document.getElementById('save-habit-text');
  const addRepeatedIcon = document.getElementById('add-repeated-icon');
  const addRepeatedText = document.getElementById('add-repeated-text');

  // Footer & Status
  const footerSyncDot = document.getElementById('footer-sync-dot');
  const footerSyncStatus = document.getElementById('footer-sync-status');

  // Window Controls (Mac vs Windows)
  const macControls = document.getElementById('mac-controls');
  const winControls = document.getElementById('win-controls');
  const btnMacClose = document.getElementById('btn-mac-close');
  const btnMacMin = document.getElementById('btn-mac-min');
  const btnWinClose = document.getElementById('btn-win-close');
  const btnWinMin = document.getElementById('btn-win-min');
  const btnPinToggle = document.getElementById('btn-pin-toggle');
  const pinIcon = document.getElementById('pin-icon');

  // Toast
  const toastBar = document.getElementById('toast-bar');
  const toastText = document.getElementById('toast-text');

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

  // ----------------- LAUNCH ANIMATION -----------------
  function playLaunchAnimation() {
    return new Promise((resolve) => {
      if (!launchSplashScreen) {
        resolve();
        return;
      }

      let isFinished = false;
      const finishSplash = () => {
        if (isFinished) return;
        isFinished = true;
        launchSplashScreen.classList.add('opacity-0', 'pointer-events-none');
        setTimeout(() => {
          launchSplashScreen.remove();
          resolve();
        }, 500);
      };

      // Click to skip; otherwise show the app logo briefly, then reveal the UI
      launchSplashScreen.addEventListener('click', finishSplash);
      setTimeout(finishSplash, 1500);
    });
  }

  // ----------------- PLATFORM DETECTION -----------------
  async function setupPlatformUI() {
    try {
      if (window.tasksAPI?.getPlatform) {
        const platform = await window.tasksAPI.getPlatform();
        isMac = platform === 'darwin';
      }
    } catch (e) {
      isMac = false;
    }

    if (isMac) {
      macControls.classList.remove('hidden');
      macControls.classList.add('flex');
      winControls.classList.add('hidden');
    } else {
      macControls.classList.add('hidden');
      winControls.classList.remove('hidden');
      winControls.classList.add('flex');
    }
  }

  // ----------------- INITIALIZATION -----------------
  async function init() {
    playLaunchAnimation();
    await setupPlatformUI();

    // Show initial loading skeleton
    tasksLoadingSkeleton.classList.remove('hidden');

    try {
      if (window.tasksAPI) {
        appData = await window.tasksAPI.loadData();
      }
    } catch (err) {
      console.warn('Using local fallback:', err);
    }

    // Safety checks
    if (!appData.tagsBank || appData.tagsBank.length === 0) {
      appData.tagsBank = ['Design', 'Dev', 'Ops', 'Team', 'Personal'];
    }
    if (!appData.repeatedTasks) appData.repeatedTasks = [];
    if (!appData.tomorrowTasks) appData.tomorrowTasks = [];
    if (!appData.activeTasks) appData.activeTasks = [];
    if (!appData.completedTasks) appData.completedTasks = [];

    // Hide skeleton after load
    tasksLoadingSkeleton.classList.add('hidden');

    renderCurrentDate();
    applyTheme(appData.settings.themePreset || 'cobalt');
    updatePinUI(appData.settings.alwaysOnTop || false);

    updateTagCyclistUI();
    renderActiveTasks();
    renderCompletedHistory();
    renderRepeatedTasks();
    updateTomorrowBanner();
    setupEventListeners();
    setupSyncListeners();
    loadNetworkInfo();
  }

  function renderCurrentDate() {
    const now = new Date();
    currentDateBadge.textContent = now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  }

  async function persist(mutation = null) {
    if (window.tasksAPI) {
      await window.tasksAPI.saveData(appData);
      if (mutation) {
        // Broadcast all mutations EXCEPT theme (themes stay local!)
        if (mutation.type !== 'THEME_CHANGED') {
          await window.tasksAPI.broadcastMutation(mutation);
        }
      }
    }
  }

  // ----------------- REAL-TIME SYNC LISTENERS -----------------
  function setupSyncListeners() {
    if (!window.tasksAPI) return;

    window.tasksAPI.onRemoteMutation((mutation) => {
      // Ignore theme changes from phone (theme is independent per device)
      if (mutation.type === 'THEME_CHANGED') return;
      handleIncomingRemoteMutation(mutation);
    });

    window.tasksAPI.onClientCountChange((count) => {
      updateSyncStatusUI(count);
    });
  }

  function updateSyncStatusUI(clientCount) {
    if (clientCount > 0) {
      footerSyncDot.className = 'w-1.5 h-1.5 rounded-full bg-secondary animate-pulse';
      footerSyncStatus.textContent = `SYNCED (${clientCount} DEVICE${clientCount > 1 ? 'S' : ''})`;
      footerSyncStatus.className = 'text-secondary font-semibold';

      syncCardDot.className = 'w-1.5 h-1.5 rounded-full bg-secondary animate-pulse';
      syncCardText.textContent = `${clientCount} Device Connected (Real-Time Sync)`;
    } else {
      footerSyncDot.className = 'w-1.5 h-1.5 rounded-full bg-outline';
      footerSyncStatus.textContent = 'OFFLINE';
      footerSyncStatus.className = 'text-on-surface-variant';

      syncCardDot.className = 'w-1.5 h-1.5 rounded-full bg-outline';
      syncCardText.textContent = 'Local Direct Sync Ready (Waiting for Phone)';
    }
  }

  async function handleIncomingRemoteMutation(mutation) {
    if (window.tasksAPI) {
      appData = await window.tasksAPI.loadData();
    }
    renderActiveTasks();
    renderCompletedHistory();
    renderRepeatedTasks();

    const title = mutation.payload?.title ? `"${mutation.payload.title.slice(0, 18)}..."` : 'task';
    if (mutation.type === 'TASK_ADDED') showToast(`Phone added ${title}`);
    else if (mutation.type === 'TASK_COMPLETED') showToast(`Phone completed ${title}`);
    else if (mutation.type === 'TASK_REOPENED') showToast(`Phone reopened ${title}`);
    else if (mutation.type === 'TASK_DELETED') showToast(`Phone removed task`);
  }

  // ----------------- NAVIGATION -----------------
  function switchView(targetPath) {
    navItems.forEach(item => {
      const isTarget = item.getAttribute('data-path') === targetPath;
      if (isTarget) {
        item.setAttribute('aria-current', 'page');
        item.className = 'nav-item relative w-10 h-10 flex items-center justify-center rounded-lg transition-colors bg-primary text-white shadow-sm';
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

  // ----------------- ACTIVE TASKS & EMPTY STATES -----------------
  function renderActiveTasks() {
    activeTasksList.innerHTML = '';
    const tasks = appData.activeTasks || [];
    
    // Pending badge on the Today's Tasks tab: only visible when tasks are pending
    if (tasks.length > 0) {
      navPendingBadge.textContent = tasks.length;
      navPendingBadge.classList.remove('hidden');
      navPendingBadge.classList.add('flex');
    } else {
      navPendingBadge.textContent = '';
      navPendingBadge.classList.add('hidden');
      navPendingBadge.classList.remove('flex');
    }

    remainingCountBadge.textContent = `${tasks.length} remaining`;

    // Check completed today count to differentiate empty states
    const todayCompletedCount = (appData.completedTasks || []).filter(c => c.group === 'today').length;

    if (tasks.length === 0) {
      if (todayCompletedCount > 0) {
        stateNoTasksToday.classList.add('hidden');
        stateAllCompletedToday.classList.remove('hidden');
        completedSummaryText.textContent = `You completed ${todayCompletedCount} task${todayCompletedCount > 1 ? 's' : ''} today. Everything is done!`;
      } else {
        stateAllCompletedToday.classList.add('hidden');
        stateNoTasksToday.classList.remove('hidden');
      }
      return;
    }

    // Hide empty states
    stateNoTasksToday.classList.add('hidden');
    stateAllCompletedToday.classList.add('hidden');

    tasks.forEach((task) => {
      const card = document.createElement('div');
      
      // Highlight in red if task is an overdue rollover from a previous day!
      let rolloverClasses = '';
      if (task.isRollover) {
        rolloverClasses = 'border border-error/40 bg-error-container/40 ring-1 ring-error/20';
      } else {
        rolloverClasses = 'bg-surface-container hover:bg-surface-container-high border border-outline-variant';
      }

      card.className = `group relative p-space-sm rounded-lg shadow-sm flex items-center justify-between gap-space-xs transition-all ${rolloverClasses}`;
      
      const priorityBadge = getPriorityBadge(task.priority);

      card.innerHTML = `
        <div class="flex items-center gap-space-sm min-w-0 flex-1">
          <button data-task-id="${task.id}" class="task-check-btn w-4 h-4 rounded-full bg-surface-container-highest hover:bg-primary/20 flex items-center justify-center text-transparent hover:text-primary transition-colors flex-shrink-0" title="Mark done">
            <span class="material-symbols-outlined text-[13px]">check</span>
          </button>
          <div class="flex flex-col min-w-0 cursor-pointer task-title-box">
            <div class="flex items-center gap-1.5 min-w-0">
              <span class="font-body-sm text-body-sm text-on-surface truncate">${escapeHtml(task.title)}</span>
              ${task.isRollover ? `
                <span class="h-3.5 px-1 rounded bg-error text-on-error font-label-mono text-[8px] font-bold tracking-wider uppercase shrink-0">Overdue</span>
              ` : ''}
            </div>
            <div class="flex items-center gap-space-xs mt-0.5">
              ${priorityBadge}
              ${task.time ? `
                <span class="font-label-mono text-label-mono text-on-surface-variant flex items-center gap-0.5">
                  <span class="material-symbols-outlined text-[10px]">schedule</span>
                  ${escapeHtml(task.time)}
                </span>
              ` : ''}
              ${task.tag ? `
                <span class="font-label-mono text-[10px] text-on-surface-variant bg-surface-container-high px-1 rounded">
                  ${escapeHtml(task.tag)}
                </span>
              ` : ''}
              ${task.isRollover ? `
                <button class="move-today-btn ml-1 font-label-mono text-[9px] text-error hover:underline flex items-center gap-0.5">
                  <span class="material-symbols-outlined text-[10px]">update</span>
                  <span>Move to Today</span>
                </button>
              ` : ''}
            </div>
          </div>
        </div>
        <div class="relative task-actions-wrap flex items-center">
          <button class="task-menu-btn w-6 h-6 rounded flex items-center justify-center text-on-surface-variant hover:text-on-surface hover:bg-surface-variant transition-colors flex-shrink-0">
            <span class="material-symbols-outlined text-[15px]">more_horiz</span>
          </button>
          <div class="task-dropdown hidden absolute right-0 top-7 w-32 bg-surface shadow-xl rounded-lg py-1 z-30 flex flex-col border border-outline">
            <button data-action="edit" class="px-space-sm py-1 flex items-center gap-space-xs text-on-surface hover:bg-surface-container text-left font-label-md text-label-md">
              <span class="material-symbols-outlined text-[13px] text-on-surface-variant">edit</span>
              <span>Edit</span>
            </button>
            <button data-action="move-tomorrow" class="px-space-sm py-1 flex items-center gap-space-xs text-on-surface hover:bg-surface-container text-left font-label-md text-label-md">
              <span class="material-symbols-outlined text-[13px] text-tertiary">event_upcoming</span>
              <span>Tomorrow</span>
            </button>
            <button data-action="delete" class="px-space-sm py-1 flex items-center gap-space-xs text-error hover:bg-error-container/40 text-left font-label-md text-label-md">
              <span class="material-symbols-outlined text-[13px] text-error">delete</span>
              <span>Delete</span>
            </button>
          </div>
        </div>
      `;

      // Checkbox listener
      card.querySelector('.task-check-btn').addEventListener('click', () => completeTask(task.id));

      // Title click to edit
      card.querySelector('.task-title-box').addEventListener('click', (e) => {
        if (!e.target.closest('.move-today-btn')) {
          editTask(task.id);
        }
      });

      // Move rollover task to Today
      const moveBtn = card.querySelector('.move-today-btn');
      if (moveBtn) {
        moveBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          task.isRollover = false;
          task.date = getTodayString();
          persist({ type: 'TASK_EDITED', payload: task });
          renderActiveTasks();
          showToast('Moved to Today');
        });
      }

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

      dropdown.querySelector('[data-action="edit"]').addEventListener('click', (e) => {
        e.stopPropagation();
        dropdown.classList.add('hidden');
        editTask(task.id);
      });

      dropdown.querySelector('[data-action="move-tomorrow"]').addEventListener('click', (e) => {
        e.stopPropagation();
        dropdown.classList.add('hidden');
        moveTaskToTomorrow(task.id);
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
        <span class="h-4 px-1 rounded bg-tertiary-container/30 text-tertiary font-label-mono text-[9px] font-semibold flex items-center gap-0.5">
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

  function deleteActiveTask(taskId) {
    appData.activeTasks = appData.activeTasks.filter(t => t.id !== taskId);
    persist({
      type: 'TASK_DELETED',
      payload: { id: taskId }
    });
    renderActiveTasks();
    showToast('Task deleted');
  }

  function moveTaskToTomorrow(taskId) {
    const idx = appData.activeTasks.findIndex(t => t.id === taskId);
    if (idx === -1) return;
    const [task] = appData.activeTasks.splice(idx, 1);
    task.date = getTomorrowString();
    task.isRollover = false;
    appData.tomorrowTasks.push(task);
    persist({ type: 'TASK_DELETED', payload: { id: task.id } });
    renderActiveTasks();
    updateTomorrowBanner();
    showToast('Moved to Tomorrow');
  }

  // ----------------- TOMORROW SCHEDULING -----------------
  function updateTomorrowBanner() {
    const tomorrowCount = (appData.tomorrowTasks || []).length;
    if (tomorrowCount > 0) {
      tomorrowPrepBanner.classList.remove('hidden');
      tomorrowPrepCount.textContent = `${tomorrowCount} task${tomorrowCount > 1 ? 's' : ''} queued for tomorrow`;
    } else {
      tomorrowPrepBanner.classList.add('hidden');
    }
  }

  // ----------------- REPEATED TASKS (DAILY HABITS) -----------------
  const PRIORITY_ORDER = ['urgent', 'medium', 'low'];

  function stylePriorityButton(btn, dot, label, priority) {
    if (label) label.textContent = priority.charAt(0).toUpperCase() + priority.slice(1);
    if (priority === 'urgent') {
      dot.className = 'w-1.5 h-1.5 rounded-full bg-error';
      btn.className = 'h-[20px] px-1.5 bg-error-container text-error font-label-mono text-[10px] rounded flex items-center gap-1';
    } else if (priority === 'medium') {
      dot.className = 'w-1.5 h-1.5 rounded-full bg-tertiary';
      btn.className = 'h-[20px] px-1.5 bg-primary-container text-on-primary-container font-label-mono text-[10px] rounded flex items-center gap-1';
    } else {
      dot.className = 'w-1.5 h-1.5 rounded-full bg-secondary';
      btn.className = 'h-[20px] px-1.5 bg-surface-container-high text-on-surface-variant font-label-mono text-[10px] rounded flex items-center gap-1';
    }
  }

  function openHabitForm(habitId = null) {
    if (!habitAddSection) return;
    editingHabitId = habitId;

    if (habitId) {
      const habit = (appData.repeatedTasks || []).find(h => h.id === habitId);
      if (!habit) return;
      habitPriority = habit.priority || 'medium';
      habitTagIndex = (appData.tagsBank || []).indexOf(habit.tag);
      inputHabitTitle.value = habit.title || '';
      habitTimeInput.value = habit.time || '09:00';
      habitTagText.textContent = habit.tag || 'Daily';
      if (saveHabitText) saveHabitText.textContent = 'Save Changes';
    } else {
      habitPriority = 'medium';
      habitTagIndex = -1;
      inputHabitTitle.value = '';
      habitTimeInput.value = '09:00';
      habitTagText.textContent = 'Daily';
      if (saveHabitText) saveHabitText.textContent = 'Save Habit';
    }

    stylePriorityButton(btnHabitPriority, habitPriorityDot, habitPriorityText, habitPriority);
    habitAddSection.classList.remove('hidden');
    if (addRepeatedIcon) addRepeatedIcon.textContent = 'close';
    if (addRepeatedText) addRepeatedText.textContent = 'Close';
    setTimeout(() => inputHabitTitle.focus(), 50);
  }

  function closeHabitForm() {
    if (!habitAddSection) return;
    habitAddSection.classList.add('hidden');
    editingHabitId = null;
    if (addRepeatedIcon) addRepeatedIcon.textContent = 'add';
    if (addRepeatedText) addRepeatedText.textContent = 'Add Habit';
  }

  function toggleHabitForm() {
    if (habitAddSection && habitAddSection.classList.contains('hidden')) {
      openHabitForm();
    } else {
      closeHabitForm();
    }
  }

  function saveHabit() {
    if (!inputHabitTitle) return;
    const title = inputHabitTitle.value.trim();
    if (!title) return;

    const tag = habitTagIndex >= 0
      ? ((appData.tagsBank || [])[habitTagIndex] || 'Daily')
      : 'Daily';

    if (editingHabitId) {
      const habit = (appData.repeatedTasks || []).find(h => h.id === editingHabitId);
      if (habit) {
        habit.title = title;
        habit.priority = habitPriority;
        habit.time = habitTimeInput.value || '09:00';
        habit.tag = tag;
        persist();
        renderRepeatedTasks();
        showToast('Daily habit updated');
      }
    } else {
      const newHabit = {
        id: 'rep-' + Date.now(),
        title,
        priority: habitPriority,
        time: habitTimeInput.value || '09:00',
        tag,
        enabled: true
      };
      appData.repeatedTasks.push(newHabit);
      persist();
      renderRepeatedTasks();
      showToast('Daily habit created!');
    }

    closeHabitForm();
  }

  function renderRepeatedTasks() {
    repeatedTasksList.innerHTML = '';
    const repeated = appData.repeatedTasks || [];

    if (repeated.length === 0) {
      repeatedTasksList.innerHTML = `
        <div class="py-8 text-center flex flex-col items-center justify-center text-outline gap-1">
          <span class="material-symbols-outlined text-[28px]">event_repeat</span>
          <span class="font-headline-sm text-body-sm text-on-surface-variant font-semibold">No repeated tasks set up</span>
          <span class="font-label-mono text-[11px]">Add daily routines (standups, exercise, inbox zero) to auto-populate each morning.</span>
        </div>
      `;
      return;
    }

    repeated.forEach(item => {
      const card = document.createElement('div');
      card.className = 'bg-surface-container p-3 rounded-lg flex items-center justify-between gap-3 border border-outline-variant';
      card.innerHTML = `
        <div class="flex items-center gap-3 min-w-0 flex-1">
          <input type="checkbox" ${item.enabled ? 'checked' : ''} class="rep-toggle w-4 h-4 accent-primary cursor-pointer rounded" title="Toggle active habit"/>
          <div class="flex flex-col min-w-0">
            <span class="font-body-sm text-on-surface truncate ${item.enabled ? '' : 'text-on-surface-variant line-through'} font-medium">${escapeHtml(item.title)}</span>
            <div class="flex items-center gap-2 mt-0.5 font-label-mono text-[10px] text-on-surface-variant">
              <span class="text-primary">Repeats Daily</span>
              ${item.time ? `<span>• ${escapeHtml(item.time)}</span>` : ''}
              ${item.tag ? `<span class="bg-surface-container-high px-1 rounded text-on-surface-variant">${escapeHtml(item.tag)}</span>` : ''}
            </div>
          </div>
        </div>
        <div class="flex items-center gap-1 shrink-0">
          <button class="rep-edit-btn w-6 h-6 rounded flex items-center justify-center text-on-surface-variant hover:text-primary hover:bg-surface-container-high transition-colors" title="Edit habit">
            <span class="material-symbols-outlined text-[15px]">edit</span>
          </button>
          <button class="rep-del-btn w-6 h-6 rounded flex items-center justify-center text-on-surface-variant hover:text-error hover:bg-surface-container-high transition-colors" title="Delete habit">
            <span class="material-symbols-outlined text-[15px]">delete</span>
          </button>
        </div>
      `;

      card.querySelector('.rep-toggle').addEventListener('change', (e) => {
        item.enabled = e.target.checked;
        persist();
        renderRepeatedTasks();
        showToast(item.enabled ? 'Daily habit enabled' : 'Daily habit paused');
      });

      card.querySelector('.rep-edit-btn').addEventListener('click', () => openHabitForm(item.id));

      card.querySelector('.rep-del-btn').addEventListener('click', () => {
        appData.repeatedTasks = appData.repeatedTasks.filter(r => r.id !== item.id);
        persist();
        renderRepeatedTasks();
        showToast('Repeated task removed');
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

  function renderCompletedHistory() {
    const completed = appData.completedTasks || [];

    listToday.innerHTML = '';
    listYesterday.innerHTML = '';
    listEarlier.innerHTML = '';

    const todayItems = completed.filter(t => historyGroupFor(t) === 'today');
    const yesterdayItems = completed.filter(t => historyGroupFor(t) === 'yesterday');
    const earlierItems = completed.filter(t => historyGroupFor(t) === 'earlier');

    countToday.textContent = `${todayItems.length} TASKS`;
    countYesterday.textContent = `${yesterdayItems.length} TASKS`;
    countEarlier.textContent = `${earlierItems.length} TASKS`;

    todayItems.forEach(t => listToday.appendChild(createCompletedCard(t)));
    yesterdayItems.forEach(t => listYesterday.appendChild(createCompletedCard(t)));
    earlierItems.forEach(t => listEarlier.appendChild(createCompletedCard(t)));

    groupToday.style.display = todayItems.length ? 'flex' : 'none';
    groupYesterday.style.display = yesterdayItems.length ? 'flex' : 'none';
    groupEarlier.style.display = earlierItems.length ? 'flex' : 'none';

    const total = (appData.activeTasks.length + completed.length) || 1;
    const velocityRate = Math.min(99, Math.round((completed.length / total) * 100));
    velocityPercentage.textContent = `↑${velocityRate}%`;
  }

  function createCompletedCard(item) {
    const card = document.createElement('div');
    card.className = 'history-item group flex items-center justify-between p-2 rounded-lg bg-surface-container hover:bg-surface-container-high border border-outline-variant transition-all';
    card.setAttribute('data-title', item.title.toLowerCase());

    const timeString = formatCompletedTime(item.completedAt);

    card.innerHTML = `
      <div class="flex items-center gap-space-sm min-w-0 pr-2">
        <button class="reopen-trigger w-4 h-4 rounded flex items-center justify-center bg-primary text-white shrink-0 hover:opacity-80 transition-opacity" title="Click to undo / reopen">
          <span class="material-symbols-outlined text-[12px]" style="font-variation-settings: 'FILL' 1;">check</span>
        </button>
        <div class="flex flex-col min-w-0">
          <span class="font-body-sm text-body-sm line-through text-on-surface-variant truncate group-hover:text-on-surface transition-colors">${escapeHtml(item.title)}</span>
          <div class="flex items-center gap-1 font-label-mono text-label-sm text-on-surface-variant/80">
            <span class="material-symbols-outlined text-[10px]">schedule</span>
            <span>${timeString}</span>
          </div>
        </div>
      </div>
      <div class="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        <button class="reopen-btn px-1.5 py-0.5 rounded bg-primary-container hover:bg-primary/20 text-on-primary-container font-label-mono text-label-sm transition-colors" title="Reopen Task">
          Undo
        </button>
        <button class="delete-btn w-6 h-6 flex items-center justify-center rounded text-on-surface-variant hover:text-error hover:bg-error-container/50 transition-colors" title="Remove permanently">
          <span class="material-symbols-outlined text-[14px]">close</span>
        </button>
      </div>
    `;

    const undoAction = () => {
      appData.completedTasks = appData.completedTasks.filter(c => c.id !== item.id);
      const restoredTask = {
        id: 'task-' + Date.now(),
        title: item.title,
        priority: 'medium',
        tag: 'General',
        date: getTodayString(),
        isRollover: false,
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
      group.style.display = visibleInGroup.length > 0 ? 'flex' : 'none';
    });

    noResultsNotice.style.display = totalVisible === 0 ? 'flex' : 'none';
  }

  // ----------------- THEMES & APPEARANCE (LOCAL ONLY) -----------------
  function applyTheme(preset, shouldSave = false) {
    document.body.setAttribute('data-theme', preset);
    appData.settings.themePreset = preset;

    themePresets.forEach(btn => {
      const checkIcon = btn.querySelector('.check-icon');
      if (btn.dataset.preset === preset) {
        btn.classList.remove('border-outline-variant');
        btn.classList.add('border-primary', 'ring-1', 'ring-primary/30');
        if (checkIcon) checkIcon.classList.remove('hidden');
      } else {
        btn.classList.remove('border-primary', 'ring-1', 'ring-primary/30');
        btn.classList.add('border-outline-variant');
        if (checkIcon) checkIcon.classList.add('hidden');
      }
    });

    if (shouldSave) {
      persist(); // Local save ONLY — no broadcast!
    }
  }

  function updatePinUI(pinned) {
    appData.settings.alwaysOnTop = pinned;
    pinIcon.style.color = '';
    if (pinned) {
      // Highlight with the active theme colour while the window is pinned
      btnPinToggle.className = 'w-8 h-8 flex items-center justify-center rounded bg-primary text-white shadow-sm transition-colors';
      btnSettingsPin.textContent = 'Pin: ON';
      btnSettingsPin.className = 'px-2.5 py-1 rounded bg-primary text-white font-label-mono text-[11px] font-semibold';
    } else {
      btnPinToggle.className = 'w-8 h-8 flex items-center justify-center rounded text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors';
      btnSettingsPin.textContent = 'Pin: OFF';
      btnSettingsPin.className = 'px-2.5 py-1 rounded bg-surface-container-high text-on-surface hover:bg-surface-container-highest font-label-mono text-[11px]';
    }
  }

  function updateTagCyclistUI() {
    const tags = appData.tagsBank;
    if (currentTagIndex >= tags.length) currentTagIndex = 0;
    quickTagText.textContent = tags[currentTagIndex];
  }

  // ----------------- NETWORK & PAIRING CODE -----------------
  function renderPairingCode(code) {
    if (!pairingCodeEl) return;
    pairingCodeEl.textContent = code || '------';
  }

  async function loadNetworkInfo() {
    if (!window.tasksAPI) return;
    try {
      const net = await window.tasksAPI.getNetworkInfo();
      syncHostIp.textContent = net.ip;
      syncPort.textContent = net.port;
      syncToken.textContent = net.token;
      renderPairingCode(net.pairingCode);

      updateSyncStatusUI(net.clientCount || 0);
    } catch (err) {
      console.error('Error fetching network info:', err);
    }
  }

  if (window.tasksAPI?.onPairingCodeChange) {
    window.tasksAPI.onPairingCodeChange((code) => renderPairingCode(code));
  }

  if (btnNewPairingCode) {
    btnNewPairingCode.addEventListener('click', async () => {
      try {
        const code = await window.tasksAPI.regeneratePairingCode();
        renderPairingCode(code);
        showToast('New pairing code ready');
      } catch (e) {
        showToast('Could not refresh pairing code');
      }
    });
  }

  // ----------------- EVENT LISTENERS -----------------
  function setupEventListeners() {
    // Copy a ready-to-paste pairing link (includes the token)
    if (btnCopySync) {
      btnCopySync.addEventListener('click', async () => {
        const link = `ws://${syncHostIp.textContent}:${syncPort.textContent}?token=${encodeURIComponent(syncToken.textContent)}`;
        try {
          if (window.tasksAPI?.writeClipboard) {
            await window.tasksAPI.writeClipboard(link);
          } else {
            await navigator.clipboard.writeText(link);
          }
          showToast('Pairing link copied');
        } catch (e) {
          showToast('Could not copy pairing link');
        }
      });
    }

    // Navigation
    navItems.forEach(btn => {
      btn.addEventListener('click', () => {
        const path = btn.getAttribute('data-path');
        if (path) switchView(path);
      });
    });

    // Toggle Quick-Add Section (Hidden by default)
    function openQuickAdd(target = 'today') {
      schedulingTarget = target;
      schedulingTargetBadge.textContent = target === 'tomorrow' ? 'Tomorrow' : 'Today';
      quickAddSection.classList.remove('hidden');
      addBtnText.textContent = 'Close';
      addBtnIcon.textContent = 'close';
      quickInput.focus();
      quickInput.select();
      addOptionsMenu.classList.add('hidden');
    }

    function closeQuickAdd() {
      quickAddSection.classList.add('hidden');
      addBtnText.textContent = 'Add Task';
      addBtnIcon.textContent = 'add';
      quickInput.value = '';
    }

    toggleAddBtn.addEventListener('click', () => {
      if (quickAddSection.classList.contains('hidden')) {
        openQuickAdd('today');
      } else {
        closeQuickAdd();
      }
    });

    btnCancelAdd.addEventListener('click', closeQuickAdd);
    btnEmptyAdd?.addEventListener('click', () => openQuickAdd('today'));

    // Dropdown for "Add for Today" vs "Set for Tomorrow"
    btnAddDropdown.addEventListener('click', (e) => {
      e.stopPropagation();
      addOptionsMenu.classList.toggle('hidden');
    });

    optAddToday.addEventListener('click', () => openQuickAdd('today'));
    optSetTomorrow.addEventListener('click', () => openQuickAdd('tomorrow'));

    // Submit Quick Task
    function submitQuickTask() {
      const text = quickInput.value.trim();
      if (!text) return;

      const newTask = {
        id: 'task-' + Date.now(),
        title: text,
        priority: currentPriority,
        time: quickTimeInput.value || '17:00',
        tag: appData.tagsBank[currentTagIndex],
        date: schedulingTarget === 'tomorrow' ? getTomorrowString() : getTodayString(),
        isRollover: false,
        createdAt: new Date().toISOString()
      };

      if (schedulingTarget === 'tomorrow') {
        appData.tomorrowTasks.push(newTask);
        persist();
        updateTomorrowBanner();
        showToast('Queued for Tomorrow!');
      } else {
        appData.activeTasks.push(newTask);
        persist({ type: 'TASK_ADDED', payload: newTask });
        renderActiveTasks();
        showToast('Task added for Today');
      }

      quickInput.value = '';
      closeQuickAdd();
    }

    // Priority Cycler
    const priorities = PRIORITY_ORDER;
    btnQuickPriority.addEventListener('click', () => {
      const nextIdx = (priorities.indexOf(currentPriority) + 1) % priorities.length;
      currentPriority = priorities[nextIdx];
      stylePriorityButton(btnQuickPriority, quickPriorityDot, quickPriorityText, currentPriority);
    });

    // Tag Cycler through Tag Bank
    btnQuickTag.addEventListener('click', () => {
      currentTagIndex = (currentTagIndex + 1) % appData.tagsBank.length;
      updateTagCyclistUI();
    });

    // + New Tag Popover Controls
    function openNewTagPopover() {
      if (!newTagPopover) return;
      newTagPopover.classList.remove('hidden');
      if (inputNewTagName) {
        inputNewTagName.value = '';
        setTimeout(() => inputNewTagName.focus(), 50);
      }
    }

    function closeNewTagPopover() {
      if (newTagPopover) newTagPopover.classList.add('hidden');
    }

    function saveNewTagFromInput() {
      if (!inputNewTagName) return;
      const clean = inputNewTagName.value.trim();
      if (clean) {
        if (!appData.tagsBank.includes(clean)) {
          appData.tagsBank.push(clean);
          currentTagIndex = appData.tagsBank.length - 1;
          persist();
          updateTagCyclistUI();
          showToast(`Tag "${clean}" added to bank`);
        } else {
          currentTagIndex = appData.tagsBank.indexOf(clean);
          updateTagCyclistUI();
        }
      }
      closeNewTagPopover();
    }

    btnAddNewTag.addEventListener('click', (e) => {
      e.stopPropagation();
      openNewTagPopover();
    });

    btnSaveNewTag?.addEventListener('click', (e) => {
      e.stopPropagation();
      saveNewTagFromInput();
    });

    btnCancelTagPopover?.addEventListener('click', (e) => {
      e.stopPropagation();
      closeNewTagPopover();
    });

    btnCloseTagPopover?.addEventListener('click', (e) => {
      e.stopPropagation();
      closeNewTagPopover();
    });

    inputNewTagName?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        saveNewTagFromInput();
      } else if (e.key === 'Escape') {
        closeNewTagPopover();
      }
    });

    // Repeated Habit Inline Form Controls (shared by create + edit)
    btnAddRepeated.addEventListener('click', toggleHabitForm);

    btnHabitPriority?.addEventListener('click', () => {
      habitPriority = PRIORITY_ORDER[(PRIORITY_ORDER.indexOf(habitPriority) + 1) % PRIORITY_ORDER.length];
      stylePriorityButton(btnHabitPriority, habitPriorityDot, habitPriorityText, habitPriority);
    });

    btnHabitTag?.addEventListener('click', () => {
      if (!appData.tagsBank.length) return;
      habitTagIndex = (habitTagIndex + 1) % appData.tagsBank.length;
      habitTagText.textContent = appData.tagsBank[habitTagIndex];
    });

    btnSaveHabit?.addEventListener('click', saveHabit);
    btnCancelHabit?.addEventListener('click', closeHabitForm);

    inputHabitTitle?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        saveHabit();
      } else if (e.key === 'Escape') {
        closeHabitForm();
      }
    });

    btnViewTomorrow.addEventListener('click', () => {
      alert(`Queued for Tomorrow (${appData.tomorrowTasks.length} tasks):\n\n` + 
        appData.tomorrowTasks.map((t, i) => `${i+1}. ${t.title} [${t.priority}]`).join('\n')
      );
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
      const mdLines = ['# Task Thing - Completed Tasks Log\n'];
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

    // Theme selector (Local Only)
    themePresets.forEach(btn => {
      btn.addEventListener('click', () => {
        applyTheme(btn.dataset.preset, true);
      });
    });

    btnThemeSave.addEventListener('click', () => {
      persist();
      showToast('Theme applied to PC');
    });

    btnThemeReset.addEventListener('click', () => {
      applyTheme('cobalt', true);
      showToast('Theme reset to Cobalt');
    });

    // Window controls
    const closeHandler = () => window.tasksAPI?.closeWindow();
    const minHandler = () => window.tasksAPI?.minimizeWindow();

    btnWinClose.addEventListener('click', closeHandler);
    btnWinMin.addEventListener('click', minHandler);
    btnMacClose.addEventListener('click', closeHandler);
    btnMacMin.addEventListener('click', minHandler);

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

    // IPC Quick Add listener
    if (window.tasksAPI) {
      window.tasksAPI.onQuickAddTriggered(() => {
        switchView('active-tasks');
        openQuickAdd('today');
      });
    }

    // Close menus and popovers on outside click
    document.addEventListener('click', (e) => {
      document.querySelectorAll('.task-dropdown').forEach(d => d.classList.add('hidden'));
      addOptionsMenu.classList.add('hidden');
      if (newTagPopover && !newTagPopover.contains(e.target) && e.target !== btnAddNewTag && !btnAddNewTag?.contains(e.target)) {
        newTagPopover.classList.add('hidden');
      }
    });

  }

  // ----------------- UTILITIES -----------------
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

  init();
})();
