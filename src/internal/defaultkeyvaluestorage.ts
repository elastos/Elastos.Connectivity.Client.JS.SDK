import { kvsEnvStorage } from "@kvs/env";
import type { IKeyValueStorage } from "../interfaces/ikeyvaluestorage";

/**
 * Default implementation for storing data, in case no provider is passed.
 *
 * NOTE: We use KVS instead of localStorage to solve potential issues with SSR, for
 * example using nextjs that tries to generate pages for both server and client sides (both using the browser SDK though)
 */
export class DefaultKeyValueStorage implements IKeyValueStorage {
    private storage: any;

    private async init() {
        if (this.storage)
            return;

        this.storage = await kvsEnvStorage({
            name: "connectivity-sdk-storage",
            version: 1
        });
    }

    async set(key: string, value: string): Promise<void> {
        await this.init();
        await this.storage.set(key, value);
    }

    async get(key: string, defaultValue: string): Promise<string> {
        await this.init();
        let value = await this.storage.get(key);
        if (value)
            return value as string;
        else
            return defaultValue;
    }

    async unset(key: string): Promise<void> {
        await this.init();
        await this.storage.delete(key);
    }
}