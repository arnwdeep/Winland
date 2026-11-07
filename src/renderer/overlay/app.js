// Winland Dynamic Island Overlay Controller

const island = document.getElementById('island');
const viewIdle = document.getElementById('view-idle');
const viewVolume = document.getElementById('view-volume');
const viewNotification = document.getElementById('view-notification');
const viewClipboard = document.getElementById('view-clipboard');
const viewExpanded = document.getElementById('view-expanded');

let currentState = 'idle';
let stateTimeout = null;
let currentConfig = null;
let isInteracting = false;

function setInteractiveSafe(val) {
  if (window.api && typeof window.api.setInteractive === 'function') {
    try {
      window.api.setInteractive(val);
    } catch (e) {}
  }
}

// Initialize
async function init() {
  setupClock();
  setupEventListeners();
  setupIPCListeners();
  setupTabs();
  setupTimer();

  // Load config
  if (window.api && window.api.getConfig) {
    currentConfig = await window.api.getConfig();
    applyConfig(currentConfig);
  }
}

// State Machine
function setState(newState, duration = 0) {
  if (stateTimeout) {
    clearTimeout(stateTimeout);
    stateTimeout = null;
  }

  currentState = newState;

  // Dynamically resize Electron window bounds to perfectly wrap island
  const dimensionMap = {
    idle: { width: 230, height: 54 },
    volume: { width: 310, height: 62 },
    clipboard: { width: 350, height: 66 },
    notification: { width: 410, height: 92 },
    expanded: { width: 460, height: 235 }
  };

  if (window.api && window.api.resizeWindow && dimensionMap[newState]) {
    window.api.resizeWindow(dimensionMap[newState]);
  }

  // Update DOM classes
  island.className = `island state-${newState}`;

  // Hide all views first
  viewIdle.style.display = 'none';
  viewVolume.style.display = 'none';
  viewNotification.style.display = 'none';
  viewClipboard.style.display = 'none';
  viewExpanded.style.display = 'none';

  // Show active view
  if (newState === 'idle') {
    viewIdle.style.display = 'flex';
  } else if (newState === 'volume') {
    viewVolume.style.display = 'flex';
  } else if (newState === 'notification') {
    viewNotification.style.display = 'flex';
  } else if (newState === 'clipboard') {
    viewClipboard.style.display = 'flex';
  } else if (newState === 'expanded') {
    viewExpanded.style.display = 'flex';
    refreshClipboardHistory();
  }

  // Auto-revert to idle if temporary state
  if (duration > 0 && newState !== 'expanded') {
    stateTimeout = setTimeout(() => {
      setState('idle');
    }, duration);
  }
}

// Mouse and Interactive management
function setupEventListeners() {
  island.addEventListener('mouseenter', () => {
    isInteracting = true;
    setInteractiveSafe(true);
  });

  island.addEventListener('mouseleave', () => {
    isInteracting = false;
    if (currentState === 'expanded') {
      // Keep interactive while expanded until user clicks away
      return;
    }
    // Release mouse events back to windows behind
    setTimeout(() => {
      if (!isInteracting && currentState === 'idle') {
        setInteractiveSafe(false);
      }
    }, 150);
  });

  island.addEventListener('click', (e) => {
    // If clicking a button or input inside expanded view, don't collapse
    if (e.target.closest('button') || e.target.closest('.clip-item') || e.target.closest('.track-progress-bar')) {
      return;
    }

    if (currentState === 'idle') {
      setState('expanded');
      setInteractiveSafe(true);
    } else if (currentState === 'expanded') {
      setState('idle');
      setInteractiveSafe(false);
    }
  });

  // Settings button
  const btnSettings = document.getElementById('btn-open-settings');
  if (btnSettings) {
    btnSettings.addEventListener('click', (e) => {
      e.stopPropagation();
      if (window.api) window.api.openSettings();
    });
  }

  // Media controls
  document.getElementById('media-play').addEventListener('click', (e) => {
    e.stopPropagation();
    if (window.api) window.api.sendMediaKey('playPause');
  });

  document.getElementById('media-next').addEventListener('click', (e) => {
    e.stopPropagation();
    if (window.api) window.api.sendMediaKey('next');
  });

  document.getElementById('media-prev').addEventListener('click', (e) => {
    e.stopPropagation();
    if (window.api) window.api.sendMediaKey('prev');
  });
}

// Setup IPC Listeners
function setupIPCListeners() {
  if (!window.api) return;

  // Blur auto-collapse
  if (window.api.onBlurCollapse) {
    window.api.onBlurCollapse(() => {
      if (currentState === 'expanded') {
        setState('idle');
      }
    });
  }

  // Global toggle expand
  if (window.api.onToggleExpand) {
    window.api.onToggleExpand(() => {
      setState(currentState === 'expanded' ? 'idle' : 'expanded');
    });
  }

  // Toggle expand hotkey
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && currentState === 'expanded') {
      setState('idle');
    }
  });

  // System Stats
  window.api.onSystemStats((stats) => {
    const cpuVal = `${stats.cpu}%`;
    const ramVal = `${stats.memory.percent}%`;
    document.getElementById('stat-cpu-val').textContent = cpuVal;
    document.getElementById('stat-cpu-bar').style.width = cpuVal;
    document.getElementById('stat-ram-val').textContent = ramVal;
    document.getElementById('stat-ram-bar').style.width = ramVal;
    document.getElementById('stat-uptime-val').textContent = stats.uptime;
  });

  // Battery
  window.api.onBatteryChange((bat) => {
    const text = `${bat.percent}%`;
    document.getElementById('idle-battery-text').textContent = text;
    document.getElementById('stat-battery-val').textContent = text;
    document.getElementById('stat-battery-status').textContent = bat.status;
    const fillWidth = Math.max(2, Math.round((bat.percent / 100) * 12));
    document.getElementById('battery-fill').setAttribute('width', fillWidth.toString());
  });

  // Volume
  window.api.onVolumeChange((vol) => {
    const fill = document.getElementById('volume-bar-fill');
    const valText = document.getElementById('volume-val-text');
    fill.style.width = `${vol.volume}%`;
    valText.textContent = vol.isMuted ? 'Muted' : `${vol.volume}%`;

    // Trigger Dynamic Island Volume HUD
    if (currentState !== 'expanded') {
      setInteractiveSafe(true);
      setState('volume', 2500);
      setTimeout(() => {
        if (!isInteracting && currentState === 'idle') {
          setInteractiveSafe(false);
        }
      }, 2600);
    }
  });

  // Media
  window.api.onMediaChange((track) => {
    document.getElementById('media-title').textContent = track.title || 'No Title';
    document.getElementById('media-artist').textContent = track.artist || 'Media Player';
    const playIcon = document.getElementById('play-icon');
    const pauseIcon = document.getElementById('pause-icon');
    const visualizer = document.getElementById('visualizer-bars');

    if (track.isPlaying) {
      playIcon.style.display = 'none';
      pauseIcon.style.display = 'block';
      visualizer.style.display = 'flex';
      document.getElementById('idle-status-text').textContent = track.title ? track.title.substring(0, 10) : 'Playing';
    } else {
      playIcon.style.display = 'block';
      pauseIcon.style.display = 'none';
      visualizer.style.display = 'none';
      document.getElementById('idle-status-text').textContent = 'Winland';
    }
  });

  // Clipboard
  window.api.onClipboardCopy((clip) => {
    document.getElementById('clip-preview-text').textContent = clip.preview;
    if (currentState !== 'expanded') {
      setInteractiveSafe(true);
      setState('clipboard', 2800);
      setTimeout(() => {
        if (!isInteracting && currentState === 'idle') {
          setInteractiveSafe(false);
        }
      }, 2900);
    }
  });

  // Notifications
  window.api.onNotification((notif) => {
    document.getElementById('notif-app-name').textContent = notif.appName;
    document.getElementById('notif-title').textContent = notif.title;
    document.getElementById('notif-msg').textContent = notif.message;
    document.getElementById('notif-app-icon').textContent = notif.icon === 'warning' ? '⚠️' : '🔔';

    setInteractiveSafe(true);
    setState('notification', notif.duration || 3500);
    setTimeout(() => {
      if (!isInteracting && currentState === 'idle') {
        setInteractiveSafe(false);
      }
    }, (notif.duration || 3500) + 100);
  });

  // Config change
  window.api.onConfigChange((newConfig) => {
    applyConfig(newConfig);
  });
}

// Config Applier
function applyConfig(cfg) {
  if (!cfg) return;
  currentConfig = cfg;

  // Theme
  if (cfg.theme === 'light') {
    document.body.className = 'theme-light';
  } else if (cfg.theme === 'dark') {
    document.body.className = 'theme-dark';
  } else {
    // System default
    const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    document.body.className = isDark ? 'theme-dark' : 'theme-light';
  }

  // Corner radius & offsets
  if (cfg.cornerRadius) {
    island.style.setProperty('--corner-radius', `${cfg.cornerRadius}px`);
  }
}

// Clock Setup
function setupClock() {
  const clockEl = document.getElementById('idle-clock');
  function updateTime() {
    const now = new Date();
    clockEl.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  updateTime();
  setInterval(updateTime, 1000);
}

// Tab Switching
function setupTabs() {
  const tabs = document.querySelectorAll('.tab-btn[data-tab]');
  const panes = document.querySelectorAll('.tab-pane');

  tabs.forEach(tab => {
    tab.addEventListener('click', (e) => {
      e.stopPropagation();
      const target = tab.getAttribute('data-tab');
      tabs.forEach(t => t.classList.remove('active'));
      panes.forEach(p => p.classList.remove('active'));
      tab.classList.add('active');
      const pane = document.getElementById(target);
      if (pane) pane.classList.add('active');
    });
  });
}

// Clipboard History Refresh
async function refreshClipboardHistory() {
  if (!window.api || !window.api.getClipboardHistory) return;
  const history = await window.api.getClipboardHistory();
  const listEl = document.getElementById('clipboard-list');
  if (!history || history.length === 0) {
    listEl.innerHTML = '<div class="clip-empty">No items copied yet.</div>';
    return;
  }

  listEl.innerHTML = '';
  history.forEach(item => {
    const div = document.createElement('div');
    div.className = 'clip-item';
    div.innerHTML = `
      <span class="clip-item-text">${escapeHtml(item.preview)}</span>
      <span style="font-size: 10px; opacity: 0.6;">${item.timestamp}</span>
    `;
    div.addEventListener('click', (e) => {
      e.stopPropagation();
      window.api.copyText(item.content);
      div.style.background = 'rgba(16, 185, 129, 0.3)';
      setTimeout(() => div.style.background = '', 400);
    });
    listEl.appendChild(div);
  });
}

// Focus / Pomodoro Timer
let timerSeconds = 1500;
let timerInterval = null;
let isTimerRunning = false;

function setupTimer() {
  const display = document.getElementById('focus-display');
  const btnToggle = document.getElementById('btn-toggle-timer');
  const btnReset = document.getElementById('btn-reset-timer');
  const presets = document.querySelectorAll('.preset-btn');

  function renderTimer() {
    const mins = Math.floor(timerSeconds / 60).toString().padStart(2, '0');
    const secs = (timerSeconds % 60).toString().padStart(2, '0');
    display.textContent = `${mins}:${secs}`;
  }

  presets.forEach(p => {
    p.addEventListener('click', (e) => {
      e.stopPropagation();
      presets.forEach(b => b.classList.remove('active'));
      p.classList.add('active');
      timerSeconds = parseInt(p.getAttribute('data-time'), 10);
      if (isTimerRunning) {
        clearInterval(timerInterval);
        isTimerRunning = false;
        btnToggle.textContent = 'Start';
      }
      renderTimer();
    });
  });

  btnToggle.addEventListener('click', (e) => {
    e.stopPropagation();
    if (isTimerRunning) {
      clearInterval(timerInterval);
      isTimerRunning = false;
      btnToggle.textContent = 'Start';
    } else {
      isTimerRunning = true;
      btnToggle.textContent = 'Pause';
      timerInterval = setInterval(() => {
        if (timerSeconds > 0) {
          timerSeconds--;
          renderTimer();
        } else {
          clearInterval(timerInterval);
          isTimerRunning = false;
          btnToggle.textContent = 'Start';
          // Trigger completion notification
          if (window.api) {
            window.api.onNotification({
              appName: 'Focus Session',
              title: 'Time is Up! 🎉',
              message: 'Great work! Take a break or start your next session.',
              type: 'success',
              duration: 5000
            });
          }
        }
      }, 1000);
    }
  });

  btnReset.addEventListener('click', (e) => {
    e.stopPropagation();
    if (isTimerRunning) {
      clearInterval(timerInterval);
      isTimerRunning = false;
      btnToggle.textContent = 'Start';
    }
    const activePreset = document.querySelector('.preset-btn.active');
    timerSeconds = activePreset ? parseInt(activePreset.getAttribute('data-time'), 10) : 1500;
    renderTimer();
  });

  renderTimer();
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Start
init();

