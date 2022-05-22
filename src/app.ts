import express, { ErrorRequestHandler, NextFunction, Request, Response } from "express";
import prisma from "./lib/prisma";
import eventRouter from "./Routes/event.routes";
import adminAuthRouter from "./Routes/admin_auth.routes";
import argon2 from "argon2";
import adminRouter from "./Routes/admin.routes";
import organisationRouter from "./Routes/organisation.routes";
import groupRouter from "./Routes/group.routes";
import disciplineRouter from "./Routes/discipline.routes";
import roleSchemaRouter from "./Routes/role_schema.routes";
import defaultErrorHandler from "./Middleware/error/handler";
import logger from "./Middleware/error/logger";
import debugLogger from "./Middleware/debug/logger";
import mediaRouter from "./Routes/media.routes";

// Set up async error handling
require("express-async-errors");

require("dotenv").config(); // Load dotenv config

const app = express();

if (process.env.NODE_ENV === "development") {
  logger.info("Using development mode");
}

async function main() {
  // Dev
  await prisma.admin.upsert({
    where: { id: 1 },
    create: {
      name: "admin",
      password: await argon2.hash("test", { type: argon2.argon2id }),
      permission_level: "ELEVATED",
    },
    update: {},
  });

  // Todo: Everything

  // Bodyparser and urlencoded to parse post request bodies
  app.use(express.urlencoded({ extended: true }));
  app.use(express.json());

  app.use(debugLogger);

  // Admin authentication endpoints
  app.use("/api/authentication", adminAuthRouter);

  // All API endpoints are behind /api/...
  app.use("/api/events", eventRouter);

  app.use("/api/admins", adminRouter);

  app.use("/api/organisations", organisationRouter);

  app.use("/api/groups", groupRouter);

  app.use("/api/disciplines", disciplineRouter);

  app.use("/api/role-schemas", roleSchemaRouter);

  app.use("/api/media", mediaRouter);

  // Error handling
  app.use(defaultErrorHandler); // This has to be the LAST ROUTE

  app.listen(process.env.PORT, () => {
    logger.info(`Listening on port ${process.env.PORT}`);
  });

  logger.info("Server started");

  process.on("exit", () => {
    logger.info("Server stopping...");
  });
}

main()
  .catch((e) => {
    logger.crit(e);
    throw e;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

export default app;
