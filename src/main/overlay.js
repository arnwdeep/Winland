const { BrowserWindow, screen, ipcMain } = require('electron');
const path = require('path');
const config = require('./config');

class OverlayManager {
  constructor() {
    this.window = null;
    this.isExpanded = false;
    this.overlayWidth = 600;
    this.overlayHeight = 380;
  }

  create() {
    if (this.window) return this.window;

    const display = this.getTargetDisplay();
    const { x, y, width } = display.bounds;

    const winX = Math.round(x + (width - this.overlayWidth) / 2);
    const winY = y; // At the very top edge of the display

    this.window = new BrowserWindow({
      x: winX,
      y: winY,
      width: this.overlayWidth,
      height: this.overlayHeight,
      frame: false,
      transparent: true,
      hasShadow: false,
      alwaysOnTop: true,
      skipTaskbar: true,
      resizable: false,
      focusable: false, // Don't steal focus
      show: false,
      webPreferences: {
        preload: path.join(__dirname, 'preload.js'),
        contextIsolation: true,
        nodeIntegration: false
      }
    });

    // Make window stay above full-screen and standard windows
    this.window.setAlwaysOnTop(true, 'screen-saver', 1);
    this.window.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

    // Initial click-through: ignore mouse events on transparent regions
    this.window.setIgnoreMouseEvents(true, { forward: true });

    this.window.loadFile(path.join(__dirname, '../renderer/overlay/index.html'));

    this.window.once('ready-to-show', () => {
      this.window.show();
      this.reposition();
    });

    // Handle screen display metric changes
    screen.on('display-metrics-changed', () => this.reposition());
    screen.on('display-added', () => this.reposition());
    screen.on('display-removed', () => this.reposition());

    return this.window;
  }

  getTargetDisplay() {
    const displays = screen.getAllDisplays();
    const target = config.get('targetDisplay');

    if (target === 'primary' || !target) {
      return screen.getPrimaryDisplay();
    }
    const idx = parseInt(target, 10);
    if (!isNaN(idx) && displays[idx]) {
      return displays[idx];
    }
    return screen.getPrimaryDisplay();
  }

  reposition() {
    if (!this.window || this.window.isDestroyed()) return;

    const display = this.getTargetDisplay();
    const { x, y, width } = display.bounds;

    const winX = Math.round(x + (width - this.overlayWidth) / 2);
    const winY = y;

    this.window.setBounds({
      x: winX,
      y: winY,
      width: this.overlayWidth,
      height: this.overlayHeight
    });
  }

  setInteractive(interactive) {
    if (!this.window || this.window.isDestroyed()) return;
    if (interactive) {
      this.window.setIgnoreMouseEvents(false);
    } else {
      this.window.setIgnoreMouseEvents(true, { forward: true });
    }
  }

  send(channel, data) {
    if (this.window && !this.window.isDestroyed() && this.window.webContents) {
      try {
        const payload = data !== undefined ? JSON.parse(JSON.stringify(data)) : null;
        this.window.webContents.send(channel, payload);
      } catch (err) {
        console.warn(`[Overlay] Failed to serialize payload for ${channel}:`, err.message);
      }
    }
  }

  destroy() {
    if (this.window && !this.window.isDestroyed()) {
      this.window.destroy();
      this.window = null;
    }
  }
}

module.exports = new OverlayManager();

