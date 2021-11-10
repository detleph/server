import { Request, Response } from "express";
import { Admin, AdminLevel, Group } from "@prisma/client";
import { authClient } from "../lib/redis";
import prisma from "../lib/prisma";
import argon2 from "argon2";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "secret";
const TOKEN_EXPIRY = "4 days";

function createAdminJWT(admin: Admin & { groups: Group[] }) {
  const payload: { name: string; permission_level: AdminLevel; revision: string; groups: string[] } = {
    name: admin.name,
    permission_level: admin.permission_level,
    revision: admin.revision,
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

  const { name, password } = req.body;

  if (name == null || password == null) {
    return res.status(400).json({
      type: "error",
      payload: {
        message: "The body must contain 'name' and 'password' attributes of type string",
      },
    });
  }

  const user = await prisma.admin.findFirst({ where: { name }, include: { groups: true } });

  // REVIEW: It is possible to initiate a timing attack here (To see which users exist)
  //         This should, however, not be of too much concern, as one can basically do nothing
  //         with only the username

  if (!user) {
    return res.status(404).json({
      type: "error",
      payload: {
        message: `The provided credentials are not valid`,
      },
    });
  }

  const param_password_hash = await argon2.hash(password, { type: argon2.argon2id });

  if (param_password_hash === user.password) {
    // Set password revision ID in redis
    await authClient.set(user.pid, user.revision);

    return {
      type: "success",
      payload: {
        token: createAdminJWT(user),
      },
    };
  }

  return {
    type: "error",
    payload: {
      message: "The provided credentials are not valid",
    },
  };
};
