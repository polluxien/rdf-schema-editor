type Level = "INFO" | "WARN" | "ERROR" | "DEBUG";

function ts() {
  return new Date().toISOString();
}

function write(level: Level, msg: string, meta?: unknown) {
  const line = meta !== undefined
    ? `[${ts()}] ${level.padEnd(5)} ${msg} ${JSON.stringify(meta)}`
    : `[${ts()}] ${level.padEnd(5)} ${msg}`;

  if (level === "ERROR" || level === "WARN") {
    console.error(line);
  } else {
    console.log(line);
  }
}

export const logger = {
  info:  (msg: string, meta?: unknown) => write("INFO",  msg, meta),
  warn:  (msg: string, meta?: unknown) => write("WARN",  msg, meta),
  error: (msg: string, meta?: unknown) => write("ERROR", msg, meta),
  debug: (msg: string, meta?: unknown) => {
    if (process.env.NODE_ENV !== "production") write("DEBUG", msg, meta);
  },
};
