const { app, BrowserWindow, ipcMain, globalShortcut, nativeTheme, screen, clipboard } = require('electron');
const path = require('path');
const config = require('./config');
const overlayManager = require('./overlay');
const settingsWindow = require('./settings-window');
const trayManager = require('./tray');

// Services
const systemMonitor = require('./services/system-monitor');
const batteryService = require('./services/battery-service');
const volumeService = require('./services/volume-service');
const mediaService = require('./services/media-service');
const clipboardService = require('./services/clipboard-service');
const notificationService = require('./services/notification-service');

// Prevent multiple instances
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    settingsWindow.show();
  });
}

app.whenReady().then(() => {
  // Initialize configuration
  config.init();

  // Create overlay window
  overlayManager.create();

  // Initialize System Tray
  trayManager.init(overlayManager);

  // Initialize background system services
  systemMonitor.start(1800);
  batteryService.init();
  volumeService.init();
  mediaService.init();
  clipboardService.start(800);

  // Service Event Forwarding to Overlay Window
  systemMonitor.on('stats', (stats) => {
    overlayManager.send('system-stats', stats);
  });

  batteryService.on('change', (battery) => {
    overlayManager.send('battery-change', battery);
  });

  batteryService.on('low-battery', (battery) => {
    overlayManager.send('notification', {
      id: 'low-battery-' + Date.now(),
      appName: 'Power Management',
      title: 'Low Battery Alert',
      message: `${battery.percent}% remaining. Please connect your charger.`,
      type: 'warning',
      duration: 5000
    });
  });

  volumeService.on('change', (volData) => {
    overlayManager.send('volume-change', volData);
  });

  mediaService.on('change', (track) => {
    overlayManager.send('media-change', track);
  });

  clipboardService.on('copy', (item) => {
    overlayManager.send('clipboard-copy', item);
  });

  notificationService.on('notification', (notif) => {
    overlayManager.send('notification', notif);
  });

  // Windows Theme Detection
  nativeTheme.on('updated', () => {
    const isDark = nativeTheme.shouldUseDarkColors;
    overlayManager.send('theme-updated', { isDark, system: true });
  });

  // Global Hotkey (Alt+Space or Super+Alt+I)
  try {
    globalShortcut.register('Alt+Shift+I', () => {
      overlayManager.send('toggle-expand');
    });
  } catch (err) {
    console.warn('[Shortcut] Could not register global shortcut:', err);
  }

  // Windows Startup Setting
  syncStartupSetting();
});

// Sync Login/Startup Setting
function syncStartupSetting() {
  const startup = config.get('startupWithWindows');
  try {
    app.setLoginItemSettings({
      openAtLogin: !!startup,
      path: process.execPath
    });
  } catch (e) {
    console.warn('[Startup] Failed to set login item settings:', e);
  }
}

// IPC Handlers
ipcMain.on('set-interactive', (event, interactive) => {
  overlayManager.setInteractive(interactive);
});

ipcMain.on('open-settings', () => {
  settingsWindow.show();
});

ipcMain.handle('get-config', () => {
  return config.get();
});

ipcMain.handle('save-config', (event, newConfig) => {
  const updated = config.set(newConfig);
  syncStartupSetting();
  overlayManager.reposition();
  overlayManager.send('config-change', updated);
  trayManager.updateMenu();
  return updated;
});

ipcMain.handle('get-displays', () => {
  return screen.getAllDisplays().map((disp, i) => ({
    id: disp.id,
    index: i,
    label: `Display ${i + 1} (${disp.bounds.width}x${disp.bounds.height})${disp.id === screen.getPrimaryDisplay().id ? ' - Primary' : ''}`,
    bounds: disp.bounds,
    isPrimary: disp.id === screen.getPrimaryDisplay().id
  }));
});

ipcMain.on('media-control', (event, key) => {
  mediaService.sendMediaKey(key);
});

ipcMain.on('set-volume', (event, val) => {
  volumeService.setVolume(val);
});

ipcMain.on('trigger-test-notification', (event, data) => {
  notificationService.notify(data);
});

ipcMain.on('copy-text', (event, text) => {
  clipboard.writeText(text);
});

ipcMain.handle('get-clipboard-history', () => {
  return clipboardService.getHistory();
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
  systemMonitor.stop();
  batteryService.destroy();
  volumeService.destroy();
  mediaService.destroy();
  clipboardService.stop();
});

// Don't exit when all windows are closed, stay in system tray
app.on('window-all-closed', (e) => {
  if (process.platform !== 'darwin' && app.isQuitting) {
    app.quit();
  }
});
