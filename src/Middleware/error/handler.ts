import { PrismaClientUnknownRequestError } from "@prisma/client/runtime";
import { NextFunction, Request, Response } from "express";
import ForwardableError from "./ForwardableError";
import logger from "./logger";

const env = process.env.NODE_ENV || "production";

export default function defaultErrorHandler(err: any, req: Request, res: Response, next: NextFunction) {
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
}
