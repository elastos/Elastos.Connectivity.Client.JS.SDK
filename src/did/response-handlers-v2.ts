import type { VerifiablePresentation } from "@elastosfoundation/did-js-sdk";
import { BehaviorSubject } from "rxjs";
import type { ResponseHandlerResult } from "../internal/response-processors";

/**
 * Client app's response handler for request credentials
 */
export const requestCredentialsResponseHandler = new BehaviorSubject<ResponseHandlerResult<VerifiablePresentation>>(null);
