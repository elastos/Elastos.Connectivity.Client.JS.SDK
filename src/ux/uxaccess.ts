import { connectivity } from "../connectivity";
import { notImplementedError } from "../did/utils";
import { ConnectivityHelper } from "../internal/connectivityhelper";

export class UXAccess {
    constructor() {
    }

    /**
     * On boards users in the wallet application into specific features.
     * The on boarding flow must be that the wallet application shows a welcome screen to introduce the feature,
     * and after confirmation, the user is redirected to the actual feature inside the wallet.
     *
     * If the app DID is set on the connectivity SDK, the wallet on boarding screen must display application information
     * to make users at east (app icon, app name).
     *
     * All parameters can be set to null except 'feature'. Null parameters are replaced by default values based on the given
     * feature.
     *
     * If a wallet doesn't implement the target feature, it is expected to let the user know that this feature is not available,
     * then return a response.
     *
     * Usage example:
     *
     * onBoard("easybridge", "Bridge tokens easily", "Start quickly on Meteast on Elastos: get ELA in less than 2 minutes from other chains.", "Get ELA now");
     */
    public async onBoard?(feature: string, title: string | null, introduction: string | null, button: string | null): Promise<void> {
        return new Promise((resolve, reject) => {
            ConnectivityHelper.ensureActiveConnector(async () => {
                if (!connectivity.getActiveConnector().onBoard) {
                    reject(notImplementedError());
                    return;
                }

                // Make sure a feature is provided
                if (!feature) {
                    reject(new Error("Parameter feature must be given"));
                    return;
                }

                try {
                    let result = await connectivity.getActiveConnector().onBoard(feature, title, introduction, button);
                    resolve(result);
                }
                catch (e) {
                    reject(e);
                }
            }, () => {
                resolve(null);
            });
        });
    }
}
