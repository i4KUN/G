import { assetUrl, assetFallbackUrl } from '../data/constants.js';

export class AssetLoader {
  constructor(scene) {
    this.scene = scene;
    this.loading = new Map();
  }

  key(path) {
    return 'asset:' + String(path).replace(/[^a-zA-Z0-9_\-/.]/g, '_');
  }

  ensure(path, done) {
    const key = this.key(path);
    if (this.scene.textures.exists(key)) {
      done?.(key);
      return key;
    }
    if (this.loading.has(key)) {
      this.loading.get(key).push(done);
      return key;
    }
    this.loading.set(key, [done]);
    this.loadImage(path, key, false);
    return key;
  }

  loadImage(path, key, fallback) {
    const loadKey = fallback ? `${key}:fallback` : key;
    const url = fallback ? assetFallbackUrl(path) : assetUrl(path);

    if (this.scene.textures.exists(loadKey)) {
      this.flush(key, loadKey);
      return;
    }

    this.scene.load.image(loadKey, url);

    this.scene.load.once(`filecomplete-image-${loadKey}`, () => {
      this.flush(key, loadKey);
    });

    this.scene.load.once('loaderror', file => {
      if (file.key !== loadKey) return;
      if (!fallback && assetFallbackUrl(path) !== assetUrl(path)) {
        this.loadImage(path, key, true);
      } else {
        this.flush(key, null);
      }
    });

    if (!this.scene.load.isLoading()) this.scene.load.start();
  }

  flush(key, loadedKey) {
    const callbacks = this.loading.get(key) || [];
    this.loading.delete(key);
    callbacks.forEach(fn => fn?.(loadedKey));
  }
}
