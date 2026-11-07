const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('settingsApi', {
  getConfig: () => ipcRenderer.invoke('get-config'),
  saveConfig: (newConfig) => ipcRenderer.invoke('save-config', newConfig),
  getDisplays: () => ipcRenderer.invoke('get-displays'),
  triggerTestNotification: (data) => ipcRenderer.send('trigger-test-notification', data),
  triggerTestVolume: (val) => ipcRenderer.send('set-volume', val),
  triggerTestMedia: () => ipcRenderer.send('media-control', 'playPause')
});
