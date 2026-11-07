const { BrowserWindow, screen, ipcMain } = require('electron');
const path = require('path');
const config = require('./config');

class OverlayManager {
  constructor() {
    this.window = null;
    this.currentWidth = 230;
    this.currentHeight = 54;
  }

  create() {
    if (this.window) return this.window;

    const display = this.getTargetDisplay();
    const { x, y, width } = display.bounds;
    const topOffset = config.get('topOffset') || 10;

    const winX = Math.round(x + (width - this.currentWidth) / 2);
    const winY = y + topOffset;

    this.window = new BrowserWindow({
      x: winX,
      y: winY,
      width: this.currentWidth,
      height: this.currentHeight,
      frame: false,
      transparent: true,
      hasShadow: false,
      alwaysOnTop: true,
      skipTaskbar: true,
      resizable: false,
      show: true,
      webPreferences: {
        preload: path.join(__dirname, 'preload.js'),
        contextIsolation: true,
        nodeIntegration: false
      }
    });

    this.window.setAlwaysOnTop(true);
    this.window.setVisibleOnAllWorkspaces(true);

    this.window.loadFile(path.join(__dirname, '../renderer/overlay/index.html'));

    this.window.show();
    this.reposition(this.currentWidth, this.currentHeight);

    this.window.on('closed', () => {
      console.log('Overlay window closed');
      this.window = null;
    });

    this.window.webContents.on('render-process-gone', (e, details) => {
      console.error('Overlay render-process-gone:', details);
    });

    // When clicking outside while expanded, collapse to idle
    this.window.on('blur', () => {
      this.send('blur-collapse');
    });

    // Screen metric changes
    screen.on('display-metrics-changed', () => this.reposition(this.currentWidth, this.currentHeight));
    screen.on('display-added', () => this.reposition(this.currentWidth, this.currentHeight));
    screen.on('display-removed', () => this.reposition(this.currentWidth, this.currentHeight));

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

  reposition(width = this.currentWidth, height = this.currentHeight) {
    if (!this.window || this.window.isDestroyed()) return;

    this.currentWidth = width;
    this.currentHeight = height;

    const display = this.getTargetDisplay();
    const { x, y, width: dispW } = display.bounds;
    const topOffset = config.get('topOffset') || 10;

    const winX = Math.round(x + (dispW - width) / 2);
    const winY = y + topOffset;

    try {
      const fs = require('fs');
      const path = require('path');
      fs.appendFileSync(path.join(__dirname, '../../debug_main.log'), `[Reposition] bounds: ${JSON.stringify(display.bounds)}, winX: ${winX}, winY: ${winY}, width: ${width}, height: ${height}\n`);
    } catch (e) {}

    this.window.setBounds({
      x: winX,
      y: winY,
      width,
      height
    });
  }

  setInteractive(interactive) {
    if (!this.window || this.window.isDestroyed()) return;
    try {
      if (interactive) {
        this.window.setIgnoreMouseEvents(false);
      } else {
        this.window.setIgnoreMouseEvents(true, { forward: true });
      }
    } catch (e) {}
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
