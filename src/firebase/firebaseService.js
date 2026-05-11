import { VERSION } from '../config.js';

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js';
import { getDatabase, ref, set, onValue, remove, get, update, off, query, orderByKey, startAt, endAt } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-database.js';
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

function authErrorMessage(err, fallback = 'حدث خطأ في الحساب') {
  const code = String(err?.code || '');
  if (code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/user-not-found') return 'اليوزر أو كلمة المرور غير صحيحة، وإذا كان الحساب جديدًا اضغط تسجيل جديد';
  if (code === 'auth/email-already-in-use') return 'اسم المستخدم مستخدم، اختر يوزر آخر';
  if (code === 'auth/weak-password') return 'كلمة المرور ضعيفة، اكتب 6 أحرف أو أكثر';
  if (code === 'auth/network-request-failed') return 'تحقق من اتصال الإنترنت ثم حاول مرة أخرى';
  if (code === 'auth/too-many-requests') return 'محاولات كثيرة، انتظر قليلًا ثم حاول مرة أخرى';
  if (code === 'auth/operation-not-allowed') return 'طريقة Email/Password غير مفعلة في Firebase Authentication';
  return err?.message || fallback;
}

function loginInputToEmail(value) {
  const clean = String(value || '').trim().toLowerCase();
  return clean.includes('@') ? clean : usernameToEmail(clean);
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
    this.worldCellUnsubs = [];
  }

  startAuthListener() {
    onAuthStateChanged(this.auth, async user => {
      this.user = user || null;
      if (!user) {
        this.profile = null;
        this.dispatchEvent(new CustomEvent('auth', { detail: { user: null, profile: null } }));
        return;
      }
      let profile = null;
      try {
        profile = await this.getProfile(user.uid);
      } catch (err) {
        console.warn('Profile load failed:', err);
      }
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
    try {
      const result = await createUserWithEmailAndPassword(this.auth, usernameToEmail(clean), password);
      const profile = {
        uid: result.user.uid,
        username: clean,
        name: safeText(name || clean, 20),
        character: 'woman-1',
        createdAt: Date.now(),
        version: VERSION
      };
      await set(ref(this.db, `profiles/${result.user.uid}`), profile);
      await set(ref(this.db, `usernames/${clean}`), result.user.uid);
      this.user = result.user;
      this.profile = profile;
      this.dispatchEvent(new CustomEvent('auth', { detail: { user: result.user, profile } }));
      return profile;
    } catch (err) {
      throw new Error(authErrorMessage(err, 'فشل إنشاء الحساب'));
    }
  }

  async login({ username, password }) {
    const clean = String(username || '').trim();
    if (!clean || !password) throw new Error('اكتب اليوزر وكلمة المرور');
    try {
      return await signInWithEmailAndPassword(this.auth, loginInputToEmail(clean), password);
    } catch (err) {
      throw new Error(authErrorMessage(err, 'فشل تسجيل الدخول'));
    }
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
    try {
      await reauthenticateWithCredential(this.user, credential);
      await updateEmail(this.user, newEmail);
      await update(ref(this.db, `profiles/${this.uid()}`), { realEmail: newEmail, emailLinkedAt: Date.now() });
      return newEmail;
    } catch (err) {
      throw new Error(authErrorMessage(err, 'فشل ربط الإيميل'));
    }
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
    if (!this.user) return () => {};
    const r = ref(this.db, 'world');
    const unsub = onValue(r, snap => callback(snap.val() || {}), err => console.warn('World listen failed:', err));
    this.unsubs.push(() => off(r));
    return unsub;
  }

  clearWorldCellListeners() {
    this.worldCellUnsubs.forEach(fn => { try { fn(); } catch {} });
    this.worldCellUnsubs = [];
  }

  listenWorldCells(cellKeys, callback) {
    if (!this.user) return () => {};
    this.clearWorldCellListeners();
    const unique = [...new Set((cellKeys || []).filter(Boolean))];
    unique.forEach(cellKey => {
      const r = ref(this.db, `world/${cellKey}`);
      onValue(r, snap => callback(cellKey, snap.val() || null), err => console.warn('World cell listen failed:', cellKey, err));
      this.worldCellUnsubs.push(() => off(r));
    });
    return () => this.clearWorldCellListeners();
  }

  async markCoinCollected(coinId) {
    if (!this.user) return;
    await set(ref(this.db, `collectedMoney/${this.uid()}/${coinId}`), true);
  }

  listenCollectedMoney(callback) {
    if (!this.user) return () => {};
    const r = ref(this.db, `collectedMoney/${this.uid()}`);
    onValue(r, snap => callback(snap.val() || {}), err => console.warn('Collected money listen failed:', err));
    this.unsubs.push(() => off(r));
    return () => off(r);
  }

  async saveHouseProfile(profile) {
    if (!this.user) return;
    await update(ref(this.db, `houseProfiles/${this.uid()}`), { ...profile, owner: this.uid(), updatedAt: Date.now(), version: VERSION });
  }

  listenHouseProfiles(callback) {
    if (!this.user) return () => {};
    const r = ref(this.db, 'houseProfiles');
    onValue(r, snap => callback(snap.val() || {}), err => console.warn('House profiles listen failed:', err));
    this.unsubs.push(() => off(r));
    return () => off(r);
  }

  listenHouseRatings(callback) {
    if (!this.user) return () => {};
    const r = ref(this.db, 'houseRatings');
    onValue(r, snap => callback(snap.val() || {}), err => console.warn('House ratings listen failed:', err));
    this.unsubs.push(() => off(r));
    return () => off(r);
  }

  async rateHouse(ownerId, stars) {
    if (!this.user || !ownerId || ownerId === this.uid()) return;
    await set(ref(this.db, `houseRatings/${ownerId}/${this.uid()}`), Number(stars));
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
    this.worldCellUnsubs = [];
  }
}
