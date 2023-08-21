import type { VerifiablePresentation } from "@elastosfoundation/did-js-sdk";
import { BehaviorSubject } from "rxjs";
import type { ResponseHandlerResult } from "../internal/response-processors";
import type { ImportedCredential } from "./model/importedcredential";

/**
 * Client app's response handler for request credentials
 */
export const requestCredentialsResponseHandler = new BehaviorSubject<ResponseHandlerResult<VerifiablePresentation>>(null);

/**
 * Client app's response handler for import credentials
 */
export const importCredentialsResponseHandler = new BehaviorSubject<ResponseHandlerResult<ImportedCredential[]>>(null);
