const fs = require('fs');
const path = require('path');
const { app } = require('electron');

class LocalStore {
  constructor() {
    this.userDataPath = app.getPath('userData');
    this.filePath = path.join(this.userDataPath, 'tasks_store.json');
    this.data = this.load();
  }

  getDefaultData() {
    return {
      settings: {
        themePreset: 'indigo',
        colorMode: 'dark',
        radius: 'rounded',
        opacity: 95,
        alwaysOnTop: false,
        compactMode: false,
        soundEnabled: true,
        hotkey: 'CommandOrControl+Shift+T',
        syncPort: 48721,
        pairingToken: 'TC-' + Math.random().toString(36).substring(2, 10).toUpperCase()
      },
      activeTasks: [
        {
          id: 'task-1',
          title: 'Review Q4 design system specs',
          priority: 'urgent',
          time: '14:00',
          tag: 'Design',
          createdAt: new Date().toISOString()
        },
        {
          id: 'task-2',
          title: 'Send team retrospective notes',
          priority: 'medium',
          time: '15:30',
          tag: 'Team',
          createdAt: new Date().toISOString()
        },
        {
          id: 'task-3',
          title: 'Prepare client prototype demo',
          priority: 'urgent',
          time: '16:45',
          tag: 'Client',
          createdAt: new Date().toISOString()
        },
        {
          id: 'task-4',
          title: 'Update billing invoice details',
          priority: 'medium',
          time: '18:00',
          tag: 'Ops',
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
        },
        {
          id: 'comp-4',
          title: 'Finalize user onboarding flow spec',
          completedAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
          group: 'yesterday'
        },
        {
          id: 'comp-5',
          title: 'Sync with engineering core infrastructure team',
          completedAt: new Date(Date.now() - 1000 * 60 * 60 * 27).toISOString(),
          group: 'yesterday'
        },
        {
          id: 'comp-6',
          title: 'Audit keyboard navigation in floating dock',
          completedAt: new Date(Date.now() - 1000 * 60 * 60 * 72).toISOString(),
          group: 'earlier'
        },
        {
          id: 'comp-7',
          title: 'Configure local SQLite offline persistence',
          completedAt: new Date(Date.now() - 1000 * 60 * 60 * 79).toISOString(),
          group: 'earlier'
        },
        {
          id: 'comp-8',
          title: 'Benchmark memory utilization on idle state',
          completedAt: new Date(Date.now() - 1000 * 60 * 60 * 81).toISOString(),
          group: 'earlier'
        }
      ]
    };
  }

  load() {
    try {
      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, 'utf8');
        return Object.assign(this.getDefaultData(), JSON.parse(raw));
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

