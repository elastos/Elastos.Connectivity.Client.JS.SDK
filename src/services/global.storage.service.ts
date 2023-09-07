import type { IKeyValueStorage } from "../interfaces/ikeyvaluestorage";
import { DefaultKeyValueStorage } from "../internal/defaultkeyvaluestorage";
import { getGlobalSingleton } from "../singleton";

const INDEX_STORAGE_KEY = "connectivitysdk_storage_index";

class GlobalStorageService {
  private storageLayer: IKeyValueStorage = new DefaultKeyValueStorage();

  private index: string[] = null;

  constructor() { }

  /**
   * Overrides the default storage layer in order to store data in a custom storage.
   * By default, the default storage uses webview's local storage.
   */
  public setStorageLayer(storageLayer: IKeyValueStorage) {
    this.storageLayer = storageLayer;
  }

  private async lazyLoadIndex() {
    if (this.index)
      return;

    const rawIndex = await this.storageLayer.get(INDEX_STORAGE_KEY, null)
    this.index = rawIndex ? JSON.parse(rawIndex) : [];
    //console.log("Connectivity files index", this.index);
  }

  private async saveIndex(): Promise<void> {
    await this.storageLayer.set(INDEX_STORAGE_KEY, JSON.stringify(this.index));
  }

  public async set(context: string, key: string, value: any): Promise<void> {
    await this.lazyLoadIndex();
    const fullKey = this.getFullKey(context, key);

    // Add key to index
    if (!this.index.includes(fullKey)) {
      this.index.push(fullKey);
      await this.saveIndex();
    }

    return this.storageLayer.set(fullKey, value);
  }

  public async get(context: string, key: string, defaultValue: string | null): Promise<string> {
    await this.lazyLoadIndex();
    const fullKey = this.getFullKey(context, key);
    return this.storageLayer.get(fullKey, defaultValue);
  }

  public async unset(context: string, key: string): Promise<void> {
    const fullKey = this.getFullKey(context, key);

    return this.storageLayer.unset(fullKey);
  }

  /**
   * Deletes all stored entries for a given context. If no context is given, all contexts are deleted.
   * This method can be used either internally when switching connectors, or by applications to restart fresh
   * by deleting the existing environment.
   */
  public async clean(context?: string): Promise<void> {
    await this.lazyLoadIndex();

    for (let fullKey of this.index) {
      await this.storageLayer.unset(fullKey);
    }

    this.index = [];
    await this.saveIndex();
  }

  private getFullKey(context: string, key: string): string {
    return context + "_" + key;
  }

  public setJSON(context: string, key: string, value: any): Promise<void> {
    return this.set(context, key, JSON.stringify(value));
  }

  public async getJSON(context: string, key: string, defaultValue: any | null): Promise<any> {
    return JSON.parse(await this.get(context, key, JSON.stringify(defaultValue)));
  }
}

export const globalStorageService = getGlobalSingleton<GlobalStorageService>("storage", () => new GlobalStorageService());

