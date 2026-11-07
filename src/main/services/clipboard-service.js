const { clipboard } = require('electron');
const { EventEmitter } = require('events');

class ClipboardService extends EventEmitter {
  constructor() {
    super();
    this.timer = null;
    this.lastText = '';
    this.lastImageHash = '';
    this.history = [];
    this.maxHistory = 20;
  }

  start(intervalMs = 800) {
    this.lastText = clipboard.readText();
    const img = clipboard.readImage();
    this.lastImageHash = img.isEmpty() ? '' : img.toDataURL().slice(0, 50);

    this.timer = setInterval(() => this.check(), intervalMs);
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  check() {
    try {
      const currentText = clipboard.readText();
      const currentImage = clipboard.readImage();

      if (currentText && currentText !== this.lastText) {
        this.lastText = currentText;
        const preview = currentText.length > 60 ? currentText.substring(0, 60) + '...' : currentText;
        const entry = {
          id: Date.now().toString(),
          type: 'text',
          content: currentText,
          preview,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        this.addHistory(entry);
        this.emit('copy', entry);
        return;
      }

      if (!currentImage.isEmpty()) {
        const dataUrl = currentImage.toDataURL();
        const hash = dataUrl.slice(0, 50);
        if (hash !== this.lastImageHash) {
          this.lastImageHash = hash;
          const entry = {
            id: Date.now().toString(),
            type: 'image',
            content: dataUrl,
            preview: 'Image copied to clipboard',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          };
          this.addHistory(entry);
          this.emit('copy', entry);
        }
      }
    } catch (err) {
      // Ignore transient clipboard access errors (e.g. locked by another app)
    }
  }

  addHistory(entry) {
    this.history.unshift(entry);
    if (this.history.length > this.maxHistory) {
      this.history.pop();
    }
    this.emit('history-updated', this.history);
  }

  getHistory() {
    return this.history;
  }

  clearHistory() {
    this.history = [];
    this.emit('history-updated', this.history);
  }
}

module.exports = new ClipboardService();
