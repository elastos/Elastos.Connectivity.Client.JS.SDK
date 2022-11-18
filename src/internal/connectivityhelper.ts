import { connectivity } from "../connectivity";
import { globalLoggerService as logger } from "../services/global.logger.service";

export class ConnectivityHelper {
    /**
     * Ensures that an active connector is set.
     * If none, user is prompted to choose one.
     */
    public static async ensureActiveConnector(onActiveConnector: () => void, onCancelled: () => void) {
        if (connectivity.getActiveConnector() != null) {
            await this.sendContextToActiveConnector();
            onActiveConnector();
        }
        else {
            // If no active connector but only one connector available, we auto-activate it.
            if (connectivity.getAvailableConnectors().length == 1) {
                await connectivity.setActiveConnector(connectivity.getAvailableConnectors()[0].name);
                await this.sendContextToActiveConnector();
                onActiveConnector();
            }
            else {
                let selectedConnectorName = await connectivity.genericUIHandler.showConnectorChooser();
                if (selectedConnectorName) {
                    await this.sendContextToActiveConnector();
                    onActiveConnector();
                }
                else {
                    logger.warn("Cannot ensure active connector. No connector available, or user did not pick one");
                    onCancelled();
                }
            }
        }
    }

    /**
     * Send some javascript contextual information for connectors that need it.
     * This is used for example by the Essentials internal connector (built-in browser) to be able
     * to access DID and Connectivity SDK modules loaded by the main app, without bundling and loading
     * its own set of modules that would create duplicates and "instanceof DID" conflicts/bugs.
     */
    private static async sendContextToActiveConnector() {
        // Lazy import to reduce bundle sizes
        const didSdk = (await import("@elastosfoundation/did-js-sdk"));
        if ("setModuleContext" in connectivity.getActiveConnector())
            connectivity.getActiveConnector().setModuleContext(didSdk, connectivity);
    }
}