/**
 * LifeOS Core 2031 · StorageEngine
 * Asynchronous IndexedDB layer with versioning, telemetry and JSON import/export.
 * Zero dependencies.
 */

const DB_NAME = 'LifeOS_NeuralVault';
const DB_VERSION = 1;
const STORE_KERNEL = 'kernel';
const STORE_TELEMETRY = 'telemetry';

export class StorageEngine {
  constructor() {
    this.db = null;
    this.ready = false;
  }

  async init() {
    this.db = await this._open();
    this.ready = true;
    return this;
  }

  _open() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        if (!db.objectStoreNames.contains(STORE_KERNEL)) {
          db.createObjectStore(STORE_KERNEL, { keyPath: 'id' });
        }

        if (!db.objectStoreNames.contains(STORE_TELEMETRY)) {
          const telemetry = db.createObjectStore(STORE_TELEMETRY, {
            keyPath: 'id',
            autoIncrement: true
          });
          telemetry.createIndex('ts', 'ts', { unique: false });
          telemetry.createIndex('type', 'type', { unique: false });
        }
      };

      request.onsuccess = (event) => resolve(event.target.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getKernel() {
    if (!this.ready) await this.init();
    return new Promise((resolve) => {
      const tx = this.db.transaction(STORE_KERNEL, 'readonly');
      const req = tx.objectStore(STORE_KERNEL).get('state');
      req.onsuccess = () => resolve(req.result ? req.result.data : null);
      req.onerror = () => resolve(null);
    });
  }

  async setKernel(data) {
    if (!this.ready) await this.init();
    return new Promise((resolve) => {
      const tx = this.db.transaction(STORE_KERNEL, 'readwrite');
      tx.objectStore(STORE_KERNEL).put({
        id: 'state',
        data,
        updatedAt: Date.now(),
        version: DB_VERSION
      });
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    });
  }

  async addTelemetry(type, payload = {}) {
    if (!this.ready) await this.init();
    return new Promise((resolve) => {
      const tx = this.db.transaction(STORE_TELEMETRY, 'readwrite');
      tx.objectStore(STORE_TELEMETRY).add({
        type,
        payload,
        ts: Date.now()
      });
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    });
  }

  async getTelemetry(limit = 50) {
    if (!this.ready) await this.init();
    return new Promise((resolve) => {
      const tx = this.db.transaction(STORE_TELEMETRY, 'readonly');
      const store = tx.objectStore(STORE_TELEMETRY);
      const index = store.index('ts');
      const results = [];

      const request = index.openCursor(null, 'prev');
      request.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor && results.length < limit) {
          results.push(cursor.value);
          cursor.continue();
        } else {
          resolve(results);
        }
      };
      request.onerror = () => resolve([]);
    });
  }

  async clearTelemetry() {
    if (!this.ready) await this.init();
    return new Promise((resolve) => {
      const tx = this.db.transaction(STORE_TELEMETRY, 'readwrite');
      tx.objectStore(STORE_TELEMETRY).clear();
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    });
  }

  async exportJSON() {
    const kernel = await this.getKernel();
    const telemetry = await this.getTelemetry(200);
    return {
      meta: {
        app: 'LifeOS Core 2031',
        exportedAt: new Date().toISOString(),
        version: DB_VERSION
      },
      kernel,
      telemetry
    };
  }

  async importJSON(json) {
    if (!json || typeof json !== 'object') {
      throw new Error('Invalid import payload');
    }
    if (json.kernel) {
      await this.setKernel(json.kernel);
    }
    return true;
  }

  async wipe() {
    if (!this.ready) await this.init();
    return new Promise((resolve) => {
      const tx = this.db.transaction([STORE_KERNEL, STORE_TELEMETRY], 'readwrite');
      tx.objectStore(STORE_KERNEL).clear();
      tx.objectStore(STORE_TELEMETRY).clear();
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    });
  }
}

export const storage = new StorageEngine();
