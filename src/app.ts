import express, { ErrorRequestHandler, NextFunction, Request, Response } from "express";
import prisma from "./lib/prisma";
import eventRouter from "./Routes/event.routes";
import adminAuthRouter from "./Routes/admin_auth.routes";
import argon2 from "argon2";
import cors from "cors";
import adminRouter from "./Routes/admin.routes";
import organisationRouter from "./Routes/organisation.routes";
import groupRouter from "./Routes/group.routes";
import disciplineRouter from "./Routes/discipline.routes";
import roleSchemaRouter from "./Routes/role_schema.routes";
import defaultErrorHandler from "./Middleware/error/handler";
import logger from "./Middleware/error/logger";
import debugLogger from "./Middleware/debug/logger";
import mediaRouter from "./Routes/media.routes";
import userRouter from "./Routes/user_auth.routes";
import TeamRouter from "./Routes/team.routes";
import { notFoundHandler, rootHandler } from "./Middleware/error/defaultRoutes";

// Set up async error handling
require("express-async-errors");

require("dotenv").config(); // Load dotenv config

const app = express();

async function main() {
  if (process.env.NODE_ENV === "development") {
    logger.info("Using development mode");
    logger.warning(
      "This mode should not be used in any production-near environment as it is significantly less secure than the production mode"
    );

    // TODO: How should you login to the prod server by default? Maybe random password?
    await prisma.admin.upsert({
      where: { id: 1 },
      create: {
        name: "admin",
        password: await argon2.hash("test", { type: argon2.argon2id }),
        permission_level: "ELEVATED",
      },
      update: {},
    });

    // Allow all CORS requests
    app.use(cors());
  } else {
    logger.info("Using production mode");

    // Configure cors
    app.use(
      cors({
        origin: process.env.ALLOW_ORIGIN,
        allowedHeaders: ["Content-Type", "Authorization"],
        preflightContinue: false,
        methods: ["GET", "PUT", "PATCH", "POST", "DELETE"],
        optionsSuccessStatus: 204,
      })
    );
  }

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

  app.use("/api/users", userRouter);

  app.use("/api/teams", TeamRouter);

  app.get("/", rootHandler);
  app.get("/api", rootHandler);

  // Error handling
  app.use(defaultErrorHandler); // This has to be the LAST ROUTE

  // Disable the media router for now
  // app.use("/api/media", mediaRouter);

  app.use(notFoundHandler);

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
