export class DialogSystem {
  constructor() {
    this.modal = document.getElementById('dialogModal');
    this.title = document.getElementById('dialogTitle');
    this.text = document.getElementById('dialogText');
    this.actions = document.getElementById('dialogActions');
  }

  show(title, text, actions = []) {
    this.title.textContent = title;
    this.text.textContent = text;
    this.actions.innerHTML = '';
    actions.forEach(action => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = action.className || 'mainBtn';
      btn.innerHTML = action.html || action.label;
      btn.onclick = () => {
        if (action.close !== false) this.close();
        action.onClick?.();
      };
      this.actions.appendChild(btn);
    });
    this.modal.classList.remove('hidden');
  }

  close() { this.modal.classList.add('hidden'); }
}
