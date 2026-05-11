export class FirebaseClient {
  constructor() {
    this.ready = false;
    this.user = null;
    this.listeners = [];
    this.waitForFirebase();
  }

  waitForFirebase() {
    const ok = window.db && window.auth && window.ref && window.onAuthStateChanged;
    if (!ok) {
      setTimeout(() => this.waitForFirebase(), 150);
      return;
    }

    this.ready = true;
    window.onAuthStateChanged(window.auth, user => {
      this.user = user && !user.isAnonymous ? user : null;
      this.listeners.forEach(fn => fn(this.user));
    });
  }

  onUser(fn) {
    this.listeners.push(fn);
    if (this.ready) fn(this.user);
  }

  uid() { return this.user?.uid || ''; }
  loggedIn() { return !!this.uid(); }
  path(path) { return window.ref(window.db, path); }

  async get(path) {
    if (!this.ready) return null;
    const snap = await window.get(this.path(path));
    return snap.val();
  }

  async set(path, value) {
    if (!this.ready) return;
    return window.set(this.path(path), value);
  }

  async update(path, value) {
    if (!this.ready) return;
    return window.update(this.path(path), value);
  }

  async remove(path) {
    if (!this.ready) return;
    return window.remove(this.path(path));
  }

  onValue(path, cb, err) {
    if (!this.ready || !this.loggedIn()) return () => {};
    const r = this.path(path);
    const handler = snap => cb(snap.val());
    const onError = error => {
      if (err) err(error);
      else console.warn('Firebase read error:', path, error?.message || error);
    };
    window.onValue(r, handler, onError);
    return () => window.off?.(r, 'value', handler);
  }

  cleanUsername(username) {
    return String(username || '').trim().toLowerCase().replace(/[^a-z0-9_.-]/g, '').slice(0, 32);
  }

  localEmail(username) {
    return `${this.cleanUsername(username)}@gamenjd.local`;
  }

  async signUp(username, pass, displayName) {
    const clean = this.cleanUsername(username);
    if (!clean) throw new Error('اسم المستخدم غير صحيح');
    const email = this.localEmail(clean);
    const cred = await window.createUserWithEmailAndPassword(window.auth, email, pass);
    await this.set(`profiles/${cred.user.uid}`, {
      displayName: displayName || clean,
      username: clean,
      email,
      updatedAt: Date.now()
    });
    await this.set(`usernames/${clean}`, cred.user.uid).catch(() => {});
    return cred;
  }

  async login(username, pass) {
    return window.signInWithEmailAndPassword(window.auth, this.localEmail(username), pass);
  }

  async logout() {
    return window.signOut(window.auth);
  }

  async reset(value) {
    const text = String(value || '').trim();
    const email = text.includes('@') ? text : this.localEmail(text);
    return window.sendPasswordResetEmail(window.auth, email);
  }

  async saveDisplayName(name) {
    const uid = this.uid();
    if (!uid) return;
    const profile = await this.get(`profiles/${uid}`).catch(() => ({})) || {};
    await this.update(`profiles/${uid}`, {
      ...profile,
      displayName: String(name || '').trim().slice(0, 20),
      updatedAt: Date.now()
    });
  }

  async linkEmail(realEmail, password) {
    const user = this.user;
    if (!user) throw new Error('not-authenticated');
    const email = String(realEmail || '').trim();
    if (!email.includes('@')) throw new Error('bad-email');
    const credential = window.EmailAuthProvider.credential(user.email, password);
    await window.reauthenticateWithCredential(user, credential);
    await window.updateEmail(user, email);
    await this.update(`profiles/${user.uid}`, {
      realEmail: email,
      email,
      linkedEmailAt: Date.now(),
      updatedAt: Date.now()
    });
  }
}

export const firebaseClient = new FirebaseClient();
