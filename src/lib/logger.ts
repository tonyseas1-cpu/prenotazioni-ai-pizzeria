type LogLevel = "info" | "warn" | "error" | "debug";

export class Logger {
  private static format(level: LogLevel, message: string, meta?: any) {
    const timestamp = new Date().toISOString();
    const payload = {
      timestamp,
      level: level.toUpperCase(),
      message,
      ...(meta ? { data: meta } : {}),
    };
    return JSON.stringify(payload);
  }

  static info(message: string, meta?: any) {
    console.log(this.format("info", message, meta));
  }

  static warn(message: string, meta?: any) {
    console.warn(this.format("warn", message, meta));
  }

  static error(message: string, error?: any, meta?: any) {
    console.error(
      this.format("error", message, {
        error: error instanceof Error ? { message: error.message, stack: error.stack } : error,
        ...meta,
      })
    );
  }

  static debug(message: string, meta?: any) {
    if (process.env.NODE_ENV !== "production") {
      console.log(this.format("debug", message, meta));
    }
  }
}
