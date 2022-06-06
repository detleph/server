/// <reference path="../../custom.d.ts" />

import { NextFunction, Request, Response } from "express";
import { authenticateUser, AuthJWTPayload } from "../../Controllers/admin_auth.controller";
import { authClient } from "../../lib/redis";
import jwt, { JsonWebTokenError, JwtPayload } from "jsonwebtoken";
import prisma from "../../lib/prisma";
import AuthError from "../error/AuthError";
import { TeamleaderJWTPayload, _requireTeamleaderAuthentication } from "./teamleaderAuth";

require("express-async-errors");

const JWT_SECRET = process.env.JWT_SECRET;

export const verifyAuthorizationFormat = (authorization: string) => /^Bearer .+$/.test(authorization);

export const getBearerToken = (authorization: string) => authorization.slice(7);

const _requireAdminAuthentication =
  (config: { optional?: Boolean; controlled?: Boolean } = { optional: false, controlled: false }) =>
  async (req: Request, res: Response, next: NextFunction) => {
    if (!JWT_SECRET) {
      throw new Error("JWT_SECRET not set");
    }

    const { authorization } = req.headers;

    if (!authorization) {
      if (config.optional) {
        return false;
      }

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

    if (!token_payload.permission_level || !token_payload.pid || !token_payload.revision) {
      if (typeof (token_payload as unknown as TeamleaderJWTPayload).team === "string") {
        throw new AuthError("Teamleader authentication is not supported for this operation!");
      }

      throw new AuthError("The token did not include the required information!");
    }

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

    if (!config.controlled) {
      next();
    }

    return true;
  };

export const requireAuthentication = _requireAdminAuthentication({ optional: false, controlled: false });

type AuthType = "admin" | "teamleader";
interface AuthTypeConfig {
  admin?: Boolean;
  teamleader?: Boolean;
}

interface AuthConfiguration {
  type: AuthType | AuthTypeConfig;

  optional: Boolean;
}

function getAuthTypes(type: AuthType | AuthTypeConfig): AuthType[] {
  if (typeof type === "string") {
    return [type];
  }

  return Object.entries(type)
    .filter(([_, value]) => value)
    .map(([key, _]) => key as AuthType);
}

export const requireConfiguredAuthentication =
  (config: AuthConfiguration = { optional: false, type: "admin" }) =>
  async (req: Request, res: Response, next: NextFunction) => {
    const types = getAuthTypes(config.type);
    const optional = config.optional;

    let adminFinished = false;
    let teamleaderFinished = false;

    if (types.includes("admin")) {
      adminFinished = Boolean(await _requireAdminAuthentication({ optional: true, controlled: true })(req, res, next));

      if (adminFinished) {
        return next();
      }
    }

    if (types.includes("teamleader")) {
      teamleaderFinished = Boolean(
        _requireTeamleaderAuthentication({ optional: true, controlled: true })(req, res, next)
      );

      if (teamleaderFinished) {
        return next();
      }
    }

    if (!config.optional) {
      throw new AuthError("No sufficient authorization was provided for this operation");
    }

    next();
  };

export function requireResponsibleForGroups(auth: AuthJWTPayload | undefined, groupPids: string[] | string) {
  if (auth?.permission_level === "ELEVATED") {
    return;
  }

  if (Array.isArray(groupPids)) {
    groupPids.forEach(gr => {
      if (auth?.groups.includes(gr)) {
        return;
      }

      throw new AuthError("The provided authorization is not valid for the requested operation!");
    });
  } else {
    if (auth?.groups.includes(groupPids)) {
      throw new AuthError("The provided authorization is not valid for the requested operation!");
    }
  }
}
