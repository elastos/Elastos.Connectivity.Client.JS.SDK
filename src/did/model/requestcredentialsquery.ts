export type UICustomization = {
  primaryColorLightMode: string,
  primaryColorDarkMode: string
}

/**
 * String representing a JSON-path query.
 * Ex: $.type[?(@ == "TestCredentialType")]
 */
export type JsonPath = string;

/**
 * A Claim describes what the calling application would like to retrieve from users identity wallet.
 * Helper methods are provided to build to the most claim configurations, such as:
 *    standardNameClaim("Your name")
 *    simpleTypeClaim("Your diploma", "https://my.web/credentials/diplomacredential/v1#DiplomaCredential")
 *
 * About min/max:
 *
 * These are the number of credentials that should be provided for this claim. min and max use 1 as default
 * value, meaning that the application expects users to provide exactly 1 credential. that matches. This claim
 * can be described as "required".
 *
 * In order to make a claim be optional (user can choose to not provide one), use min = 0.
 * In order to let user provide many credentials of a similar type, use max > 0.
 *
 * About the JSON path query:
 *
 * Complex queries can be made on credentials JSON structure, for example to get a credential of a given type
 * and with a specific kind on data in its content. Most of the time, using claim builder methods are enough
 * so that developers don't need to manually write JSON Path queries, but manual queries remain an option.
 *
 * Here is an example: $[?(@.type == "MyCustomCredential" && @.credentialSubject.myData == "someValue")]
 *
 * A JSON path online playground exists to test claim queries: https://jsonpath.com/
 */
export type Claim = {
  reason: string; // Reason displayed to user on the identity wallet UI.
  query: JsonPath; // Json path query to match user credentials against
  min?: number; // Minimum number of credentials that should be returned. Default: 1
  max?: number; // Maximum number of credentials that should be returned. Default: 1
  acceptUserAsIssuer?: boolean; // Whether returned credentials can be signed by the user himself. If set to false, providing "issuers" is mandatory. Default: true
  issuers?: string[]; // Credentials must have been issued by any of these specific DIDs. Default: undefined, meaning that any issuer is accepted.
}

export function simpleTypeClaim(reason: string, type: string): Claim {
  let claim: Claim = { reason, query: `$.type[?(@ == "${type}")]` };
  return claim;
}

export function standardNameClaim(reason: string): Claim {
  return simpleTypeClaim(reason, "NameCredential");
}

export function standardEmailClaim(reason: string): Claim {
  return simpleTypeClaim(reason, "EmailCredential");
}

// TODO: more standard claims for convenience

/**
 * Example of a standard credential - JSON path queries can be used on its fields:
     *
     * {
  "id": "did:elastos:iqeXQuCuUuZ2mdHuPUhQpQGFs4HqHixm3G#id36543284619842",
  "context": [
      "https://trinity-tech.io/credentials/displayablecredential/v1"
      "https://trinity-tech.io/credentials/emailcredential/v1"
  ],
  "type": [
    "DisplayableCredential"
    "EmailCredential"
  ],
  "issuer": "did:elastos:insTmxdDDuS9wHHfeYD1h5C2onEHh3D8Vq",
  "issuanceDate": "2021-10-19T06:57:01.000Z",
  "expirationDate": "2021-10-23T06:57:01.000Z",
  "credentialSubject": {
    "displayable": {
       "icon": "https://path.to/icon.png",
       "name": "@email"
    },
    "email": "ben@ben.com"
  },
  "proof": {
    "type": "ECDSAsecp256r1",
    "created": "2021-10-19T06:57:01Z",
    "verificationMethod": "did:elastos:insTmxdDDuS9wHHfeYD1h5C2onEHh3D8Vq#primary",
    "signature": "fJoEiNIlhMFheoDZPukYtz_Nox8_ITtZOtVMskozn8qGydTnRlqYuRveUNT9JqDBPZWMv8mgSkQUWpmjywqweg"
  }
}
 * Where to find standard credential types?
 * TODO - documentation portal AND/OR credentials playground
 */
export type RequestCredentialsQuery = {
  /** List of claims that have to be provided by the user. */
  claims: Claim[],
  /** Optional DID string to which this request must be sent. If provided, the identity wallet must force to select that user's identity. */
  sub?: string,
  /** Can optionally force the DID to be published. If set to false, the identity wallet can allo unpublished DID to return data, but the claling app won't be able to verify the signature. Default: true */
  didMustBePublished?: boolean,
  /** Optional UI customization to match the calling website or app's style. */
  customization?: UICustomization
}