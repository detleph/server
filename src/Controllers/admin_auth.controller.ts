import { Request, Response } from "express";
import { Admin, AdminLevel, Group } from "@prisma/client";
import { authClient } from "../lib/redis";
import prisma from "../lib/prisma";
import argon2 from "argon2";
import jwt from "jsonwebtoken";
import { DataType, generateInvalidBodyError } from "./common";

const JWT_SECRET = process.env.JWT_SECRET;
const TOKEN_EXPIRY = "4 days";

export interface AuthJWTPayload {
  pid: string;
  name: string;
  permission_level: AdminLevel;
  revision: string;
  groups: string[];
}

function createAdminJWT(admin: Admin & { groups: Group[] }) {
  if (!JWT_SECRET) {
    throw new Error("JWT_SECRET not set");
  }

  const payload: AuthJWTPayload = {
    pid: admin.pid,
    name: admin.name,
    permission_level: admin.permission_level,
    revision: admin.revision.toISOString(),
    groups: admin.groups.map((group) => group.pid),
  };

  return jwt.sign(payload, JWT_SECRET, { expiresIn: TOKEN_EXPIRY });
}

interface AuthenticateUserBody {
  name?: string;
  password?: string;
}

export const authenticateUser = async (req: Request<{}, {}, AuthenticateUserBody>, res: Response) => {
  // TODO: Provide more useful error messages (Maybe express-validator?)

  const { name, password } = req.body || {};

  if (name == null || password == null) {
    return res.status(400).json(generateInvalidBodyError({ name: DataType.STRING, password: DataType.STRING }));
  }

  const user = await prisma.admin.findFirst({ where: { name }, include: { groups: true } });

  // REVIEW: It is possible to initiate a timing attack here (To see which users exist)
  //         This should, however, not be of too much concern, as one can basically do nothing
  //         with only the username

  if (!user) {
    return res.status(403).json({
      type: "error",
      payload: {
        message: `The provided credentials are not valid`,
      },
    });
  }

  if (await argon2.verify(user.password, password, { type: argon2.argon2id })) {
    // Set password revision ID in redis
    await authClient.set(user.pid, user.revision.toISOString());

    return res.status(200).json({
      type: "success",
      payload: {
        token: createAdminJWT(user),
      },
    });
  }

  return res.status(403).json({
    type: "error",
    payload: {
      message: "The provided credentials are not valid",
    },
  });
};
