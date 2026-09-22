/**
 * @system watchdog
 * @status handwritten
 * @edit edit directly
 *
 * Periodic health probe with automatic state tracking, structured logging,
 * degraded/recovered callbacks, and auto-registration into the global registry.
 */

import { watchdogRegistry } from "./registry.ts";
import type {
	WatchdogHandle,
	WatchdogOptions,
	WatchdogResult,
	WatchdogStatus,
} from "./types.ts";

export function createWatchdog(
	name: string,
	opts: WatchdogOptions,
): WatchdogHandle {
	let intervalId: ReturnType<typeof setInterval> | null = null;
	let lastResult: WatchdogResult | null = null;
	let lastRunAt: string | null = null;
	let consecutiveFailures = 0;
	let wasHealthy = true;
	let running = false;
	const intervalMs = opts.intervalMs;

	async function runCheck(): Promise<WatchdogResult> {
		let result: WatchdogResult;
		try {
			result = await opts.check();
			if (!result || typeof result.healthy !== "boolean") {
				result = {
					healthy: false,
					details: {
						error: "check() returned invalid result",
						returned:
							result === undefined
								? "undefined"
								: result === null
									? "null"
									: String(result),
					},
				};
			}
		} catch (error) {
			result = {
				healthy: false,
				details: {
					error: error instanceof Error ? error.message : String(error),
				},
			};
		}

		lastResult = result;
		lastRunAt = new Date().toISOString();

		if (result.healthy) {
			if (!wasHealthy) {
				wasHealthy = true;
				consecutiveFailures = 0;
				await opts.onRecovered?.(result);
			} else {
				consecutiveFailures = 0;
			}
		} else {
			consecutiveFailures++;
			if (wasHealthy) {
				wasHealthy = false;
				await opts.onDegraded?.(result);
			} else {
				await opts.onDegraded?.(result);
			}
		}

		return result;
	}

	const handle: WatchdogHandle = {
		name,

		start(): void {
			if (running) return;
			running = true;
			if (opts.runOnStart !== false) {
				void runCheck();
			}
			intervalId = setInterval(() => {
				void runCheck();
			}, intervalMs);
			// Unref so the timer doesn't keep the event loop polling short between
			// fires. The service stays alive via Bun.serve() (always ref'd); the
			// watchdog still fires on schedule but doesn't contribute to the epoll
			// minimum-expiry between fires. Without this, N phased second-scale
			// watchdog timers produce a short observed epoll timeout even though
			// no single timer is short (idle-costs-nothing).
			intervalId.unref?.();
		},

		stop(): void {
			if (!running) return;
			running = false;
			if (intervalId) {
				clearInterval(intervalId);
				intervalId = null;
			}
		},

		runOnce(): Promise<WatchdogResult> {
			return runCheck();
		},

		get status(): WatchdogStatus {
			return {
				name,
				running,
				intervalMs,
				lastResult,
				lastRunAt,
				consecutiveFailures,
				enabled: running,
			};
		},
	};

	watchdogRegistry.register(handle);
	return handle;
}
