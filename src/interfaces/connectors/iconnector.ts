import type { provider } from "web3-core";
import type { IDIDConnectorAPI } from "./ididconnectorapi";
import type { IWalletConnectorAPI } from "./iwalletconnectorapi";

export interface IConnector extends IDIDConnectorAPI, IWalletConnectorAPI {
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
    getWeb3Provider(): provider;
}