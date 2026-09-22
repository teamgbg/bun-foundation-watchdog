/**
 * @system watchdog
 * @status handwritten
 * @edit edit directly
 *
 * Configured-primitive entry point for the watchdog package.
 */

import { watchdogRegistry } from "./registry.ts";
import type { WatchdogConfig } from "./types.ts";

export function configure(opts: WatchdogConfig): void {
	if (opts.overrides) {
		for (const [name, override] of Object.entries(opts.overrides)) {
			if (override.enabled === false) {
				watchdogRegistry.disable(name);
			} else if (override.enabled === true) {
				watchdogRegistry.enable(name);
			}
		}
	}
}
