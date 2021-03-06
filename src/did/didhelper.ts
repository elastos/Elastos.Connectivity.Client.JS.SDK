import type {
    DID,
    VerifiableCredential
} from "@elastosfoundation/did-js-sdk";
import {
    DIDStore
} from "@elastosfoundation/did-js-sdk";
import type { IConnector } from "../interfaces/connectors";
import { globalStorageService } from "../services/global.storage.service";
import { generateRandomDIDStoreId } from "./utils";

export class DIDHelper {
    constructor() { }

    /**
     * Saves app instance did info to permanent storage.
     */
    public async saveAppInstanceDIDInfo(storeId: string, didString: string, storePassword: string): Promise<void> {
        console.log("Saving app instance DID info for store " + storeId + " and did " + didString);

        await globalStorageService.set("dappsdk_appinstancedidstoreid", storeId, true);
        await globalStorageService.set("dappsdk_appinstancedidstring", didString, true);
        // TODO: Devices with biometric auth enabled may use the password manager to save this password
        // more securely than in local storage.
        await globalStorageService.set("dappsdk_appinstancedidstorepassword", storePassword, true);
    }

    /**
     * Deletes any data about the active connector context
     */
    public async cleanupConnectorContext(connector: IConnector) {
        await globalStorageService.unset("dappsdk_appinstancedidstoreid", true);
        await globalStorageService.unset("dappsdk_appinstancedidstring", true);
        await globalStorageService.unset("dappsdk_appinstancedidstorepassword", true);
    }

    /**
     * Use the same mechanism as generateRandomDIDStoreId(), this can generate a simple password.
     */
    public generateRandomPassword(): string {
        return generateRandomDIDStoreId();
    }

    /**
     * Convenient way to open a DID store from its ID
     */
    public static openDidStore(storeId: string): Promise<DIDStore> {
        return new Promise(async (resolve) => {
            try {
                let didStore = await DIDStore.open(storeId);
                resolve(didStore);
            }
            catch (e) {
                resolve(null);
            }
        });
    }

    /**
     * Convenient way to load a DID.
     */
    public static loadDID(didStore: DIDStore, didString: string): Promise<DID> {
        return new Promise(async (resolve, reject) => {
            try {
                let didDocument = await didStore.loadDid(didString);
                if (!didDocument)
                    reject("Null DIDDocument loaded for did string " + didStore);
                else
                    resolve(didDocument.getSubject());
            }
            catch (err) {
                reject(err);
            };
        });
    }

    public static loadDIDCredentials(didStore: DIDStore, did: DID): Promise<VerifiableCredential[]> {
        return new Promise(async (resolve, reject) => {
            try {
                let credentialUrls = await didStore.listCredentials(did.toString());
                let credentials: VerifiableCredential[] = [];
                for (let url of credentialUrls) {
                    credentials.push(await didStore.loadCredential(url));
                }
                resolve(credentials);
            }
            catch (e) {
                reject(e);
            }
        });
    }
}