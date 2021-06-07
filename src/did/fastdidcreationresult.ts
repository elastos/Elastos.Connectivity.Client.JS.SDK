import type { DID, DIDStore } from "@elastosfoundation/did-js-sdk";

export type FastDIDCreationResult = {
    didStoreId: string;
    didStore: DIDStore;
    did: DID;
    storePassword: string;
}