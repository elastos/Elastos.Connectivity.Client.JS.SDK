import type {
    DID, DIDStore, VerifiableCredential
} from "@elastosfoundation/did-js-sdk";
import { connectivity, logger } from "..";
import type { IConnector } from "../interfaces/connectors";
import { lazyElastosDIDSDKImport } from "../internal/importhelper";
import { globalStorageService } from "../services/global.storage.service";
import { generateRandomDIDStoreId } from "./utils";

export class DIDHelper {
    constructor() { }

    /**
     * Saves app instance did info to permanent storage.
     */
    public async saveAppInstanceDIDInfo(appDID: string = null, storeId: string, didString: string, storePassword: string): Promise<void> {
        logger.log("Saving app instance DID info for store " + storeId + " and did " + didString + " and app did " + appDID);

        const sandboxingSuffix = appDID ? `_${appDID}` : "";

        await globalStorageService.set(connectivity.getActiveConnector().name, "dappsdk_appinstancedidstoreid" + sandboxingSuffix, storeId);
        await globalStorageService.set(connectivity.getActiveConnector().name, "dappsdk_appinstancedidstring" + sandboxingSuffix, didString);
        // TODO: Devices with biometric auth enabled may use the password manager to save this password
        // more securely than in local storage.
        await globalStorageService.set(connectivity.getActiveConnector().name, "dappsdk_appinstancedidstorepassword" + sandboxingSuffix, storePassword);
    }

    /**
     * Deletes any data about the active connector context
     */
    public async cleanupConnectorContext(connector: IConnector) {
        await globalStorageService.clean(connector.name);
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
                const { DIDStore } = await lazyElastosDIDSDKImport();
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
            }
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