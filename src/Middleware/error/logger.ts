import winston, { createLogger } from "winston";

const {
  format: { printf, colorize, combine, timestamp, json, errors, prettyPrint },
} = winston;

const defaultJsonFormat = combine(errors({ stack: true }), timestamp(), json({ space: 2 }));

export const customCLIFormat = printf(({ level, message, label, timestamp, stack }) => {
  let output = `${level}${stack ? `(1/2:message)` : ""} at ${timestamp}${label ? ` (#${label})` : ""}: ${message}${
    stack ? "\n" : ""
  }`;

  if (stack) {
    output += `\n${level}(2/2:stack)${label ? ` (#${label})` : ""}: ${stack}\n\n`;
  }

  return output;
});

export default createLogger({
  levels: winston.config.syslog.levels,
  format: combine(errors({ stack: true }), timestamp()),
  transports: [
    new winston.transports.Console({
      level: "debug",
      format: combine(timestamp(), colorize(), customCLIFormat),
    }),
    new winston.transports.File({
      filename: "/app/error.log",
      level: "error",
      format: defaultJsonFormat,
    }),
    new winston.transports.File({
      level: "debug",
      filename: "/app/debug.log",
      format: defaultJsonFormat,
      silent: !(process.env.NODE_ENV === "development"), // Silent when not in development
    }),
  ],
});
