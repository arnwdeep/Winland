const { powerMonitor } = require('electron');
const { exec } = require('child_process');
const { EventEmitter } = require('events');

class BatteryService extends EventEmitter {
  constructor() {
    super();
    this.pollTimer = null;
    this.lastState = {
      hasBattery: false,
      percent: 100,
      isCharging: true,
      status: 'AC Connected'
    };
  }

  init() {
    try {
      powerMonitor.on('on-ac', () => {
        this.lastState.isCharging = true;
        this.lastState.status = 'Charging';
        this.emit('change', this.lastState);
        this.queryBattery();
      });

      powerMonitor.on('on-battery', () => {
        this.lastState.isCharging = false;
        this.lastState.status = 'On Battery';
        this.emit('change', this.lastState);
        this.queryBattery();
      });
    } catch (e) {
      console.warn('[BatteryService] powerMonitor setup failed:', e.message);
    }

    this.queryBattery();
    this.pollTimer = setInterval(() => this.queryBattery(), 30000);
  }

  queryBattery() {
    const psCmd = `powershell -NoProfile -Command "Get-CimInstance -ClassName Win32_Battery | Select-Object -Property EstimatedChargeRemaining, BatteryStatus | ConvertTo-Json"`;
    exec(psCmd, { timeout: 4000 }, (err, stdout) => {
      if (err || !stdout.trim()) {
        // Desktop machine or no battery
        this.lastState = {
          hasBattery: false,
          percent: 100,
          isCharging: true,
          status: 'Desktop (AC Power)'
        };
        this.emit('change', this.lastState);
        return;
      }

      try {
        const data = JSON.parse(stdout);
        const percent = data.EstimatedChargeRemaining !== undefined ? data.EstimatedChargeRemaining : 100;
        // BatteryStatus: 2 = Unknown/AC, 6 = Charging, 1 = Discharging
        const isCharging = data.BatteryStatus === 2 || data.BatteryStatus === 6;
        
        const previousPercent = this.lastState.percent;
        this.lastState = {
          hasBattery: true,
          percent,
          isCharging,
          status: isCharging ? (percent >= 100 ? 'Fully Charged' : 'Charging') : 'On Battery'
        };

        // Alert on low battery (< 20%)
        if (this.lastState.hasBattery && !this.lastState.isCharging && percent <= 20 && previousPercent > 20) {
          this.emit('low-battery', this.lastState);
        }

        this.emit('change', this.lastState);
      } catch (parseErr) {
        // Fallback
      }
    });
  }

  getState() {
    return this.lastState;
  }

  destroy() {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }
}

module.exports = new BatteryService();

