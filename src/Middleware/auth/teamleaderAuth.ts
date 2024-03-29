import { Team } from "@prisma/client";
import e, { NextFunction, Request, Response } from "express";
import jwt, { JsonWebTokenError } from "jsonwebtoken";
import AuthError from "../error/AuthError";
import { getBearerToken, verifyAuthorizationFormat } from "./auth";
import prisma from "../../lib/prisma";
import { checkTeamExistence } from "../../Controllers/team.controller";

export interface TeamleaderJWTPayload {
  team: string;
}

export function isTeamleaderJWTPayload(payload: any): payload is TeamleaderJWTPayload {
  return typeof payload.team === "string";
}

const JWT_SECRET = process.env.JWT_SECRET;

export function generateTeamleaderJWT(teamleader: Team) {
  if (!JWT_SECRET) {
    throw new Error("JWT_SECRET not set");
  }

  const payload: TeamleaderJWTPayload = {
    team: teamleader.pid,
  };

  return jwt.sign(payload, JWT_SECRET, { expiresIn: "4 days" });
}

export const _requireTeamleaderAuthentication =
  (config: { optional: Boolean; controlled: Boolean } = { optional: false, controlled: false }) =>
  (req: Request, res: Response, next: NextFunction) => {
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
          message:
            "The request did not include the Authorization header (Only the team leader can perform this operation)",
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

    try {
      const token_payload = jwt.verify(getBearerToken(authorization), JWT_SECRET) as TeamleaderJWTPayload;

      req.teamleader = {
        isAuthenticated: true,
        team: token_payload.team,
      };

      if (!config.controlled) {
        next();
      }

      return true;
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
  };

export const requireTeamleaderAuthentication = _requireTeamleaderAuthentication({ optional: false, controlled: false });

export async function requireLeaderOfTeam(auth: TeamleaderJWTPayload | undefined, teamPid?: string) {
  if (!teamPid) {
    throw new AuthError("Could not match IDs");
  }

  await checkTeamExistence(teamPid);

  if (auth?.team !== teamPid) {
    throw new AuthError("The provided authorization is not valid for the requested team");
  }
}

export async function requireResponsibleForParticipant(auth: TeamleaderJWTPayload | undefined, participantPid: string) {
  if (!auth) {
    throw new AuthError("There was an error with your authorization");
  }

  const teamPid = (
    await prisma.participant.findUnique({ where: { pid: participantPid }, select: { team: { select: { pid: true } } } })
  )?.team.pid;

  if (teamPid !== auth.team) {
    throw new AuthError("The provided authorization is not valid for the requested participant");
  }
}
