import { assetUrl } from '../data/constants.js';
export class AssetLoader {
  constructor(scene) { this.scene = scene; this.loading = new Map(); }
  key(path) { return 'asset:' + path.replace(/[^a-zA-Z0-9_\-/.]/g, '_'); }
  ensure(path, done) {
    const key = this.key(path);
    if (this.scene.textures.exists(key)) { done?.(key); return key; }
    if (this.loading.has(key)) { this.loading.get(key).push(done); return key; }
    this.loading.set(key, [done]);
    this.scene.load.image(key, assetUrl(path));
    this.scene.load.once(`filecomplete-image-${key}`, () => this.flush(key, key));
    this.scene.load.once('loaderror', file => { if (file.key === key) this.flush(key, null); });
    if (!this.scene.load.isLoading()) this.scene.load.start();
    return key;
  }
  flush(key, loadedKey) { const callbacks = this.loading.get(key) || []; this.loading.delete(key); callbacks.forEach(fn => fn?.(loadedKey)); }
}
