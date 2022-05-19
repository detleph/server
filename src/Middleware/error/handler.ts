import { PrismaClientUnknownRequestError } from "@prisma/client/runtime";
import { NextFunction, Request, Response } from "express";
import ForwardableError from "./ForwardableError";
import logger from "./logger";

const env = process.env.NODE_ENV || "production";

type ErrorHandler = (err: any, req: Request, res: Response) => boolean;

const customHandlers: ErrorHandler[] = [];

export function addCustomHandler(handler: ErrorHandler) {
  customHandlers.push(handler);
}

export function removeCustomHandler(handler: ErrorHandler): Boolean {
  const index = customHandlers.findIndex((h) => h === handler);

  if (index < 0) {
    return false;
  }

  customHandlers.splice(index);

  return true;
}

export default function defaultErrorHandler(err: any, req: Request, res: Response, next: NextFunction) {
  for (const handler of customHandlers) {
    // Run custom handler
    if (handler(err, req, res)) {
      return;
    }
  }

  if (ForwardableError.isForwardableError(err)) {
    return res.status(err.status).json({
      type: "error",
      payload: {
        message: err.message,
        ...(env === "development"
          ? {
              stack: err.stack,
            }
          : {}),
      },
    });
  }

  if (err instanceof PrismaClientUnknownRequestError) {
    logger.warning(err);

    return res.status(404).json({
      type: "error",
      payload: {
        message: "An unknown error occured. This could be due to malformed IDs",
        ...(env === "development"
          ? {
              prisma: err.message,
              stack: err.stack,
            }
          : {}),
      },
    });
  }

  logger.error("--- Unhandled error ---");
  logger.error(err);

  return res.status(err.status).json({
    type: "error",
    payload: {
      message: err.message,
      ...(env === "development"
        ? {
            notice: "This error was not caught by any handler, please add handling!",
            stack: err.stack,
          }
        : {}),
    },
  });
}
