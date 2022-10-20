import prisma from "../../lib/prisma";
import crypto from "crypto";
import argon2 from "argon2";
import logger from "../error/logger";

require("express-async-errors");

export const generateDefaultCredentials = async () => {
  const name: string = "Detleph_" + crypto.randomBytes(3).toString("base64url");

  const pw: string = crypto.randomBytes(8).toString("base64url");

  await prisma.admin.upsert({
    where: { id: 1 },
    create: {
      name,
      password: await argon2.hash(pw, { type: argon2.argon2id }),
      permission_level: "ELEVATED",
    },
    update: {},
  });

  logger.notice("Default admin name is:  " + name);
  logger.notice("Confidential password:  " + pw);
};
