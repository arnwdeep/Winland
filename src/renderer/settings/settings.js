// Winland Settings Dashboard Logic

let currentConfig = null;

async function init() {
  setupNavigation();
  setupTestTriggers();

  if (window.settingsApi) {
    currentConfig = await window.settingsApi.getConfig();
    populateForm(currentConfig);
    loadDisplays();
    setupChangeListeners();
  }
}

// Navigation between setting pages
function setupNavigation() {
  const navItems = document.querySelectorAll('.nav-item');
  const sections = document.querySelectorAll('.page-section');

  navItems.forEach(item => {
    item.addEventListener('click', () => {
      const target = item.getAttribute('data-page');
      navItems.forEach(n => n.classList.remove('active'));
      sections.forEach(s => s.classList.remove('active'));

      item.classList.add('active');
      const section = document.getElementById(target);
      if (section) section.classList.add('active');
    });
  });
}

// Populate UI with loaded settings
function populateForm(cfg) {
  if (!cfg) return;

  // General
  document.getElementById('chk-enabled').checked = !!cfg.enabled;
  document.getElementById('chk-startup').checked = !!cfg.startupWithWindows;
  document.getElementById('range-autohide').value = cfg.autoHideDelay || 3000;
  document.getElementById('val-autohide').textContent = `${(cfg.autoHideDelay || 3000) / 1000}s`;

  // Appearance
  document.getElementById('range-topoffset').value = cfg.topOffset || 10;
  document.getElementById('val-topoffset').textContent = `${cfg.topOffset || 10}px`;
  document.getElementById('range-radius').value = cfg.cornerRadius || 18;
  document.getElementById('val-radius').textContent = `${cfg.cornerRadius || 18}px`;

  // Theme buttons
  const themeBtns = document.querySelectorAll('.theme-btn');
  themeBtns.forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-theme') === (cfg.theme || 'system'));
  });

  // Animation select
  document.getElementById('select-animation').value = cfg.animationSpeed || 'normal';

  // Modules
  const mods = cfg.modules || {};
  document.getElementById('mod-media').checked = mods.media !== false;
  document.getElementById('mod-volume').checked = mods.volume !== false;
  document.getElementById('mod-clipboard').checked = mods.clipboard !== false;
  document.getElementById('mod-system').checked = mods.systemStats !== false;
  document.getElementById('mod-battery').checked = mods.battery !== false;
  document.getElementById('mod-timer').checked = mods.timer !== false;
}

// Load Displays
async function loadDisplays() {
  const select = document.getElementById('select-display');
  if (!window.settingsApi || !window.settingsApi.getDisplays) return;

  const displays = await window.settingsApi.getDisplays();
  select.innerHTML = '<option value="primary">Primary Display</option>';
  displays.forEach(d => {
    const opt = document.createElement('option');
    opt.value = d.index.toString();
    opt.textContent = d.label;
    if (currentConfig && currentConfig.targetDisplay === d.index.toString()) {
      opt.selected = true;
    }
    select.appendChild(opt);
  });
}

// Setup Change Listeners to save in real time
function setupChangeListeners() {
  function save() {
    const newConfig = {
      ...currentConfig,
      enabled: document.getElementById('chk-enabled').checked,
      startupWithWindows: document.getElementById('chk-startup').checked,
      targetDisplay: document.getElementById('select-display').value,
      autoHideDelay: parseInt(document.getElementById('range-autohide').value, 10),
      topOffset: parseInt(document.getElementById('range-topoffset').value, 10),
      cornerRadius: parseInt(document.getElementById('range-radius').value, 10),
      animationSpeed: document.getElementById('select-animation').value,
      modules: {
        media: document.getElementById('mod-media').checked,
        volume: document.getElementById('mod-volume').checked,
        clipboard: document.getElementById('mod-clipboard').checked,
        systemStats: document.getElementById('mod-system').checked,
        battery: document.getElementById('mod-battery').checked,
        timer: document.getElementById('mod-timer').checked
      }
    };

    if (window.settingsApi && window.settingsApi.saveConfig) {
      window.settingsApi.saveConfig(newConfig);
    }
  }

  // Sliders
  document.getElementById('range-autohide').addEventListener('input', (e) => {
    document.getElementById('val-autohide').textContent = `${e.target.value / 1000}s`;
    save();
  });

  document.getElementById('range-topoffset').addEventListener('input', (e) => {
    document.getElementById('val-topoffset').textContent = `${e.target.value}px`;
    save();
  });

  document.getElementById('range-radius').addEventListener('input', (e) => {
    document.getElementById('val-radius').textContent = `${e.target.value}px`;
    save();
  });

  // Selects & Checkboxes
  document.getElementById('chk-enabled').addEventListener('change', save);
  document.getElementById('chk-startup').addEventListener('change', save);
  document.getElementById('select-display').addEventListener('change', save);
  document.getElementById('select-animation').addEventListener('change', save);

  ['mod-media', 'mod-volume', 'mod-clipboard', 'mod-system', 'mod-battery', 'mod-timer'].forEach(id => {
    document.getElementById(id).addEventListener('change', save);
  });

  // Theme Picker
  const themeBtns = document.querySelectorAll('.theme-btn');
  themeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      themeBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const theme = btn.getAttribute('data-theme');
      currentConfig.theme = theme;
      if (window.settingsApi && window.settingsApi.saveConfig) {
        window.settingsApi.saveConfig({ ...currentConfig, theme });
      }
    });
  });
}

// Test Triggers
function setupTestTriggers() {
  document.getElementById('btn-test-notif').addEventListener('click', () => {
    if (window.settingsApi) {
      window.settingsApi.triggerTestNotification({
        id: 'test-' + Date.now(),
        appName: 'Slack',
        title: 'Design Team',
        message: 'The new Windows Dynamic Island animation looks stellar! ✨',
        type: 'info',
        duration: 3800
      });
    }
  });

  document.getElementById('btn-test-volume').addEventListener('click', () => {
    if (window.settingsApi) {
      window.settingsApi.triggerTestVolume(75);
    }
  });

  document.getElementById('btn-test-battery').addEventListener('click', () => {
    if (window.settingsApi) {
      window.settingsApi.triggerTestNotification({
        id: 'test-bat-' + Date.now(),
        appName: 'Power Management',
        title: 'Low Battery Alert',
        message: '15% battery remaining. Plug into power to keep working.',
        type: 'warning',
        duration: 4500
      });
    }
  });

  document.getElementById('btn-test-media').addEventListener('click', () => {
    if (window.settingsApi) {
      window.settingsApi.triggerTestMedia();
    }
  });
}

init();
