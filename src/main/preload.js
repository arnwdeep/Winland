const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  // Window resizing & passthrough
  resizeWindow: (dimensions) => ipcRenderer.send('resize-window', dimensions),
  
  // Settings & Navigation
  openSettings: () => ipcRenderer.send('open-settings'),
  getConfig: () => ipcRenderer.invoke('get-config'),
  updateConfig: (newConfig) => ipcRenderer.send('update-config', newConfig),
  
  // Media controls
  sendMediaKey: (key) => ipcRenderer.send('media-control', key),
  
  // Volume controls
  setVolume: (val) => ipcRenderer.send('set-volume', val),

  // Clipboard
  copyText: (text) => ipcRenderer.send('copy-text', text),
  getClipboardHistory: () => ipcRenderer.invoke('get-clipboard-history'),

  // Listeners
  onSystemStats: (cb) => ipcRenderer.on('system-stats', (_e, data) => cb(data)),
  onBatteryChange: (cb) => ipcRenderer.on('battery-change', (_e, data) => cb(data)),
  onVolumeChange: (cb) => ipcRenderer.on('volume-change', (_e, data) => cb(data)),
  onMediaChange: (cb) => ipcRenderer.on('media-change', (_e, data) => cb(data)),
  onClipboardCopy: (cb) => ipcRenderer.on('clipboard-copy', (_e, data) => cb(data)),
  onNotification: (cb) => ipcRenderer.on('notification', (_e, data) => cb(data)),
  onConfigChange: (cb) => ipcRenderer.on('config-change', (_e, data) => cb(data)),
  onToggleEnabled: (cb) => ipcRenderer.on('toggle-enabled', (_e, data) => cb(data)),
  onToggleExpand: (cb) => ipcRenderer.on('toggle-expand', () => cb()),
  onBlurCollapse: (cb) => ipcRenderer.on('blur-collapse', () => cb())
});
