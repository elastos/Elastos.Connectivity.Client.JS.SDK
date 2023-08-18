import type * as didSdk from "@elastosfoundation/did-js-sdk";
import type { connectivity } from "../..";
import type { IDIDConnectorAPI } from "./ididconnectorapi";
import type { IDIDConnectorAPIV2 } from "./ididconnectorapiv2";
import type { IUXConnectorAPI } from "./iuxconnectorapi";
import type { IWalletConnectorAPI } from "./iwalletconnectorapi";

export type ConnectorResponseHandler = (requestId: string, responsePayload: any) => Promise<void>;
export interface IConnector extends IDIDConnectorAPI, IDIDConnectorAPIV2, IWalletConnectorAPI, IUXConnectorAPI {
    name: string;

    /**
     * Returns the connector name to be displayed on UI. This name may be localized for
     * the active language.
     */
    getDisplayName(): Promise<string>;

    /**
     * Returns the ethereum/EVM compatible web3 provider used by this connector.
     * This provider can be used to initialize Web3 instances in order to send ethereum commands
     * such as eth_getAccounts, eth_sendTransaction.
     */
    getWeb3Provider(): any; // Don't export "web3-core" provider type here from the interface

    setModuleContext?(didSDK: typeof didSdk, connectivityInstance: typeof connectivity);

    /**
     * Lets the connectivity SDK register a handler on all connectors that support the V2 interface,
     * in order for connectors to let the connectivity SDK know when a response is being received (ie: after
     * a url redirection), so that the connectivity SDK can get the expected response and forward it to the client
     * application.
     */
    registerResponseHandler?(handler: ConnectorResponseHandler);
}