
/**
 * NOTE: All methods are marked as optional to avoid breaking builds when adding new methods to the
 * connectivity SDK, while some connectors are not updated yet. But all implementations are
 * actually required.
 */
export interface IUXConnectorAPI {
    onBoard?(feature: string, title: string, introduction: string, button: string);
}