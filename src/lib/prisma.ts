import { PrismaClient } from "@prisma/client";

// See here: https://github.com/prisma/prisma-client-js/issues/228#issuecomment-618433162
let prisma: PrismaClient;

prisma = new PrismaClient();

export default prisma;
