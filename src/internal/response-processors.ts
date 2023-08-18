import type { AppRequestContext } from "../did";
import type { DeferredRequest } from "./deferred-requests";

/**
 * Callback type for customized callbacks sent to apps
 */
export type ResponseHandler<T> = (
  appContext: AppRequestContext,
  responsePayload?: T,
  error?: Error
) => void;

/**
 * Internal type for our RxJS subjects that handle event management for app's response handler callbacks.
 */
export type ResponseHandlerResult<T> = [
  appContext: AppRequestContext,
  responsePayload?: T,
  error?: Error
];

export type UnsubscribeHandler = () => void;

export type ResponseProcessor<RequestType, ResponseType> = (request: DeferredRequest<RequestType>, responsePayload: ResponseType) => Promise<void>;

const processors: {
  // Map of request type : ResponseProcessor
  [requestType: string]: ResponseProcessor<any, any>;
} = {};

export function processResponseFromConnector(deferredRequest: DeferredRequest<any>, responsePayload: any) {
  processors[deferredRequest.requestType]?.(deferredRequest, responsePayload);
}

export function registerResponseProcessor<RequestType, ResponseType>(requestType: string, processor: ResponseProcessor<RequestType, ResponseType>) {
  processors[requestType] = processor;
}