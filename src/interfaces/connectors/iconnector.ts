import type * as didSdk from "@elastosfoundation/did-js-sdk";
import type { connectivity } from "../..";
import type { IDIDConnectorAPI } from "./ididconnectorapi";
import type { IUXConnectorAPI } from "./iuxconnectorapi";
import type { IWalletConnectorAPI } from "./iwalletconnectorapi";

export interface IConnector extends IDIDConnectorAPI, IWalletConnectorAPI, IUXConnectorAPI {
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
}