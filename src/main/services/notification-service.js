const { EventEmitter } = require('events');

class NotificationService extends EventEmitter {
  constructor() {
    super();
    this.queue = [];
  }

  notify({ id, appName, title, message, icon, type = 'info', duration = 3500 }) {
    const notification = {
      id: id || Date.now().toString(),
      appName: appName || 'System',
      title: title || 'Notification',
      message: message || '',
      icon: icon || 'bell',
      type, // 'info' | 'warning' | 'success' | 'media' | 'battery' | 'clipboard'
      duration,
      timestamp: Date.now()
    };

    this.emit('notification', notification);
    return notification;
  }
}

module.exports = new NotificationService();
