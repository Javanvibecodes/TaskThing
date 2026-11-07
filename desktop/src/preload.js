const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('tasksAPI', {
  // Window controls
  minimizeWindow: () => ipcRenderer.send('window:minimize'),
  closeWindow: () => ipcRenderer.send('window:close'),
  togglePin: () => ipcRenderer.invoke('window:togglePin'),
  toggleCompact: () => ipcRenderer.invoke('window:toggleCompact'),
  
  // Storage
  loadData: () => ipcRenderer.invoke('storage:loadData'),
  saveData: (data) => ipcRenderer.invoke('storage:saveData', data),
  exportMarkdown: (content) => ipcRenderer.invoke('export:markdown', content),
  
  // Mobile Sync & Network info
  getNetworkInfo: () => ipcRenderer.invoke('sync:getNetworkInfo'),
  generatePairingQR: () => ipcRenderer.invoke('sync:generatePairingQR'),
  broadcastMutation: (mutation) => ipcRenderer.invoke('sync:broadcastMutation', mutation),
  
  // Real-time synchronization events from mobile clients
  onRemoteMutation: (callback) => {
    ipcRenderer.on('sync:remoteMutation', (event, mutation) => callback(mutation));
  },
  onClientCountChange: (callback) => {
    ipcRenderer.on('sync:clientCount', (event, count) => callback(count));
  },
  
  // Notification / Events
  onQuickAddTriggered: (callback) => {
    ipcRenderer.on('action:quick-add', () => callback());
  }
});
