const { BrowserWindow, nativeTheme } = require('electron');
const path = require('path');

class SettingsWindowManager {
  constructor() {
    this.window = null;
  }

  show() {
    if (this.window && !this.window.isDestroyed()) {
      this.window.show();
      this.window.focus();
      return this.window;
    }

    this.window = new BrowserWindow({
      width: 820,
      height: 680,
      minWidth: 700,
      minHeight: 560,
      title: 'Winland Settings - Dynamic Island for Windows',
      frame: true,
      autoHideMenuBar: true,
      backgroundColor: nativeTheme.shouldUseDarkColors ? '#141416' : '#f5f5f7',
      webPreferences: {
        preload: path.join(__dirname, 'settings-preload.js'),
        contextIsolation: true,
        nodeIntegration: false
      }
    });

    this.window.loadFile(path.join(__dirname, '../renderer/settings/index.html'));

    this.window.on('closed', () => {
      this.window = null;
    });

    return this.window;
  }

  isOpen() {
    return this.window && !this.window.isDestroyed();
  }
}

module.exports = new SettingsWindowManager();

