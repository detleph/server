import prisma from "../lib/prisma";
import { string, z } from "zod";
import { Request, Response } from "express";
import { DataType, generateError, generateInvalidBodyError, createInsufficientPermissionsError } from "./common";
import { Prisma } from "@prisma/client";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime";
import NotFoundError from "../Middleware/error/NotFoundError";
import { requireLeaderOfTeam, requireResponsibleForParticipant } from "../Middleware/auth/teamleaderAuth";
import { requireResponsibleForGroups } from "../Middleware/auth/auth";
import { requireConfiguredAuthentication } from "../Middleware/auth/auth";
import { isTeamleaderJWTPayload, TeamleaderJWTPayload } from "../Middleware/auth/teamleaderAuth";
import { AuthJWTPayload } from "./admin_auth.controller";
import AuthError from "../Middleware/error/AuthError";
import { getGroupsByTeamPid } from "./team.controller";

require("express-async-errors");

const InitialParticipant = z.object({
  firstName: z.string(),
  lastName: z.string(),
  groupPid: z.string().min(1).uuid(),
});

const basicParticipant = {
  pid: true,
  firstName: true,
  lastName: true,
  relevance: true,
  group: {
    select: {
      pid: true,
      name: true,
    },
  },
} as const;

const returnedParticipant = {
  ...basicParticipant,
  team: {
    select: {
      pid: true,
      name: true,
    },
  },
} as const;

const _getAllParticipants = async (
  res: Response,
  req: Request,
  teamPid?: string
) => {
  if (req.teamleader?.isAuthenticated) {
    await requireLeaderOfTeam(req.teamleader, teamPid);
  } else if (req.auth?.permission_level == "STANDARD") {
    if (!teamPid) {
      throw new AuthError("A STANDARD Admin is not allowed to fetch all Participants!");
    } else {
      requireResponsibleForGroups(req.auth, await getGroupsByTeamPid(teamPid));
    }
  }

  const participants = await prisma.participant.findMany({
    where: { team: { pid: teamPid } },
    select: basicParticipant,
  });

  return res.status(200).json({
    type: "success",
    payload: {
      participants,
    },
  });
};

export const getAllParticipants = async (req: Request<{}, {}, {}, { teamPid?: string }>, res: Response) => {
  return _getAllParticipants(res, req, req.query.teamPid);
};

export const getAllParticipantsParams = async (req: Request<{ teamPid: string }>, res: Response) => {
  return _getAllParticipants(res, req, req.params.teamPid);
};

export const getParticipantForRole = async (req: Request<{ rolePid: string }>, res: Response) => {
  const participant = await prisma.participant.findFirst({
    where: { roles: { some: { pid: req.params.rolePid } } },
    select: returnedParticipant,
  });

  if (!participant) {
    return res.status(404).json({
      type: "error",
      payload: {
        message: `Could not find a participant for the role with the ID '${req.params.rolePid}'`,
      },
    });
  }

  if (req.teamleader?.isAuthenticated) {
    await requireLeaderOfTeam(req.teamleader, participant?.team.pid);
  } else if (req.auth?.permission_level == "STANDARD") {
    requireResponsibleForGroups(req.auth, await getGroupsByTeamPid(participant?.team.pid));
  }

  return res.status(200).json({
    type: "success",
    payload: { participant },
  });
};

// at: POST api/teams/:teamPid/participant/
export const createParticipant = async (req: Request<{ teamPid: string }>, res: Response) => {
  const { teamPid } = req.params;

  const result = InitialParticipant.safeParse(req.body);

  if (result.success === false) {
    return res.status(400).json(
      generateInvalidBodyError(
        {
          firstname: DataType.STRING,
          lastName: DataType.STRING,
          groupPid: DataType.UUID,
        },
        result.error
      )
    );
  }
  const body = result.data;

  if (req.teamleader?.isAuthenticated) {
    await requireLeaderOfTeam(req.teamleader, teamPid);
  } else if (req.auth?.permission_level == "STANDARD") {
    requireResponsibleForGroups(req.auth, body.groupPid);
  }

  try {
    const discipline = await prisma.team.findUnique({
      where: { pid: teamPid },
      select: { discipline: true },
    });

    const maxteamsize = discipline?.discipline.maxTeamSize;

    const userCount = await prisma.participant.count({
      where: { team: { pid: teamPid } },
    });

    if (maxteamsize == userCount) {
      return res.status(418).json({ type: "error", payload: "The team has reached the limit of participants!" });
    }

    const participant = await prisma.participant.create({
      data: {
        firstName: body.firstName,
        lastName: body.lastName,
        relevance: "MEMBER",
        group: { connect: { pid: body.groupPid } },
        team: { connect: { pid: teamPid } },
      },
      select: returnedParticipant,
    });

    return res.status(201).json({ type: "success", payload: { participant } });
  } catch (e) {
    if (e instanceof PrismaClientKnownRequestError && e.code === "P2025") {
      return res
        .status(404)
        .json(generateError(`Could not link to team with ID '${teamPid}, or group with ID ${body.groupPid}'`));
    }
    throw e;
  }
};

// at: PATCH api/participants/:pid/
export const updateParticipant = async (req: Request<{ pid: string }>, res: Response) => {
  const { pid } = req.params;

  if (req.teamleader?.isAuthenticated) {
    await requireResponsibleForParticipant(req.teamleader, pid);
  } else if (req.auth?.permission_level == "STANDARD") {
    requireResponsibleForGroups(req.auth, await getGroupByParticipantPid(pid));
  }

  const result = InitialParticipant.partial().safeParse(req.body);

  if (result.success === false) {
    return res.status(400).json(
      generateInvalidBodyError(
        {
          firstname: DataType.STRING,
          lastName: DataType.STRING,
          groupPid: DataType.UUID,
        },
        result.error
      )
    );
  }

  const body = result.data;

  try {
    const participant = await prisma.participant.update({
      where: { pid },
      data: {
        firstName: body.firstName,
        lastName: body.lastName,
        ...(body.groupPid ? { group: { connect: { pid: body.groupPid } } } : {}),
      },
      select: returnedParticipant,
    });

    res.status(200).json({
      type: "success",
      payload: { participant },
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2025") {
      return res
        .status(404)
        .json(generateError(`Could not find participant '${pid}, or link to group with ID ${body.groupPid}.'`));
    }

    throw e;
  }
};

// at: DELETE api/participants/:pid/
export const deleteParticipant = async (req: Request<{ pid: string }>, res: Response) => {
  const { pid } = req.params;

  if (req.teamleader?.isAuthenticated) {
    await requireResponsibleForParticipant(req.teamleader, pid);
  } else if (req.auth?.permission_level == "STANDARD") {
    requireResponsibleForGroups(req.auth, await getGroupByParticipantPid(pid));
  }

  try {
    await prisma.participant.delete({ where: { pid } });

    return res.status(204).end();
  } catch (e) {
    if (e instanceof PrismaClientKnownRequestError && e.code === "P2025") {
      throw new NotFoundError("participant", pid);
    }

    throw e;
  }
};

export async function getGroupByParticipantPid(partPid: string) {
  const parti = (await prisma.participant.findUnique({ where: { pid: partPid }, select: { group: true } }))?.group.pid;

  if (!parti) {
    throw new NotFoundError("participant", partPid);
  }

  return parti;
}
