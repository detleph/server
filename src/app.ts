import express from "express";
import prisma from "./lib/prisma";
import eventRouter from "./Routes/event.routes";
import adminAuthRouter from "./Routes/admin_auth.routes";
import argon2 from "argon2";
import adminRouter from "./Routes/admin.routes";

require("dotenv").config(); // Load dotenv config

const app = express();

async function main() {
  // Dev
  await prisma.admin.upsert({
    where: { id: 1 },
    create: { name: "admin", password: await argon2.hash("test", { type: argon2.argon2id }) },
    update: {},
  });

  // Todo: Everything

  // Bodyparser and urlencoded to parse post request bodies
  app.use(express.urlencoded({ extended: true }));
  app.use(express.json());

  // Admin authentication endpoints
  app.use("/api/authentication", adminAuthRouter);

  // All API endpoints are behind /api/...
  app.use("/api/events", eventRouter);

  app.use("/api/admins", adminRouter);

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
