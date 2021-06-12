
export type UICustomization = {
    primaryColorLightMode: string,
    primaryColorDarkMode: string
}

export type GetCredentialsQuery = {
    /**
     * JSON Object that holds a list of claims that need to be provided by the user.
     *
     * Format example:
     *
     * "claims": {
     *      // default parameters: required: true, no reason, no specific iss requirement
     *      "CLAIM_NAME": true,
     *      // or
     *      "CLAIM_NAME": {
     *          // If a required field cannot be provided, the request will fail
     *          "required": true | false,
     *          // Optional
     *          "reason": "Reason displayed to user",
     *          // Requirements about the credential issue (ex: if we want to target a specific organization)
     *          "iss": {
     *              // Set selfproclaimed to true if you would like to only accept credentials that have been verified
     *              // via specific issuer DIDs
     *              "selfproclaimed": "false",
     *              // Credential must have been issued by any of these specific DIDs. Note that "selfproclaimed"
     *              // must be set to true in order to use this parameter
     *              "did":["issuer_did1", "issuer_did2"]
     *          }
     *      }
     * }
     */
    claims: any,
    /** Optional DID string to which this request must be sent. If provided, the identity wallet must force to select that user's identity. */
    sub?: string,
    /** Can optionally force the DID to be published. If set to false, the identity wallet can allo unpublished DID to return data, but the claling app won't be able to verify the signature. Default: true */
    didMustBePublished?: boolean,
    /** Optional UI customization to match the calling ebsite or app's style. */
    customization?: UICustomization
}