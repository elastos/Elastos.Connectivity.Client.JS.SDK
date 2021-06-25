export type ImportCredentialOptions = {
  /**
   * The identity wallet should add the credentials to user's DID Document and
   * publish the DID document on chain at the same time. This means that the calling application
   * is willing to force this credential to be publicly visible.
   */
  forceToPublishCredentials?: boolean;
}