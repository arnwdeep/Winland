# Winland 🏝️
> **Dynamic Island for Windows (Windows 10 & Windows 11)**  
> Next-Gen Desktop Experience inspired by Apple's Dynamic Island and Windows 11 Fluent Design.

---

## ✨ Features

- **Floating System-Wide Overlay**:
  - Borderless, transparent, non-activating always-on-top window positioned top-center.
  - **Smart Mouse Passthrough**: Mouse clicks pass through seamlessly to underlying applications (browsers, IDEs, games) when idle.
  - Multi-monitor support and screen metric change handling.

- **Organic Pill Morphing & Spring Physics**:
  - Fluid spring animations targeting 60 FPS+.
  - **Idle State**: Minimal, unobtrusive pill with system clock, live pulsing indicator, and battery gauge.
  - **Hover Glance & Expand**: Expands dynamically on hover or click into a multi-tab dashboard.
  - **Dynamic Popups & Heads-Up Alerts**:
    - 🔊 **Hardware Volume HUD**: Animated slider with percentage indicator.
    - 🔔 **System Notifications**: App badge, title, message, and auto-dismiss.
    - 📋 **Instant Clipboard HUD**: Live preview of copied text and images.
    - ⚡ **Power Alerts**: Charging connection status and low battery warnings.

- **Rich Integrated Modules**:
  - 🎵 **Media Player**: Windows Media Session integration (Spotify, Chrome, Edge, Media Player), playback controls (Play/Pause, Next, Prev), and animated audio visualizer waves.
  - ⚡ **System Monitor**: Real-time CPU usage, RAM utilization, and system uptime.
  - ⏱️ **Focus & Pomodoro Timer**: 5m, 25m, 45m presets with completion alarms.
  - 📋 **Clipboard Manager**: One-click re-copy history.

- **Mica & Acrylic Styling**:
  - Dark Mode (Matte OLED black, subtle border glow).
  - Light Mode (Frosted glassmorphism with ambient shadows).
  - System Theme Auto-detection without app restart.

- **Customization Dashboard**:
  - Dedicated Fluent Design settings window.
  - Toggle modules, adjust corner radius, top screen offset, auto-hide duration, animation speed, and monitor selection.
  - Live test triggers to preview every animation.
  - Launch at Windows Startup support.

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- Windows 10 or Windows 11

### Running in Development
```bash
npm install
npm start
```

### Packaging Windows Installer (.exe)
```bash
npm run build
```
The installer will be generated in `dist/Winland Setup 1.0.0.exe`.

---

## ⌨️ Shortcuts & Controls
- **Click Island**: Toggle Expanded Dashboard
- **Hover Island**: Glance preview
- **Alt + Shift + I**: Global shortcut to expand/collapse island
- **Double-click Tray Icon**: Open Settings & Customization
- **Right-click Tray Icon**: Quick menu (Toggle Island, Settings, Test Alert, Exit)

---

## 📄 License
MIT © [Arnadeep](https://github.com/arnwdeep)
