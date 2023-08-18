import type { VerifiablePresentation } from "@elastosfoundation/did-js-sdk";
import type { DeferredRequest } from "../internal/deferred-requests";
import { registerResponseProcessor } from "../internal/response-processors";
import { getGlobalSingleton } from "../singleton";
import type { RequestCredentialsDeferredRequestData } from "./model/deferred-request-data";
import { requestCredentialsResponseHandler } from "./response-handlers-v2";

/**
 * Internal class to the connectivity SDK. Processes responsed from connectors and emits
 * refined events to listening apps.
 */
class DIDResponseV2 {
    public async registerResponseProcessors() {
        registerResponseProcessor("requestCredentials", this.processRequestCredentialsResponse);
    }

    private async processRequestCredentialsResponse(request: DeferredRequest<RequestCredentialsDeferredRequestData>, presentation: VerifiablePresentation): Promise<void> {
        if (presentation) {
            if (request.data.nonceToVerifyInternally && request.data.nonceToVerifyInternally !== presentation.getProof().getNonce()) {
                const error = new Error("Automatically generated nonce doesn't match nonce in the returned presentation");
                requestCredentialsResponseHandler.next([request.appData, null, error]);
                return;
            }
            if (request.data.realmToVerifyInternally && request.data.realmToVerifyInternally !== presentation.getProof().getRealm()) {
                const error = new Error("Automatically generated realm doesn't match realm in the returned presentation");
                requestCredentialsResponseHandler.next([request.appData, null, error]);
                return;
            }

            // Successful response, sent to the app, if any listener
            requestCredentialsResponseHandler.next([request.appData, presentation]);
        }
    }
}

export const didResponsev2 = getGlobalSingleton<DIDResponseV2>("didresponsev2", () => new DIDResponseV2());
