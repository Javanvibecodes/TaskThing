const fs = require('fs');
const path = require('path');
const { app } = require('electron');

class LocalStore {
  constructor() {
    this.userDataPath = app.getPath('userData');
    this.filePath = path.join(this.userDataPath, 'tasks_store.json');
    this.data = this.load();
    this.checkDayRollover();
  }

  getTodayString() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  getDefaultData() {
    const today = this.getTodayString();
    return {
      appName: 'Task Thing',
      tagline: "Get your *things* together",
      lastActiveDate: today,
      tagsBank: ['Design', 'Dev', 'Ops', 'Team', 'Personal'],
      settings: {
        themePreset: 'cobalt',
        colorMode: 'dark',
        alwaysOnTop: false,
        compactMode: false,
        soundEnabled: true,
        syncPort: 48721,
        pairingToken: 'TC-' + Math.random().toString(36).substring(2, 10).toUpperCase()
      },
      repeatedTasks: [
        {
          id: 'rep-1',
          title: 'Daily morning standup & sync',
          priority: 'medium',
          time: '09:00',
          tag: 'Team',
          enabled: true
        },
        {
          id: 'rep-2',
          title: 'Zero inbox & review pull requests',
          priority: 'low',
          time: '17:30',
          tag: 'Dev',
          enabled: true
        }
      ],
      tomorrowTasks: [],
      activeTasks: [
        {
          id: 'task-1',
          title: 'Review Q4 design system specs',
          priority: 'urgent',
          time: '14:00',
          tag: 'Design',
          date: today,
          isRollover: false,
          createdAt: new Date().toISOString()
        },
        {
          id: 'task-2',
          title: 'Send team retrospective notes',
          priority: 'medium',
          time: '15:30',
          tag: 'Team',
          date: today,
          isRollover: false,
          createdAt: new Date().toISOString()
        },
        {
          id: 'task-3',
          title: 'Prepare client prototype demo',
          priority: 'urgent',
          time: '16:45',
          tag: 'Client',
          date: today,
          isRollover: false,
          createdAt: new Date().toISOString()
        },
        {
          id: 'task-4',
          title: 'Update billing invoice details',
          priority: 'medium',
          time: '18:00',
          tag: 'Ops',
          date: today,
          isRollover: false,
          createdAt: new Date().toISOString()
        }
      ],
      completedTasks: [
        {
          id: 'comp-1',
          title: 'Ship widget micro-interactions polish',
          completedAt: new Date(Date.now() - 1000 * 60 * 75).toISOString(),
          group: 'today'
        },
        {
          id: 'comp-2',
          title: 'Review telemetry payload constraints',
          completedAt: new Date(Date.now() - 1000 * 60 * 230).toISOString(),
          group: 'today'
        },
        {
          id: 'comp-3',
          title: 'Export design system color ramp tokens',
          completedAt: new Date(Date.now() - 1000 * 60 * 370).toISOString(),
          group: 'today'
        }
      ]
    };
  }

  checkDayRollover() {
    const today = this.getTodayString();
    if (!this.data) return;

    if (!this.data.tagsBank) {
      this.data.tagsBank = ['Design', 'Dev', 'Ops', 'Team', 'Personal'];
    }
    if (!this.data.repeatedTasks) {
      this.data.repeatedTasks = [];
    }
    if (!this.data.tomorrowTasks) {
      this.data.tomorrowTasks = [];
    }

    const lastDate = this.data.lastActiveDate || today;

    if (lastDate !== today) {
      // 1. Move tomorrowTasks to activeTasks
      if (this.data.tomorrowTasks && this.data.tomorrowTasks.length > 0) {
        this.data.tomorrowTasks.forEach(task => {
          task.date = today;
          task.isRollover = false;
          this.data.activeTasks.push(task);
        });
        this.data.tomorrowTasks = [];
      }

      // 2. Mark any uncompleted active tasks from previous day as Rollover (red highlight)
      if (this.data.activeTasks && this.data.activeTasks.length > 0) {
        this.data.activeTasks.forEach(task => {
          if (task.date && task.date < today) {
            task.isRollover = true;
            task.rolloverFrom = task.date;
          }
        });
      }

      // 3. Instantiate repeated tasks for the new day
      if (this.data.repeatedTasks && this.data.repeatedTasks.length > 0) {
        this.data.repeatedTasks.forEach(rep => {
          if (rep.enabled) {
            // Check if already instantiated today
            const alreadyExists = this.data.activeTasks.some(t => t.repeatedOriginId === rep.id && t.date === today);
            if (!alreadyExists) {
              this.data.activeTasks.push({
                id: 'task-rep-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
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

      this.data.lastActiveDate = today;
      this.save(this.data);
    }
  }

  load() {
    try {
      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, 'utf8');
        const parsed = JSON.parse(raw);
        return Object.assign(this.getDefaultData(), parsed);
      }
    } catch (err) {
      console.error('Error loading data from local store:', err);
    }
    const def = this.getDefaultData();
    this.save(def);
    return def;
  }

  save(data) {
    try {
      this.data = data;
      fs.writeFileSync(this.filePath, JSON.stringify(data, null, 2), 'utf8');
      return true;
    } catch (err) {
      console.error('Error saving data to local store:', err);
      return false;
    }
  }

  get() {
    return this.data;
  }
}

module.exports = LocalStore;
