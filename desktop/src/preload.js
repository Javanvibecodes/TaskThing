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
  
  // Real-time synchronization events from mobile clients
  onRemoteMutation: (callback) => {
    ipcRenderer.on('sync:remoteMutation', (event, mutation) => callback(mutation));
  },
  onClientCountChange: (callback) => {
    ipcRenderer.on('sync:clientCount', (event, count) => callback(count));
  },
  onPairingCodeChange: (callback) => {
    ipcRenderer.on('sync:pairingCode', (event, code) => callback(code));
  },
  
  // Notification / Events
  onQuickAddTriggered: (callback) => {
    ipcRenderer.on('action:quick-add', () => callback());
  }
});
