export type DeleteCredentialOptions = {
  /**
   * The identity wallet should delete the credentials from user's DID Document and
   * publish the DID document on chain at the same time. This means that the calling application
   * is willing to force this credential to be publicly deleted.
   */
  forceToPublishCredentials?: boolean;
}