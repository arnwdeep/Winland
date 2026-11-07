const os = require('os');
const { EventEmitter } = require('events');

class SystemMonitorService extends EventEmitter {
  constructor() {
    super();
    this.timer = null;
    this.prevCpuInfo = null;
  }

  start(intervalMs = 2000) {
    if (this.timer) return;
    this.prevCpuInfo = this.getCpuTimes();
    this.poll();
    this.timer = setInterval(() => this.poll(), intervalMs);
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  getCpuTimes() {
    const cpus = os.cpus();
    let idle = 0;
    let total = 0;
    for (const cpu of cpus) {
      for (const type in cpu.times) {
        total += cpu.times[type];
      }
      idle += cpu.times.idle;
    }
    return { idle, total };
  }

  calculateCpuUsage() {
    const current = this.getCpuTimes();
    if (!this.prevCpuInfo) {
      this.prevCpuInfo = current;
      return 0;
    }
    const idleDelta = current.idle - this.prevCpuInfo.idle;
    const totalDelta = current.total - this.prevCpuInfo.total;
    this.prevCpuInfo = current;
    if (totalDelta <= 0) return 0;
    const usage = Math.round((1 - idleDelta / totalDelta) * 100);
    return Math.max(0, Math.min(100, usage));
  }

  getMemoryUsage() {
    const total = os.totalmem();
    const free = os.freemem();
    const used = total - free;
    const percent = Math.round((used / total) * 100);
    return {
      usedGB: (used / (1024 ** 3)).toFixed(1),
      totalGB: (total / (1024 ** 3)).toFixed(1),
      percent
    };
  }

  poll() {
    const cpu = this.calculateCpuUsage();
    const memory = this.getMemoryUsage();
    const uptimeSec = os.uptime();
    const hours = Math.floor(uptimeSec / 3600);
    const mins = Math.floor((uptimeSec % 3600) / 60);

    const stats = {
      cpu,
      memory,
      uptime: `${hours}h ${mins}m`,
      timestamp: Date.now()
    };

    this.emit('stats', stats);
    return stats;
  }
}

module.exports = new SystemMonitorService();

