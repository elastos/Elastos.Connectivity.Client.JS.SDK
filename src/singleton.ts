export function getGlobalSingleton<T>(context: string, onSingletonCreation: () => T): T {
    if (!globalThis["elastosconnectivity"])
        globalThis["elastosconnectivity"] = {};

    if (!globalThis["elastosconnectivity"][context]) {
        // Create a singleton and save it globally
        let singleton = onSingletonCreation();
        globalThis["elastosconnectivity"][context] = singleton;
        return singleton;
    } else {
        return globalThis["elastosconnectivity"][context];
    }
}