import { VERSION } from '../config.js';

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js';
import { getDatabase, ref, set, onValue, remove, get, update, off } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-database.js';
import { initializeAppCheck, ReCaptchaV3Provider } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-app-check.js';
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  updateEmail,
  reauthenticateWithCredential,
  EmailAuthProvider
} from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js';

const firebaseConfig = {
  apiKey: 'AIzaSyD7-Ge0zjrsJNqEL4hAx3JSU0Cb-PUhlOg',
  authDomain: 'gamenjd-0001.firebaseapp.com',
  databaseURL: 'https://gamenjd-0001-default-rtdb.firebaseio.com',
  projectId: 'gamenjd-0001',
  storageBucket: 'gamenjd-0001.firebasestorage.app',
  messagingSenderId: '1076362661145',
  appId: '1:1076362661145:web:4c171f17ec05854b324988'
};

const APP_CHECK_SITE_KEY = '6LfkJ-EsAAAAAEtlqyG7OUaKms-qTgKhktaMjkHD';

function safeText(value, max = 40) {
  return String(value || '').replace(/[<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, max);
}

function usernameClean(value) {
  return String(value || '').trim().toLowerCase();
}

function usernameToEmail(username) {
  return `${usernameClean(username)}@gamenjd.local`;
}

function emailToUsername(email) {
  const text = String(email || '');
  return text.endsWith('@gamenjd.local') ? text.replace('@gamenjd.local', '') : text;
}

export class FirebaseService extends EventTarget {
  constructor() {
    super();
    this.app = initializeApp(firebaseConfig);
    try {
      initializeAppCheck(this.app, {
        provider: new ReCaptchaV3Provider(APP_CHECK_SITE_KEY),
        isTokenAutoRefreshEnabled: true
      });
    } catch (err) {
      console.warn('AppCheck skipped:', err);
    }

    this.db = getDatabase(this.app);
    this.auth = getAuth(this.app);
    this.user = null;
    this.profile = null;
    this.unsubs = [];
  }

  startAuthListener() {
    onAuthStateChanged(this.auth, async user => {
      this.user = user || null;
      if (!user) {
        this.profile = null;
        this.dispatchEvent(new CustomEvent('auth', { detail: { user: null, profile: null } }));
        return;
      }
      const profile = await this.getProfile(user.uid);
      this.profile = profile || { username: emailToUsername(user.email), name: emailToUsername(user.email) };
      this.dispatchEvent(new CustomEvent('auth', { detail: { user, profile: this.profile } }));
    });
  }

  uid() { return this.user?.uid || ''; }
  isLoggedIn() { return !!this.user; }

  async signup({ username, password, name }) {
    const clean = usernameClean(username);
    if (!/^[a-z0-9_]{3,20}$/.test(clean)) throw new Error('اكتب يوزر إنجليزي من 3 إلى 20 حرفًا');
    if (String(password || '').length < 6) throw new Error('كلمة المرور يجب أن تكون 6 أحرف أو أكثر');
    const userRef = ref(this.db, `usernames/${clean}`);
    const exists = await get(userRef);
    if (exists.exists()) throw new Error('اسم المستخدم مستخدم');
    const result = await createUserWithEmailAndPassword(this.auth, usernameToEmail(clean), password);
    const profile = { uid: result.user.uid, username: clean, name: safeText(name || clean, 20), character: 'woman-1', createdAt: Date.now(), version: VERSION };
    await set(ref(this.db, `profiles/${result.user.uid}`), profile);
    await set(userRef, result.user.uid);
    return profile;
  }

  async login({ username, password }) {
    const clean = usernameClean(username);
    if (!clean || !password) throw new Error('اكتب اليوزر وكلمة المرور');
    return signInWithEmailAndPassword(this.auth, usernameToEmail(clean), password);
  }

  async logout() {
    this.clearListeners();
    await signOut(this.auth);
  }

  async resetPassword(emailOrUsername) {
    const clean = String(emailOrUsername || '').trim();
    const email = clean.includes('@') ? clean : usernameToEmail(clean);
    await sendPasswordResetEmail(this.auth, email);
  }

  async linkRealEmail({ email, password }) {
    if (!this.user) throw new Error('سجل دخول أولًا');
    const newEmail = String(email || '').trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(newEmail)) throw new Error('اكتب إيميل صحيح');
    if (!password) throw new Error('اكتب كلمة المرور الحالية');
    const oldEmail = this.user.email || usernameToEmail(this.profile?.username || '');
    const credential = EmailAuthProvider.credential(oldEmail, password);
    await reauthenticateWithCredential(this.user, credential);
    await updateEmail(this.user, newEmail);
    await update(ref(this.db, `profiles/${this.uid()}`), { realEmail: newEmail, emailLinkedAt: Date.now() });
    return newEmail;
  }

  async saveProfilePatch(patch) {
    if (!this.user) return;
    await update(ref(this.db, `profiles/${this.uid()}`), patch);
  }

  async getProfile(uid) {
    const snap = await get(ref(this.db, `profiles/${uid}`));
    return snap.val();
  }

  async saveHome(home) {
    if (!this.user) throw new Error('سجل دخول أولًا');
    await set(ref(this.db, `homes/${this.uid()}`), { ...home, owner: this.uid(), updatedAt: Date.now(), version: VERSION });
  }

  listenHome(callback) {
    if (!this.user) return () => {};
    const r = ref(this.db, `homes/${this.uid()}`);
    const unsub = onValue(r, snap => callback(snap.val() || null));
    this.unsubs.push(() => off(r));
    return unsub;
  }

  async saveGameState(state) {
    if (!this.user) return;
    await set(ref(this.db, `inventory/${this.uid()}/gameState`), state);
  }

  listenGameState(callback) {
    if (!this.user) return () => {};
    const r = ref(this.db, `inventory/${this.uid()}/gameState`);
    const unsub = onValue(r, snap => callback(snap.val() || null));
    this.unsubs.push(() => off(r));
    return unsub;
  }

  async saveBag(items) {
    if (!this.user) return;
    await set(ref(this.db, `inventory/${this.uid()}/bag`), items || []);
  }

  listenBag(callback) {
    if (!this.user) return () => {};
    const r = ref(this.db, `inventory/${this.uid()}/bag`);
    const unsub = onValue(r, snap => callback(Array.isArray(snap.val()) ? snap.val() : []));
    this.unsubs.push(() => off(r));
    return unsub;
  }

  async saveCell(cellKey, cellData) {
    if (!this.user) throw new Error('سجل دخول أولًا');
    await set(ref(this.db, `world/${cellKey}`), cellData);
  }

  async removeCell(cellKey) {
    if (!this.user) return;
    await remove(ref(this.db, `world/${cellKey}`));
  }

  listenWorld(callback) {
    const r = ref(this.db, 'world');
    const unsub = onValue(r, snap => callback(snap.val() || {}));
    this.unsubs.push(() => off(r));
    return unsub;
  }

  async savePlayer(playerData) {
    if (!this.user) return;
    await set(ref(this.db, `players/${this.uid()}`), { ...playerData, id: this.uid(), updatedAt: Date.now() });
  }

  listenPlayers(callback) {
    const r = ref(this.db, 'players');
    const unsub = onValue(r, snap => callback(snap.val() || {}));
    this.unsubs.push(() => off(r));
    return unsub;
  }

  clearListeners() {
    this.unsubs.forEach(fn => { try { fn(); } catch {} });
    this.unsubs = [];
  }
}
