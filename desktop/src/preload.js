const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('tasksAPI', {
  // System
  getPlatform: () => ipcRenderer.invoke('system:getPlatform'),
  minimizeWindow: () => ipcRenderer.send('window:minimize'),
  closeWindow: () => ipcRenderer.send('window:close'),
  togglePin: () => ipcRenderer.invoke('window:togglePin'),
  
  // Storage
  checkLatestVersion: () => ipcRenderer.invoke('app:checkLatestVersion'),
  saveData: (data) => ipcRenderer.invoke('storage:saveData', data),
  exportMarkdown: (content) => ipcRenderer.invoke('export:markdown', content),
  writeClipboard: (content) => ipcRenderer.invoke('clipboard:write', content),
  
  // Mobile Sync & Network info
  getNetworkInfo: () => ipcRenderer.invoke('sync:getNetworkInfo'),
  regeneratePairingCode: () => ipcRenderer.invoke('sync:regeneratePairingCode'),
  broadcastMutation: (mutation) => ipcRenderer.invoke('sync:broadcastMutation', mutation),
  refreshSync: () => ipcRenderer.invoke('sync:refresh'),
  
  // Real-time synchronization events from mobile clients
  onRemoteMutation: (callback) => {
    ipcRenderer.on('sync:remoteMutation', (event, mutation) => callback(mutation));
  },
  onClientCountChange: (callback) => {
    ipcRenderer.on('sync:clientCount', (event, count) => callback(count));
  },
  onClientsChange: (callback) => {
    ipcRenderer.on('sync:clients', (event, clients) => callback(clients));
  },
  onNetworkChanged: (callback) => {
    ipcRenderer.on('sync:networkChanged', () => callback());
  },
  onPairingCodeChange: (callback) => {
    ipcRenderer.on('sync:pairingCode', (event, code) => callback(code));
  },
  
  // Notification / Events
  onQuickAddTriggered: (callback) => {
    ipcRenderer.on('action:quick-add', () => callback());
  }
});
