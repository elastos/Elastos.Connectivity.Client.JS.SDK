import type { DIDURL } from "@elastosfoundation/did-js-sdk";

export type ImportedCredential = {
    id: DIDURL; // VerifiableCredential id
    // published: boolean; // TODO ?
}