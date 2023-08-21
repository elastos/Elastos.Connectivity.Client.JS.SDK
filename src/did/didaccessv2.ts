import type { VerifiableCredential, VerifiablePresentation } from "@elastosfoundation/did-js-sdk";
import type { CredentialDisclosureRequest, ImportCredentialOptions, ImportedCredential } from ".";
import { connectivity } from "../connectivity";
import { ConnectivityHelper } from "../internal/connectivityhelper";
import type { DeferredRequest } from "../internal/deferred-requests";
import { storeDeferredRequest } from "../internal/deferred-requests";
import type { ResponseHandler, UnsubscribeHandler } from "../internal/response-processors";
import { notNull } from "../internal/utils/rxjs-pipes";
import { getGlobalSingleton } from "../singleton";
import type { AppRequestContext } from "./model/app-request-context";
import type { RequestCredentialsDeferredRequestData } from "./model/deferred-request-data";
import { importCredentialsResponseHandler, requestCredentialsResponseHandler } from "./response-handlers-v2";
import { notImplementedError, randomRequestId, randomString } from "./utils";

class DIDAccessV2 {
    public onRequestCredentialsResponse(handler: ResponseHandler<VerifiablePresentation>): UnsubscribeHandler {
        const sub = requestCredentialsResponseHandler.pipe(notNull).subscribe(([appContext, responsePayload, error]) => {
            handler(appContext, responsePayload, error);
        });
        return () => sub.unsubscribe;
    }

    /**
     * Gets credentials from user identity, based on the requested CredentialDisclosureRequest.
     *
     * A DID Verifiable Presentation is returned, including the list of related credentials found
     * in user's identity wallet.
     *
     * This is a 2-steps process, with the result being sent to an event listener, as the original JS
     * execution context was possibly lost (ie: url redirection).
     */
    public async requestCredentials(request: CredentialDisclosureRequest, appContext?: AppRequestContext): Promise<void> {
        return new Promise((resolve, reject) => {
            ConnectivityHelper.ensureActiveConnector(async () => {
                if (!connectivity.getActiveConnector().requestCredentialsV2) {
                    reject(notImplementedError("requestCredentialsV2"));
                    return;
                }

                try {
                    // If realm and/or nonce are not set by the app, we set and verify some values.
                    // DID SDKs force those fields to be set for security reasons.
                    const deferredRequest: DeferredRequest<RequestCredentialsDeferredRequestData> = {
                        requestId: randomRequestId(),
                        requestType: "requestCredentials",
                        data: {},
                        appData: appContext
                    }

                    if (!request.nonce) {
                        request.nonce = randomString();
                        deferredRequest.data.nonceToVerifyInternally = request.nonce;
                    }
                    if (!request.realm) {
                        request.realm = randomString();
                        deferredRequest.data.realmToVerifyInternally = request.realm;
                    }

                    // Default: true.
                    if (!request.didMustBePublished) {
                        request.didMustBePublished = true;
                    }

                    // Hardcoded format version - we are now at version 2 (after May 2022)
                    request._version = 2;

                    await storeDeferredRequest(deferredRequest);

                    await connectivity.getActiveConnector().requestCredentialsV2(deferredRequest.requestId, request);
                    // IMPORTANT - For connectors that redirect the browser, code after this is not reached

                    resolve();
                }
                catch (e) {
                    reject(e);
                }
            }, () => {
                resolve(null);
            });
        });
    }

    public onImportCredentialsResponse(handler: ResponseHandler<ImportedCredential[]>): UnsubscribeHandler {
        const sub = importCredentialsResponseHandler.pipe(notNull).subscribe(([appContext, responsePayload, error]) => {
            handler(appContext, responsePayload, error);
        });
        return () => sub.unsubscribe;
    }

    /**
     * Sends one or more verifiable credentials to the identity wallet, so that user can decide to
     * import them to his DID profile and optionally publish those credentials as part of his public
     * DID Document.
     * The identity wallet application may display a summary of the credentails contents so that user
     * can review them before accepting to import them.
     *
     * This is a 2-steps process, with the result being sent to an event listener, as the original JS
     * execution context was possibly lost (ie: url redirection).
     */
    public async importCredentials(credentials: VerifiableCredential[], options?: ImportCredentialOptions, appContext?: AppRequestContext): Promise<void> {
        return new Promise((resolve, reject) => {
            ConnectivityHelper.ensureActiveConnector(async () => {
                if (!connectivity.getActiveConnector().importCredentialsV2) {
                    reject(notImplementedError("importCredentialsV2"));
                    return;
                }

                try {
                    const deferredRequest: DeferredRequest<RequestCredentialsDeferredRequestData> = {
                        requestId: randomRequestId(),
                        requestType: "importCredentials",
                        data: {},
                        appData: appContext
                    }

                    await storeDeferredRequest(deferredRequest);

                    await connectivity.getActiveConnector().importCredentialsV2(deferredRequest.requestId, credentials, options);
                    // IMPORTANT - For connectors that redirect the browser, code after this is not reached
                    resolve();
                }
                catch (e) {
                    reject(e);
                }
            }, () => {
                resolve(null);
            });
        });
    }
}

export const didAccessV2 = getGlobalSingleton<DIDAccessV2>("didaccessv2", () => new DIDAccessV2());
