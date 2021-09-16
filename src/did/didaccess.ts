import {
    DID,
    DIDStore,
    Mnemonic,
    RootIdentity, VerifiableCredential, VerifiablePresentation
} from "@elastosfoundation/did-js-sdk";
import moment from 'moment';
import { connectivity } from "../connectivity";
import type { SignedData } from "../did/model/signeddata";
import { ConnectivityHelper } from "../internal/connectivityhelper";
import { globalLoggerService as logger } from "../services/global.logger.service";
import { globalStorageService } from "../services/global.storage.service";
import { DIDHelper } from "./didhelper";
import type { FastDIDCreationResult } from "./fastdidcreationresult";
import type { GetCredentialsQuery } from "./model/getcredentialsquery";
import type { ImportCredentialOptions } from "./model/importcredentialoptions";
import type { ImportedCredential } from "./model/importedcredential";
import { Utils } from "./utils";

export class DIDAccess {
    private helper: DIDHelper = null;

    constructor() {
        this.helper = new DIDHelper();
    }

    /**
     * Gets credentials from user identity, based on the requested GetCredentialsQuery. Claims format is available
     * on the elastos developer portal and can be optional or mandatory.
     * A DID Verifiable Presentation is returned, including the list of related credentials found
     * in user's identity wallet.
     */
    public async getCredentials(query: GetCredentialsQuery): Promise<VerifiablePresentation> {
        return new Promise((resolve) => {
            ConnectivityHelper.ensureActiveConnector(async () => {
                let presentation = await connectivity.getActiveConnector().getCredentials(query);
                resolve(presentation);
            }, () => {
                resolve(null);
            });
        });
    }

    /**
     * Sends one or more verifiable credentials to the identity wallet, so that user can decide to
     * import them to his DID profile and optionally publish those credentials as part of his public
     * DID Document.
     * The identity wallet application may display a summary of the credentails contents so that user
     * can review them before accepting to import them.
     *
     * The list of credentials that were accepted and imported by the user are returned.
     */
    importCredentials(credentials: VerifiableCredential[], options?: ImportCredentialOptions): Promise<ImportedCredential[]> {
        return new Promise((resolve) => {
            ConnectivityHelper.ensureActiveConnector(async () => {
                let importedCredentials = await connectivity.getActiveConnector().importCredentials(credentials, options);
                resolve(importedCredentials);
            }, () => {
                resolve(null);
            });
        });
    }

    /**
     * Deletes one or more credentials from user identity, base on a credential ID.
     * Returns the list of credential IDs that were actually deleted from user's identity.
     */
    public async deleteCredentials(credentialIds: string | string[]): Promise<string[]> {
        // Rebuild an array if it's not one.
        let realCredentialIds: string[];
        if (typeof credentialIds === "string")
            realCredentialIds = [credentialIds];
        else
            realCredentialIds = credentialIds;

        return new Promise((resolve) => {
            ConnectivityHelper.ensureActiveConnector(async () => {
                let deletionList = await connectivity.getActiveConnector().deleteCredentials(realCredentialIds);
                resolve(deletionList);
            }, () => {
                resolve(null);
            });
        });
    }

    /**
     * Signs the given data with user's DID. The returned data contains a JWT string signed by user's DID.
     * The payload in this JWT contains a field named "signature" by default, that holds the signed data, but this
     * field named can optionally be changed.
     *
     * @param data Data to sign
     * @param signatureFieldName Name of the field that holds the signature output, in the response. Useful for example to customize a generated JWT with a custom signature field name. Default: "signature".
     * @param jwtExtra Optional JSON object that holds fields that are directly added to the resulting response / JWT. Useful for example to send server side challenges back, or other custom application data.
     */
    public async signData(data: string, jwtExtra?: any, signatureFieldName?: string): Promise<SignedData> {
        return new Promise((resolve) => {
            ConnectivityHelper.ensureActiveConnector(async () => {
                let signedData = await connectivity.getActiveConnector().signData(
                    data, jwtExtra, signatureFieldName
                );
                resolve(signedData);
            }, () => {
                resolve(null);
            });
        });
    }

    /**
     * Requests user's identity wallet to generate a special "app ID" credential. This credential is used
     * to authorize an application to access some kind of information after prooving who it is.
     * For example, this credential is used by the hive authentication, in order to let apps access only
     * the storage space sandboxed using the application DID, and not other app's storage data.
     *
     * This credential is sensitive and must be delivered by the identity wallet only after verifying that
     * the requesting application is really the owner of appDID, for example by making sure that the redirect
     * url registered in the App's DID Document (public) matches the redirect url defined to receive the response
     * to this connector request (when a third party identity app is used).
     */
    public async generateAppIdCredential(): Promise<VerifiableCredential> {
        return new Promise((resolve) => {
            ConnectivityHelper.ensureActiveConnector(async () => {
                let storedAppInstanceDID = await this.getOrCreateAppInstanceDID();
                if (!storedAppInstanceDID) {
                    resolve(null);
                    return;
                }

                let appInstanceDID = storedAppInstanceDID.did;

                // No such credential, so we have to create one. Send an intent to get that from the did app
                logger.log("Starting to generate a new App ID credential.");

                let credential = await connectivity.getActiveConnector().generateAppIdCredential(appInstanceDID.toString(), connectivity.getApplicationDID());

                // TODO IMPORTANT: Check if the credential was issued by the user himself for security purpose, to make sure
                // another app is not trying to issue and add a fake app-id-credential credential to user's profile
                // by another way.

                // Save this issued credential for later use.
                await storedAppInstanceDID.didStore.storeCredential(credential);

                // This generated credential must contain the following properties:
                // TODO: CHECK THAT THE RECEIVED CREDENTIAL CONTENT IS VALID
                // appInstanceDid
                // appDid

                resolve(credential);
            }, () => {
                resolve(null);
            });
        });
    }

    /**
     * Gets the special App ID credential from the app instance DID. This credential was delivered by
     * a connector and signed with user's DID, after user's approval.
     * The credential contains the real app did used to publish it.
     */
    public async getExistingAppIdentityCredential(): Promise<VerifiableCredential> {
        logger.log("Trying to get an existing app ID credential from storage");

        let storedAppInstanceDID = await this.getOrCreateAppInstanceDID();
        if (!storedAppInstanceDID) {
            return null;
        }
        let appInstanceDID = storedAppInstanceDID.did;

        logger.log("App Instance DID:", appInstanceDID);

        let credential = await storedAppInstanceDID.didStore.loadCredential(appInstanceDID.toString() + "#app-id-credential");
        if (credential) {
            // If the credential exists but expiration date it too close, delete the current one to force generating a
            // new one.
            let expirationDate = moment(await credential.getExpirationDate());
            if (expirationDate.isBefore(moment().subtract(1, 'hours'))) {
                // We are expired - ask to generate a new credential
                logger.log("Existing credential is expired or almost expired - renewing it");
                return null;
            }
            else {
                logger.log("Returning existing app id credential found in app's local storage");
            }
        }

        return credential;
    }

    /**
     * Get the existing application instance DID if it was created before. Otherwise, a new app instance
     * DID is created and the information is stored in persistent storage for later use.
     */
    public async getOrCreateAppInstanceDID(): Promise<{ did: DID, didStore: DIDStore }> {
        let didStore: DIDStore = null;
        let did: DID = null;

        logger.log("Getting or creating app instance DID");

        return new Promise((resolve) => {
            ConnectivityHelper.ensureActiveConnector(async () => {
                // Check if we have a app instance DID store saved in our local storage (app manager settings)
                let appInstanceDIDInfo = await this.getExistingAppInstanceDIDInfo();
                if (appInstanceDIDInfo) {
                    // DID store found - previously created. Open it and get the app instance did.
                    didStore = await DIDHelper.openDidStore(appInstanceDIDInfo.storeId);
                    if (didStore) { // Make sure the DID store could be loaded, just in case (abnormal case).
                        try {
                            did = await DIDHelper.loadDID(didStore, appInstanceDIDInfo.didString);
                        }
                        catch (err) {
                            logger.error(err);
                        }
                    }
                }

                if (!didStore || !did) {
                    logger.log("No app instance DID found. Creating a new one");

                    // No DID store found. Need to create a new app instance DID.
                    let didCreationresult = await this.createNewAppInstanceDID();
                    didStore = didCreationresult.didStore;
                    did = didCreationresult.did;
                }

                // Load credentials first before being able to call getCredential().
                await DIDHelper.loadDIDCredentials(didStore, did);

                resolve({
                    did: did,
                    didStore: didStore
                });
            }, () => {
                // Cancelled
                resolve(null);
            });
        });
    }

    /**
    * Retrieve information about existing app instance info from permanent storage, if any.
    */
    public async getExistingAppInstanceDIDInfo(): Promise<{ storeId: string, didString: string, storePassword: string }> {
        let storeId = await globalStorageService.get("dappsdk_appinstancedidstoreid", null, true)
        let didString = await globalStorageService.get("dappsdk_appinstancedidstring", null, true)
        let storePassword = await globalStorageService.get("dappsdk_appinstancedidstorepassword", null, true)

        if (storeId && didString) {
            return {
                storeId: storeId,
                didString: didString,
                storePassword: storePassword
            };
        }

        return null;
    }

    /**
     * Convenient method to:
     * - Create a new DID store
     * - Initiate its private key with a mnemonic
     * - Create a default DID in the store
     *
     * This method should be directly in the DID SDK / DID Plugin. We keep it here private for now
     * for convenience.
     */
    public fastCreateDID(language: string): Promise<FastDIDCreationResult> {
        logger.log("Fast DID creation with language " + language);

        return new Promise(async (resolve, reject) => {
            let mnemonic = await Mnemonic.getInstance(language).generate();
            let didStoreId = Utils.generateRandomDIDStoreId();

            let didStore = await DIDStore.open(didStoreId);

            // Store created, now init the root identity
            let storePass = this.helper.generateRandomPassword();
            let rootIdentity = RootIdentity.createFromMnemonic(mnemonic, null, didStore, storePass);

            // Now add a DID
            let didDocument = await rootIdentity.newDid(storePass);
            // DID added, now we can return
            resolve({
                didStoreId,
                didStore: didStore,
                did: didDocument.getSubject(),
                storePassword: storePass
            });
        });
    }

    /**
     * Creates a new application instance DID store, DID, and saves info to permanent storage.
     */
    public async createNewAppInstanceDID(): Promise<{ didStore: DIDStore, did: DID }> {
        let didCreationResult = await this.fastCreateDID(Mnemonic.ENGLISH);
        await this.helper.saveAppInstanceDIDInfo(didCreationResult.didStoreId, didCreationResult.did.toString(), didCreationResult.storePassword);

        return {
            didStore: didCreationResult.didStore,
            did: didCreationResult.did
        }
    }
}
