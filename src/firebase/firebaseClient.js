export class FirebaseClient {
  constructor() { this.ready = false; this.user = null; this.listeners = []; this.waitForFirebase(); }
  waitForFirebase() {
    const ok = window.db && window.auth && window.ref && window.onAuthStateChanged;
    if (!ok) { setTimeout(() => this.waitForFirebase(), 150); return; }
    this.ready = true;
    window.onAuthStateChanged(window.auth, user => { this.user = user && !user.isAnonymous ? user : null; this.listeners.forEach(fn => fn(this.user)); });
  }
  onUser(fn) { this.listeners.push(fn); if (this.ready) fn(this.user); }
  uid() { return this.user?.uid || ''; }
  loggedIn() { return !!this.uid(); }
  path(path) { return window.ref(window.db, path); }
  async get(path) { if (!this.ready) return null; const snap = await window.get(this.path(path)); return snap.val(); }
  async set(path, value) { if (!this.ready) return; return window.set(this.path(path), value); }
  async update(path, value) { if (!this.ready) return; return window.update(this.path(path), value); }
  async remove(path) { if (!this.ready) return; return window.remove(this.path(path)); }
  onValue(path, cb, err) { if (!this.ready) return () => {}; const r = this.path(path); const handler = snap => cb(snap.val()); window.onValue(r, handler, err || console.error); return () => window.off?.(r, 'value', handler); }
  async signUp(username, pass, displayName) { const email = `${username}@gamenjd.local`; const cred = await window.createUserWithEmailAndPassword(window.auth, email, pass); await this.set(`profiles/${cred.user.uid}`, { displayName, username, email, updatedAt: Date.now() }); return cred; }
  async login(username, pass) { return window.signInWithEmailAndPassword(window.auth, `${username}@gamenjd.local`, pass); }
  async logout() { return window.signOut(window.auth); }
  async reset(username) { return window.sendPasswordResetEmail(window.auth, `${username}@gamenjd.local`); }
}
export const firebaseClient = new FirebaseClient();
