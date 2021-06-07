import type { IConnector } from "./iconnector";
import type { IDIDConnectorAPI, ImportedCredential } from "./ididconnectorapi";
import type { IWalletConnectorAPI } from "./iwalletconnectorapi";

export type {
    // Main interface
    IConnector,

    // Main connector interfaces
    IDIDConnectorAPI,
    IWalletConnectorAPI,

    // Sub-types
    ImportedCredential
}