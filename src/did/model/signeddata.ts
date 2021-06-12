/**
 * Response to a sign data request. This type holds both the original JWT response string, and also
 * the extracted information (signature, signing DID) for convenience.
 */
 export type SignedData = {
    /** DID Url of the signer */
    signingDID: string;
    /** Public key of the signer */
    publicKey: string;
    /** Generated signature using the given data, with the selected DID’s keypair */
    signature: string;
    /** Raw response as a JWT string, signed by user's DID. Can be used to let the DID SDK verify that the returned information is genuine. */
    jwtResponse: string
}