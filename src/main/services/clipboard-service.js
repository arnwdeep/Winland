const { EventEmitter } = require('events');

class ClipboardService extends EventEmitter {
  constructor() {
    super();
    this.timer = null;
    this.clipboard = null;
    this.lastText = '';
    this.lastImageHash = '';
    this.history = [];
    this.maxHistory = 20;
  }

  start(clipboardRef, intervalMs = 800) {
    this.clipboard = clipboardRef;
    if (!this.clipboard) return;

    try {
      if (typeof this.clipboard.readText === 'function') {
        this.lastText = this.clipboard.readText();
      }
      if (typeof this.clipboard.readImage === 'function') {
        const img = this.clipboard.readImage();
        if (img && !img.isEmpty()) {
          this.lastImageHash = img.toDataURL().slice(0, 50);
        }
      }
    } catch (e) {}

    this.timer = setInterval(() => this.check(), intervalMs);
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  check() {
    if (!this.clipboard) return;
    try {
      if (typeof this.clipboard.readText === 'function') {
        const currentText = this.clipboard.readText();
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
      }

      if (typeof this.clipboard.readImage === 'function') {
        const currentImage = this.clipboard.readImage();
        if (currentImage && !currentImage.isEmpty()) {
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
      }
    } catch (err) {
      // Ignore transient clipboard access errors
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
