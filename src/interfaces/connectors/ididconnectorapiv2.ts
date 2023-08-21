import type { VerifiableCredential } from "@elastosfoundation/did-js-sdk";
import type { CredentialDisclosureRequest, ImportCredentialOptions } from "../../did";

/**
 * NOTE: All methods are marked as optional to avoid breaking builds when adding new methods to the
 * connectivity SDK, while some connectors are not updated yet. But all implementations are
 * actually required.
 *
 * This implementation is similar to v1 except that it returns results in separate event listeners instead
 * of using promises. Because some connector implementations require web page redirections and lose the original
 * app context.
 *
 * Each method returns a request ID.
 *
 * Connectors are responsible for calling
 */
export interface IDIDConnectorAPIV2 {
    requestCredentialsV2?(requestId: string, request: CredentialDisclosureRequest): Promise<void>;
    importCredentialsV2?(requestId: string, credentials: VerifiableCredential[], options?: ImportCredentialOptions): Promise<void>;
}