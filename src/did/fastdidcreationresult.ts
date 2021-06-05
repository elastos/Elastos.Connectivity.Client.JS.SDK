import type { DID, DIDStore } from "@elastosfoundation/did-js-sdk";

export type FastDIDCreationResult = {
    didStore: DIDStore;
    did: DID;
    storePassword: string;
}