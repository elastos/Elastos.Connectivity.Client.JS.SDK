import { DefaultDIDAdapter } from "@elastosfoundation/did-js-sdk";

export enum ElastosIODIDAdapterMode {
    MAINNET = "mainnet",
    TESTNET = "testnet",
    DEVNET = "devnet"
}

/**
 * Convenient DID adapter for the elastos.io node.
 * Applications can use this adapter for a convenient way to initialize their DIDBackend,
 * or any other implementation of a DIDAdapter / DefaultDIDAdapter.
 */
export class ElastosIODIDAdapter extends DefaultDIDAdapter {
    constructor(mode: ElastosIODIDAdapterMode) {
        let resolverUrl = null;
        switch (mode) {
            case ElastosIODIDAdapterMode.MAINNET:
                resolverUrl = "https://api.elastos.io/eid";
                break;
            case ElastosIODIDAdapterMode.TESTNET:
                resolverUrl = "https://api-testnet.elastos.io/eid";
                break;
            case ElastosIODIDAdapterMode.DEVNET:
                resolverUrl = "https://api-testnet.elastos.io/newid"; // TODO: TEMPORARY URL DURING DID JS SDK DEV
                break;
            default:
                throw new Error("Unhandled ElastosIO DID adapter mode: "+mode);
        }
        console.log("Using ElastosIO DID adapter with resolver url:", resolverUrl)
        super(resolverUrl);
    }
}