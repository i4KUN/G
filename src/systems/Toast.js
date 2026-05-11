export class Toast {
  constructor() {
    this.el = document.getElementById('toast');
    this.timer = null;
  }

  show(message, ms = 2400) {
    if (!this.el) return;
    clearTimeout(this.timer);
    this.el.textContent = message;
    this.el.style.display = 'block';
    this.timer = setTimeout(() => {
      this.el.style.display = 'none';
    }, ms);
  }
}
