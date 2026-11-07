const fs = require('fs');
const path = require('path');
const { app } = require('electron');

const defaultSettings = {
  enabled: true,
  theme: 'system', // 'system' | 'dark' | 'light'
  pillWidth: 190,
  pillHeight: 34,
  expandedWidth: 420,
  expandedHeight: 195,
  cornerRadius: 18,
  topOffset: 10,
  autoHideDelay: 3000,
  animationSpeed: 'normal', // 'fast' | 'normal' | 'smooth'
  transparency: 0.94,
  blurIntensity: 20,
  targetDisplay: 'primary',
  startupWithWindows: false,
  modules: {
    media: true,
    systemStats: true,
    battery: true,
    volume: true,
    brightness: true,
    clipboard: true,
    timer: true,
    notifications: true,
    network: true
  }
};

class ConfigManager {
  constructor() {
    this.configPath = null;
    this.settings = { ...defaultSettings };
  }

  init() {
    const userDataPath = app.getPath('userData');
    this.configPath = path.join(userDataPath, 'winland-config.json');
    this.load();
  }

  load() {
    try {
      if (this.configPath && fs.existsSync(this.configPath)) {
        const raw = fs.readFileSync(this.configPath, 'utf8');
        const parsed = JSON.parse(raw);
        this.settings = {
          ...defaultSettings,
          ...parsed,
          modules: { ...defaultSettings.modules, ...(parsed.modules || {}) }
        };
      } else {
        this.settings = { ...defaultSettings };
        this.save();
      }
    } catch (err) {
      console.error('[Config] Failed to load config, using defaults:', err);
      this.settings = { ...defaultSettings };
    }
    return this.settings;
  }

  save() {
    try {
      if (this.configPath) {
        fs.writeFileSync(this.configPath, JSON.stringify(this.settings, null, 2), 'utf8');
      }
    } catch (err) {
      console.error('[Config] Failed to save config:', err);
    }
  }

  get(key) {
    return key ? this.settings[key] : this.settings;
  }

  set(key, value) {
    if (typeof key === 'object') {
      this.settings = {
        ...this.settings,
        ...key,
        modules: { ...this.settings.modules, ...(key.modules || {}) }
      };
    } else {
      this.settings[key] = value;
    }
    this.save();
    return this.settings;
  }
}

module.exports = new ConfigManager();

