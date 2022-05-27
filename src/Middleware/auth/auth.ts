/// <reference path="../../custom.d.ts" />

import { NextFunction, Request, Response } from "express";
import { AuthJWTPayload } from "../../Controllers/admin_auth.controller";
import { authClient } from "../../lib/redis";
import jwt, { JsonWebTokenError, JwtPayload } from "jsonwebtoken";
import prisma from "../../lib/prisma";

const JWT_SECRET = process.env.JWT_SECRET || "secret";

export const verifyAuthorizationFormat = (authorization: string) => /^Bearer .+$/.test(authorization);

export const getBearerToken = (authorization: string) => authorization.slice(7);

export const requireAuthentication = async (req: Request, res: Response, next: NextFunction) => {
  const { authorization } = req.headers;

  if (!authorization) {
    return res.status(403).send({
      type: "error",
      payload: {
        message: "The requeset did not include the Authorization header",
      },
    });
  }

  if (!verifyAuthorizationFormat(authorization)) {
    return res.status(400).send({
      type: "error",
      payload: {
        message: "Malformed Authorization header",
        format: "Bearer <token>",
      },
    });
  }

  let token_payload_: string | JwtPayload;

  try {
    token_payload_ = jwt.verify(getBearerToken(authorization), JWT_SECRET);
  } catch (e) {
    if (e instanceof JsonWebTokenError) {
      return res.status(403).json({
        type: "error",
        payload: {
          message: "Token could not be verified; It might be expired",
        },
      });
    }

    throw e;
  }

  const token_payload = token_payload_ as AuthJWTPayload;

  const { pid, revision } = token_payload;

  let db_revision = await authClient.get(pid);

  if (db_revision === null) {
    // Load the revision ID from the main DB and cache it in redis
    const user = await prisma.admin.findUnique({ where: { pid }, select: { revision: true } });

    if (user) {
      db_revision = user.revision.toISOString();

      await authClient.set(pid, db_revision);
    }
  }

  if (revision !== db_revision || !revision || !db_revision) {
    return res.status(403).json({
      type: "error",
      payload: {
        message: "Token could not be verified; It might be expired",
      },
    });
  }

  req.auth = {
    isAuthenticated: true,
    pid: token_payload.pid,
    name: token_payload.name,
    permission_level: token_payload.permission_level,
    groups: token_payload.groups,
    revision: token_payload.revision,
  };

  next();
};
