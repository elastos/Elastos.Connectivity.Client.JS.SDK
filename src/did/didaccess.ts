import type {
  DID,
  DIDStore,
  JSONObject, VerifiableCredential, VerifiablePresentation
} from "@elastosfoundation/did-js-sdk";
import moment from 'moment';
import Queue from "promise-queue";
import type { CredentialDisclosureRequest } from ".";
import { connectivity } from "../connectivity";
import type { SignedData } from "../did/model/signeddata";
import { ConnectivityHelper } from "../internal/connectivityhelper";
import { lazyElastosDIDSDKImport } from "../internal/importhelper";
import { globalLoggerService as logger } from "../services/global.logger.service";
import { globalStorageService } from "../services/global.storage.service";
import { DIDHelper } from "./didhelper";
import type { FastDIDCreationResult } from "./fastdidcreationresult";
import type { DeleteCredentialOptions } from "./model/deletecredentialoptions";
import type { GetCredentialsQuery } from "./model/getcredentialsquery";
import type { ImportCredentialOptions } from "./model/importcredentialoptions";
import type { ImportedCredential } from "./model/importedcredential";
import type { UpdateHiveVaultAddressStatus } from "./model/updatehivevault";
import { generateRandomDIDStoreId, notImplementedError, randomString } from "./utils";

// Queue used to make sure that the app doesn't call getOrCreateAppInstanceDID() several times in parrallel.
const appInstanceDIDCreationQueue = new Queue(1);

export class DIDAccess {
    private helper: DIDHelper = null;

    constructor() {
        this.helper = new DIDHelper();
    }

    /**
     * @deprecated Use requestCredentials().
     *
     * Gets credentials from user identity, based on the requested GetCredentialsQuery.
     * A DID Verifiable Presentation is returned, including the list of related credentials found
     * in user's identity wallet.
     */
    public async getCredentials(query: GetCredentialsQuery): Promise<VerifiablePresentation> {
        return new Promise((resolve, reject) => {
            ConnectivityHelper.ensureActiveConnector(async () => {
                if (!connectivity.getActiveConnector().getCredentials) {
                    reject(notImplementedError("getCredentials"));
                    return;
                }

                // Default: true.
                if (!query.didMustBePublished) {
                    query.didMustBePublished = true;
                }

                try {
                    let presentation = await connectivity.getActiveConnector().getCredentials(query);
                    resolve(presentation);
                }
                catch (e) {
                    reject(e);
                }
            }, () => {
                resolve(null);
            });
        });
    }

    /**
     * Replacement for the deprecated getCredentials().
     *
     * Gets credentials from user identity, based on the requested CredentialDisclosureRequest.
     * A DID Verifiable Presentation is returned, including the list of related credentials found
     * in user's identity wallet.
     */
    public async requestCredentials(request: CredentialDisclosureRequest): Promise<VerifiablePresentation> {
        return new Promise((resolve, reject) => {
            ConnectivityHelper.ensureActiveConnector(async () => {
                if (!connectivity.getActiveConnector().requestCredentials) {
                    reject(notImplementedError("requestCredentials"));
                    return;
                }

                try {
                    // If realm and/or nonce are not set by the app, we set and verify some values.
                    // DID SDKs force those fields to be set for security reasons.
                    let shouldManuallyVerifyNonce = false;
                    if (!request.nonce) {
                        request.nonce = randomString();
                        shouldManuallyVerifyNonce = true;
                    }
                    let shouldManuallyVerifyRealm = false;
                    if (!request.realm) {
                        request.realm = randomString();
                        shouldManuallyVerifyRealm = true;
                    }

                    // Default: true.
                    if (!request.didMustBePublished) {
                        request.didMustBePublished = true;
                    }

                    // Hardcoded format version - we are now at version 2 (after May 2022)
                    request._version = 2;

                    let presentation = await connectivity.getActiveConnector().requestCredentials(request);

                    if (presentation) {
                        if (shouldManuallyVerifyNonce && request.nonce !== presentation.getProof().getNonce()) {
                            reject(new Error("Automatically generated nonce doesn't match nonce in the returned presentation"));
                            return;
                        }
                        if (shouldManuallyVerifyRealm && request.realm !== presentation.getProof().getRealm()) {
                            reject(new Error("Automatically generated realm doesn't match realm in the returned presentation"));
                            return;
                        }
                    }
                    resolve(presentation);
                }
                catch (e) {
                    reject(e);
                }
            }, () => {
                resolve(null);
            });
        });
    }

    /**
     * Requests the identity app to generate a Verifiable Credential using the given information and to return
     * it. While the content is suggested by the caller of this method, the credential itself is generated by
     * the identity app and signed (issued) by the identity app user. This is what could be called a passive way
     * to generate credentials. Instead of having someone generate a credential with a whole content directly,
     * a third party provides the pre-filled information, and the identity owner only packages and signs this
     * information.
     *
     * Ex: A student wants to get a diploma credential. The university is not yet equipped with DID integration in its
     * IT infrastructure. A third party web app named MyDiploma.com can get users information from their LinkedIn
     * profile, organize this information according to a standardized "diploma" credential format, and just ask the
     * university admin to generate and sign the credential, through this issueCredential() method. This way, the
     * only material needed by the university is an identity app, and students can start getting their DID credentials
     * without waiting for more complex technical integrations.
     *
     * @param identifier The unique identifier for the credential. If omitted, the identity wallet should generate a random one.
     * @param types Array of types defining the credential. Ex: "SocialNetworkCredential" (old style) or "https://my.web/credentials/v1#SocialNetworkCredential" (with json-ld credential definition)
     * @param holder DID string of the entity who will receive the credential.
     * @param subject Arbitrary JSON object, possibly nested, containing the credential data.
     * @param expirationDate ISO8601 date after which this credential should be considered as not usable any more. If omitted, the credential should have a 5 years validity.
     */
    public async issueCredential(
        holder: string,
        types: string[],
        subject: JSONObject,
        identifier?: string,
        expirationDate?: string,
    ): Promise<VerifiableCredential> {
        return new Promise((resolve, reject) => {
            ConnectivityHelper.ensureActiveConnector(async () => {
                if (!connectivity.getActiveConnector().issueCredential) {
                    reject(notImplementedError("issueCredential"));
                    return;
                }

                try {
                    let issuedCredential = await connectivity.getActiveConnector().issueCredential(
                        holder, types, subject, identifier, expirationDate
                    );
                    resolve(issuedCredential);
                }
                catch (e) {
                    reject(e);
                }
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
    public async importCredentials(credentials: VerifiableCredential[], options?: ImportCredentialOptions): Promise<ImportedCredential[]> {
        return new Promise((resolve, reject) => {
            ConnectivityHelper.ensureActiveConnector(async () => {
                if (!connectivity.getActiveConnector().importCredentials) {
                    reject(notImplementedError("importCredentials"));
                    return;
                }

                try {
                    let importedCredentials = await connectivity.getActiveConnector().importCredentials(credentials, options);
                    resolve(importedCredentials);
                }
                catch (e) {
                    reject(e);
                }
            }, () => {
                resolve(null);
            });
        });
    }

    /**
     * Deletes one or more credentials from user's identity, based on a credential ID.
     * Returns the list of credential IDs that were actually deleted from user's identity.
     */
    public async deleteCredentials(credentialIds: string | string[], options?: DeleteCredentialOptions): Promise<string[]> {
        // Rebuild an array if it's not one.
        let realCredentialIds: string[];
        if (typeof credentialIds === "string")
            realCredentialIds = [credentialIds];
        else
            realCredentialIds = credentialIds;

        return new Promise((resolve, reject) => {
            ConnectivityHelper.ensureActiveConnector(async () => {
                if (!connectivity.getActiveConnector().deleteCredentials) {
                    reject(notImplementedError("deleteCredentials"));
                    return;
                }

                try {
                    let deletionList = await connectivity.getActiveConnector().deleteCredentials(realCredentialIds, options);
                    resolve(deletionList);
                }
                catch (e) {
                    reject(e);
                }
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
        return new Promise((resolve, reject) => {
            ConnectivityHelper.ensureActiveConnector(async () => {
                if (!connectivity.getActiveConnector().signData) {
                    reject(notImplementedError("signData"));
                    return;
                }

                try {
                    let signedData = await connectivity.getActiveConnector().signData(
                        data, jwtExtra, signatureFieldName
                    );
                    resolve(signedData);
                }
                catch (e) {
                    reject(e);
                }
            }, () => {
                resolve(null);
            });
        });
    }

    /**
     * Requests user to publish his current DID Document on chain, without making any change,
     * simply to make sure everything is up to date.
     *
     * Returns the transaction ID, if the document was published.
     */
    public async requestPublish(): Promise<string> {
        return new Promise((resolve, reject) => {
            ConnectivityHelper.ensureActiveConnector(async () => {
                if (!connectivity.getActiveConnector().requestPublish) {
                    reject(notImplementedError("requestPublish"));
                    return;
                }

                try {
                    let txId = await connectivity.getActiveConnector().requestPublish();
                    resolve(txId);
                }
                catch (e) {
                    reject(e);
                }
            }, () => {
                resolve(null);
            });
        });
    }

    /**
     * Requests user to update his hive vault service address in his DID document. This address is part of the
     * published DID document and is used by other users to find another user's hive vault address
     * based on his DID.
     *
     * If everything goes well, the identity wallet pushes users to instantly publish a new version of their
     * DID document online, so that it becomes up-to-date with the latest hive vault address information. But
     * it is also possible that the operation (DID modification, or publication) is cancelled by the user.
     *
     * Note that this operation does NOT migrate user's vault content. It's only a raw update of the vault address.
     * The calling application is responsible for this migration. If this is not done, users will loose access
     * to their data unless they revert this later to the old vault address.
     *
     * @param vaultAddress The new hive vault address. Eg: https://hive1.trinity-tech.io
     * @param displayName Vault name to show on user's confirmation screen together with the url. Purely informative, not saved to the DID.
     *
     * @returns True if the DID document was updated AND published successfully. False otherwise.
     */
    public async updateHiveVaultAddress(vaultAddress: string, displayName: string): Promise<UpdateHiveVaultAddressStatus> {
        return new Promise((resolve, reject) => {
            ConnectivityHelper.ensureActiveConnector(async () => {
                if (!connectivity.getActiveConnector().updateHiveVaultAddress) {
                    reject(notImplementedError("updateHiveVaultAddress"));
                    return;
                }

                try {
                    let updated = await connectivity.getActiveConnector().updateHiveVaultAddress(vaultAddress, displayName);
                    resolve(updated);
                }
                catch (e) {
                    reject(e);
                }
            }, () => {
                resolve(null);
            });
        });
    }

    /**
     * Requests the identity wallet to add, or update a credential context credential. A credential context is a
     * credential that contains the JSON-LD description of a credential context/type. Credential context/types are
     * used as template to create credentials in app, that follow a standardized format. For instance, a credential
     * context can define that the type "MyCred" contains two fields, "name" and "location", and anyone can
     * conform to this type to create, and also to read credentials that flow between apps.
     *
     * When importing a credential context, the following operations are done:
     * - The credential context credential is imported into user's DID store, locally
     * - The DID document (public) is updated to:
     * -    Contain that new credential (the credential will be public)
     * -    Add or update a "service" entry that points to the credential ID.
     *
     * When apps use credentials and want to discover the credential types that they use, they know the full
     * ID or the credential type thanks to the context+type used by the credential. A context looks like
     * "did://elastos/abcdefghijkl/MyCred1", and the type looks like "MyCred". Thanks to the context url,
     * the DID document of the developer who published the credential context is resolved, and the context url
     * is use to find a "service" (in the DID document) that matches. From the service, the current credential
     * context credential in use can be retrieved in the DID document, and the credential format can be known.
     *
     * Every time new credentials are created, we don't reuse the same credential ID. This means that we cannot
     * modify and existing context format. But then, what if a developer wants to add a field or slightly
     * modify the format? We don't want to ask all using apps to upgrade to use a new credential context url and
     * start to maintain a long list of supported credential types (version 1, 2, 3...). To solve this,
     * "services" are used in order to be able to update credential type formats when really needed (trying to
     * preserve backward compatibility) while not requiring to upgrade all apps. The service url always remains
     * the same (for one kind of credential type), but the service endpoint is updated to point to the new credential
     * context credential, that contains the modified format.
     *
     * @param serviceName The stable context name url that will be used by credentials
     * @param contextCredential The credential context credential, generated on a tool such as the elastos credential toolbox
     */
    importCredentialContext(serviceName: string, contextCredential: VerifiableCredential): Promise<ImportedCredential> {
        return new Promise((resolve, reject) => {
            ConnectivityHelper.ensureActiveConnector(async () => {
                if (!connectivity.getActiveConnector().importCredentialContext) {
                    reject(notImplementedError("importCredentialContext"));
                    return;
                }

                try {
                    let result = await connectivity.getActiveConnector().importCredentialContext(serviceName, contextCredential);
                    resolve(result);
                }
                catch (e) {
                    reject(e);
                }
            }, () => {
                resolve(null);
            });
        });
    }

    /**
     * Requests user's identity wallet to generate a special "app ID" credential. This credential is used
     * to authorize an application to access some kind of information after proving who it is.
     * For example, this credential is used by the hive authentication, in order to let apps access only
     * the storage space sandboxed using the application DID, and not other app's storage data.
     *
     * This credential is sensitive and must be delivered by the identity wallet only after verifying that
     * the requesting application is really the owner of appDID, for example by making sure that the redirect
     * url registered in the App's DID Document (public) matches the redirect url defined to receive the response
     * to this connector request (when a third party identity app is used).
     *
     * The optional app did string is used to use / create different app instance dids / app id credentials in case several
     * "app dids" are used in the same real app environment. If none provided, the global connectivity application DID is used.
     */
    public async generateAppIdCredential(appDID: string = null): Promise<VerifiableCredential> {
        return new Promise((resolve, reject) => {
            ConnectivityHelper.ensureActiveConnector(async () => {
                if (!connectivity.getActiveConnector().generateAppIdCredential) {
                    reject(notImplementedError("generateAppIdCredential"));
                    return;
                }

                try {
                    let storedAppInstanceDID = await this.getOrCreateAppInstanceDID(appDID);
                    if (!storedAppInstanceDID) {
                        resolve(null);
                        return;
                    }

                    let appInstanceDID = storedAppInstanceDID.did;

                    // No such credential, so we have to create one. Send an intent to get that from the did app
                    logger.log("Starting to generate a new App ID credential.");

                    let credential = await connectivity.getActiveConnector().generateAppIdCredential(appInstanceDID.toString(), appDID ? appDID : connectivity.getApplicationDID());

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
                }
                catch (e) {
                    reject(e);
                }
            }, () => {
                resolve(null);
            });
        });
    }

    /**
     * Generates a special short live credential (3 days) used to backup and restore hive vaults
     * for a user. Using this credential, user's current hive node can authenticate to a target
     * backup or restore hive node, in order to either backup current user data to the backup node,
     * or restore user data from the backup node.
     *
     * @param sourceHiveNodeDID DID of the hive node that wants to initiate backup/restore operations.
     * @param targetHiveNodeDID DID of the slave node that will operate requests from the source node.
     * @param targetNodeURL Public url of the target hive node (For backups, this is the node that will hold the backup data).
     */
    public async generateHiveBackupCredential(sourceHiveNodeDID: string, targetHiveNodeDID: string, targetNodeURL: string): Promise<VerifiableCredential> {
        return new Promise((resolve, reject) => {
            ConnectivityHelper.ensureActiveConnector(async () => {
                if (!connectivity.getActiveConnector().generateHiveBackupCredential) {
                    reject(notImplementedError("generateHiveBackupCredential"));
                    return;
                }

                try {
                    let credential = await connectivity.getActiveConnector().generateHiveBackupCredential(sourceHiveNodeDID, targetHiveNodeDID, targetNodeURL);
                    resolve(credential);
                }
                catch (e) {
                    reject(e);
                }
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
    public async getExistingAppIdentityCredential(appDID: string = null): Promise<VerifiableCredential> {
        logger.log("Trying to get an existing app ID credential from storage");

        let storedAppInstanceDID = await this.getOrCreateAppInstanceDID(appDID);
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
     *
     * The optional app did string is used to use / create different app instance dids / app id credentials in case several
     * "app dids" are used in the same real app environment. If none provided, the global connectivity application DID is used.
     */
    public async getOrCreateAppInstanceDID(appDID: string = null): Promise<{ did: DID, didStore: DIDStore, storePassword: string }> {
        let didStore: DIDStore = null;
        let did: DID = null;
        let storePassword: string = null;

        return appInstanceDIDCreationQueue.add(() => {
            logger.log("Getting or creating app instance DID");

            return new Promise((resolve, reject) => {
                ConnectivityHelper.ensureActiveConnector(async () => {
                    try {
                        // Check if we have a app instance DID store saved in our local storage (app manager settings)
                        let appInstanceDIDInfo = await this.getExistingAppInstanceDIDInfo(appDID);
                        if (appInstanceDIDInfo) {
                            // DID store found - previously created. Open it and get the app instance did.
                            didStore = await DIDHelper.openDidStore(appInstanceDIDInfo.storeId);
                            if (didStore) { // Make sure the DID store could be loaded, just in case (abnormal case).
                                try {
                                    did = await DIDHelper.loadDID(didStore, appInstanceDIDInfo.didString);
                                    storePassword = appInstanceDIDInfo.storePassword;
                                }
                                catch (err) {
                                    logger.error(err);
                                }
                            }
                        }

                        if (!didStore || !did) {
                            logger.log("No app instance DID found. Creating a new one");

                            // No DID store found. Need to create a new app instance DID.
                            let didCreationresult = await this.createNewAppInstanceDID(appDID);
                            didStore = didCreationresult.didStore;
                            did = didCreationresult.did;
                            storePassword = didCreationresult.storePassword;
                        }

                        // Load credentials first before being able to call getCredential().
                        await DIDHelper.loadDIDCredentials(didStore, did);

                        resolve({
                            did,
                            didStore,
                            storePassword
                        });
                    }
                    catch (e) {
                        reject(e);
                    }
                }, () => {
                    // Cancelled
                    resolve(null);
                });
            });
        });
    }

    /**
    * Retrieve information about existing app instance info from permanent storage, if any.
    */
    public async getExistingAppInstanceDIDInfo(appDID: string = null): Promise<{ storeId: string, didString: string, storePassword: string }> {
        const sandboxingSuffix = appDID ? `_${appDID}` : "";

        let storeId = await globalStorageService.get(connectivity.getActiveConnector().name, "dappsdk_appinstancedidstoreid" + sandboxingSuffix, null);
        let didString = await globalStorageService.get(connectivity.getActiveConnector().name, "dappsdk_appinstancedidstring" + sandboxingSuffix, null);
        let storePassword = await globalStorageService.get(connectivity.getActiveConnector().name, "dappsdk_appinstancedidstorepassword" + sandboxingSuffix, null);

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
            try {
                const { Mnemonic, DIDStore, RootIdentity } = await lazyElastosDIDSDKImport();

                let mnemonic = await Mnemonic.getInstance(language).generate();
                let didStoreId = generateRandomDIDStoreId();

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
            }
            catch (e) {
                reject(e);
            }
        });
    }

    /**
     * Creates a new application instance DID store, DID, and saves info to permanent storage.
     *
     * The optional app did string is used to use / create different app instance dids / app id credentials in case several
     * "app dids" are used in the same real app environment. If none provided, the global connectivity application DID is used.
     */
    public async createNewAppInstanceDID(appDID: string = null): Promise<{ didStore: DIDStore, didStoreId: string, did: DID, storePassword: string }> {
        const { Mnemonic } = await lazyElastosDIDSDKImport();
        let didCreationResult = await this.fastCreateDID(Mnemonic.ENGLISH);
        await this.helper.saveAppInstanceDIDInfo(appDID, didCreationResult.didStoreId, didCreationResult.did.toString(), didCreationResult.storePassword);

        return {
            didStore: didCreationResult.didStore,
            didStoreId: didCreationResult.didStoreId,
            did: didCreationResult.did,
            storePassword: didCreationResult.storePassword
        }
    }
}
