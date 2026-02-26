type LogLevel = "debug" | "info" | "warn" | "error";

function getLevel(): LogLevel {
	const level = process.env["LOG_LEVEL"] as LogLevel | undefined;
	return level ?? "info";
}

const LEVEL_ORDER: Record<LogLevel, number> = {
	debug: 0,
	info: 1,
	warn: 2,
	error: 3,
};

function shouldLog(level: LogLevel): boolean {
	return LEVEL_ORDER[level] >= LEVEL_ORDER[getLevel()];
}

function log(level: LogLevel, msg: string, data?: Record<string, unknown>): void {
	if (!shouldLog(level)) return;

	const entry = {
		level,
		msg,
		time: new Date().toISOString(),
		...(data ?? {}),
	};

	const output = JSON.stringify(entry);
	if (level === "error" || level === "warn") {
		console.error(output);
	} else {
		console.log(output);
	}
}

export const logger = {
	debug(msg: string, data?: Record<string, unknown>): void {
		log("debug", msg, data);
	},
	info(msg: string, data?: Record<string, unknown>): void {
		log("info", msg, data);
	},
	warn(msg: string, data?: Record<string, unknown>): void {
		log("warn", msg, data);
	},
	error(msg: string, data?: Record<string, unknown>): void {
		log("error", msg, data);
	},
};
