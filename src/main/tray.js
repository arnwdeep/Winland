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
    
    const iconPath = path.join(__dirname, '../assets/tray-icon.ico');
    this.tray = new Tray(iconPath);
    this.tray.setToolTip('Winland - Dynamic Island for Windows');

    this.updateMenu();
    this.tray.on('double-click', () => {
      settingsWindow.show();
    });
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
              appName: 'Winland',
              title: 'Dynamic Island Active',
              message: 'Your next-gen desktop overlay is running smoothly.',
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
