import { connectivity } from "./connectivity";
import * as DID from "./did";
import * as Hive from "./hive";
import * as Interfaces from "./interfaces";
import { GenericUIHandler } from "./internal/defaultui/genericuihandler";
import { globalLocalizationService as localization } from "./services/global.localization.service";
import { globalLoggerService as logger } from "./services/global.logger.service";
import { globalStorageService as storage } from "./services/global.storage.service";
import { globalThemeService as theme } from "./services/global.theme.service";
import * as UX from "./ux";
import * as Wallet from "./wallet";

// Provide a default generic UI handler that can be replaced later.
connectivity.setGenericUIHandler(new GenericUIHandler());

export {
    Interfaces,

    // Classes
    DID,
    Hive,
    Wallet,
    UX,

    // Singleton instances
    connectivity,
    localization,
    theme,
    storage,
    logger
};
