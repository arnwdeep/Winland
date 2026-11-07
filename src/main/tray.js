const { Tray, Menu, nativeImage, app } = require('electron');
const path = require('path');
const config = require('./config');
const settingsWindow = require('./settings-window');

class TrayManager {
  constructor() {
    this.tray = null;
    this.overlayManager = null;
  }

  init(overlayManager) {
    this.overlayManager = overlayManager;
    
    // Create simple 16x16 / 32x32 tray icon bitmap
    const icon = this.createTrayIcon();
    this.tray = new Tray(icon);
    this.tray.setToolTip('Winland - Dynamic Island for Windows');

    this.updateMenu();
    this.tray.on('double-click', () => {
      settingsWindow.show();
    });
  }

  createTrayIcon() {
    // Generate a clean nativeImage Dynamic Island pill icon
    // 32x32 PNG buffer with rounded pill in center
    const size = 32;
    // Create an empty nativeImage and fill
    const canvas = nativeImage.createEmpty();
    // Alternatively, generate a 16x16 or 32x32 data url
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
        <rect x="4" y="10" width="24" height="12" rx="6" fill="#000000" stroke="#ffffff" stroke-width="1.5" />
        <circle cx="10" cy="16" r="2.5" fill="#3b82f6" />
      </svg>
    `;
    const icon = nativeImage.createFromBuffer(Buffer.from(svg));
    return icon.resize({ width: 16, height: 16 });
  }

  updateMenu() {
    if (!this.tray) return;

    const enabled = config.get('enabled');
    const contextMenu = Menu.buildFromTemplate([
      {
        label: 'Winland - Dynamic Island',
        enabled: false
      },
      { type: 'separator' },
      {
        label: enabled ? 'Disable Island' : 'Enable Island',
        type: 'checkbox',
        checked: enabled,
        click: () => {
          const newVal = !config.get('enabled');
          config.set('enabled', newVal);
          if (this.overlayManager) {
            this.overlayManager.send('toggle-enabled', newVal);
          }
          this.updateMenu();
        }
      },
      {
        label: 'Settings & Customization',
        click: () => settingsWindow.show()
      },
      {
        label: 'Trigger Test Notification',
        click: () => {
          if (this.overlayManager) {
            this.overlayManager.send('notification', {
              id: Date.now().toString(),
              appName: 'Slack',
              title: 'Sarah Jenkins',
              message: 'Hey, the new design system looks incredible!',
              type: 'info',
              duration: 3500
            });
          }
        }
      },
      { type: 'separator' },
      {
        label: 'Exit Winland',
        click: () => {
          app.isQuitting = true;
          app.quit();
        }
      }
    ]);

    this.tray.setContextMenu(contextMenu);
  }
}

module.exports = new TrayManager();
