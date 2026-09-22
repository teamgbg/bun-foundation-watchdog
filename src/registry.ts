/**
 * @system watchdog
 * @status handwritten
 * @edit edit directly
 *
 * Process-global registry of all watchdogs for observability and control.
 */

import type { WatchdogHandle, WatchdogStatus } from "./types.ts";

const entries = new Map<string, WatchdogHandle>();

export const watchdogRegistry = {
	register(handle: WatchdogHandle): void {
		if (entries.has(handle.name)) {
			throw new Error(`[watchdog] duplicate watchdog name: "${handle.name}"`);
		}
		entries.set(handle.name, handle);
	},

	unregister(name: string): void {
		entries.delete(name);
	},

	getAll(): WatchdogStatus[] {
		return [...entries.values()].map((h) => h.status);
	},

	get(name: string): WatchdogHandle | undefined {
		return entries.get(name);
	},

	disable(name: string): void {
		const handle = entries.get(name);
		if (handle) handle.stop();
	},

	enable(name: string): void {
		const handle = entries.get(name);
		if (handle) handle.start();
	},

	stopAll(): void {
		for (const handle of entries.values()) {
			handle.stop();
		}
	},

	startAll(): void {
		for (const handle of entries.values()) {
			handle.start();
		}
	},
};
