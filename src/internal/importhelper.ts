/**
 * This helper allows to easily do a dynamic import of one of the most used (and largest...)
 * dependency libraries.
 * If the library was already imported, the cached version is returned.
 *
 * NOTE: we cannot make a generic method with a "module" string name because webpack would not
 * be able to track the dependency modules.
 */
import type { DID, DIDStore, JWTParserBuilder, Mnemonic, RootIdentity, VerifiableCredential, VerifiablePresentation } from "@elastosfoundation/did-js-sdk";

let importsCache: { [moduleName: string]: any } = {};

export const lazyElastosDIDSDKImport = async (): Promise<{
  JWTParserBuilder: typeof JWTParserBuilder,
  VerifiablePresentation: typeof VerifiablePresentation,
  VerifiableCredential: typeof VerifiableCredential,
  DID: typeof DID,
  DIDStore: typeof DIDStore,
  Mnemonic: typeof Mnemonic,
  RootIdentity: typeof RootIdentity
}> => {
  if (!importsCache["@elastosfoundation/did-js-sdk"])
    importsCache["@elastosfoundation/did-js-sdk"] = await import("@elastosfoundation/did-js-sdk");

  return {
    JWTParserBuilder: importsCache["@elastosfoundation/did-js-sdk"].JWTParserBuilder,
    VerifiablePresentation: importsCache["@elastosfoundation/did-js-sdk"].VerifiablePresentation,
    VerifiableCredential: importsCache["@elastosfoundation/did-js-sdk"].VerifiableCredential,
    DID: importsCache["@elastosfoundation/did-js-sdk"].DID,
    DIDStore: importsCache["@elastosfoundation/did-js-sdk"].DIDStore,
    Mnemonic: importsCache["@elastosfoundation/did-js-sdk"].Mnemonic,
    RootIdentity: importsCache["@elastosfoundation/did-js-sdk"].RootIdentity
  };
}
