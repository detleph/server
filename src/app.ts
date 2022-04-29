import express, {
  ErrorRequestHandler,
  NextFunction,
  Request,
  Response,
} from "express";
import prisma from "./lib/prisma";
import eventRouter from "./Routes/event.routes";
import adminAuthRouter from "./Routes/admin_auth.routes";
import argon2 from "argon2";
import adminRouter from "./Routes/admin.routes";
import organisationRouter from "./Routes/organisation.routes";
import groupRouter from "./Routes/group.routes";

require("dotenv").config(); // Load dotenv config

const app = express();

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

  app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    if (err) {
      res.status(400).send({
        type: "error",
        payload: "The body of your request did not contain valid data",
      });
    } else {
      next();
    }
  });

  // Admin authentication endpoints
  app.use("/api/authentication", adminAuthRouter);

  // All API endpoints are behind /api/...
  app.use("/api/events", eventRouter);

  app.use("/api/admins", adminRouter);

  app.use("/api/organisations", organisationRouter);

  app.use("/api/groups", groupRouter);
  app.listen(process.env.PORT, () => {
    console.log(`Listening on Port: ${process.env.PORT}`);
  });
}

main()
  .catch((e) => {
    throw e;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

export default app;
