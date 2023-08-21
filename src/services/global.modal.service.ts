import ModalContainer from "../internal/defaultui/shared/ModalContainer.svelte";
import { getGlobalSingleton } from "../singleton";

class GlobalModalService {
	private genericModalContainer: ModalContainer;

	constructor() { }

	public getModal(): ModalContainer {
		if (!this.genericModalContainer) {
			this.genericModalContainer = new ModalContainer({
				target: document.body
			});
		}

		return this.genericModalContainer;
	}
}

export const globalModalService = getGlobalSingleton<GlobalModalService>("modal", () => new GlobalModalService());
