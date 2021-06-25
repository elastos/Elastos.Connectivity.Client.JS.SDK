import { DIDAccess } from "./didaccess";
import { DIDHelper } from "./didhelper";
import type { FastDIDCreationResult } from "./fastdidcreationresult";
import type { UICustomization,  GetCredentialsQuery } from "./model/getcredentialsquery";
import { ElastosIODIDAdapter, ElastosIODIDAdapterMode } from "./elastosiodidadapter";
import type { ImportedCredential } from "./model/importedcredential";
import type { ImportCredentialOptions } from "./model/importcredentialoptions";
import type { SignedData } from "../did/model/signeddata";

export type {
    FastDIDCreationResult,
    UICustomization,
    GetCredentialsQuery,
    ImportedCredential,
    ImportCredentialOptions,
    SignedData
}

export {
    DIDAccess,
    DIDHelper,
    ElastosIODIDAdapter,
    ElastosIODIDAdapterMode
}
