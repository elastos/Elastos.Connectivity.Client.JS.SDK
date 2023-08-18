import type { AppRequestContext } from "../did/model/app-request-context";
import { globalStorageService } from "../services/global.storage.service";

export type DeferredRequest<T> = {
  requestId: string;
  requestType: string;
  data?: T; // Data slot for the connectivity SDK itself
  appData?: AppRequestContext; // Data stored by the app itself to retrieve its context when coming back after a response.
}

export function storeDeferredRequest(request: DeferredRequest<any>): Promise<void> {
  return globalStorageService.setJSON("deferredrequests", request.requestId, request);
}

export function loadDeferredRequest<T>(requestId: string): Promise<DeferredRequest<T>> {
  return globalStorageService.getJSON("deferredrequests", requestId, null);
}