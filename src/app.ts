import express from "express";
import prisma from "./lib/prisma";
import eventRouter from "./Routes/event.routes";

require("dotenv").config(); // Load dotenv config

const app = express();

async function main() {
  // Todo: Everything

  // Bodyparser and urlencoded to parse post request bodies
  app.use(express.urlencoded({ extended: true }));
  app.use(express.json());

  app.use("/api/events", eventRouter);

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
