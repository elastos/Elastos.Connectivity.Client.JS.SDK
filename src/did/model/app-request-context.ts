/**
 * Custom contextual information proivded by the initiating app and returned as is to the application
 * in the
 */
export type AppRequestContext = {
  purpose?: string; // Main app-defined reason why this api call is made, to the app to better track its requests.
  customJson?: any; // Any kind of app defined additional json data. This must be serializable.
}
