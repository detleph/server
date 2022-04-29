import { NextFunction, Request, Response } from "express";
import logger from "../error/logger";

export default function debugLogger(req: Request, res: Response, next: NextFunction) {
  // Only log when in development mode
  if (process.env.NODE_ENV === "development") {
    logger.debug(`Request to: ${req.url}`);
  }

  next();
}
