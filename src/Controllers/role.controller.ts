import { Prisma, Role } from "@prisma/client";
import { Request, Response } from "express";
import { z } from "zod";
import prisma from "../lib/prisma";
import { requireLeaderOfTeam, requireResponsibleForParticipant } from "../Middleware/auth/teamleaderAuth";
import NotFoundError from "../Middleware/error/NotFoundError";
import { createInsufficientPermissionsError, DataType, generateInvalidBodyError } from "./common";

require("express-async-errors");

const detailedRole = {
  pid: true,
  score: true,
  schema: {
    select: {
      pid: true,
      name: true,
    },
  },
  participant: {
    select: {
      pid: true,
      firstName: true,
      lastName: true,
    },
  },
  team: {
    select: {
      pid: true,
      name: true,
    },
  },
};

/**
 *
 * @param teamPid: Pid of the team to add the roles to
 * @returns Count of roles added (As roles are helper objects, there should be no need for more)
 */
export async function createRolesForTeam(teamPid: string) {
  const schemas = await prisma.roleSchema.findMany({ where: { discipline: { teams: { some: { pid: teamPid } } } } });

  const teamId = (await prisma.team.findUnique({ where: { pid: teamPid } }))?.id;

  if (!teamId) {
    throw new NotFoundError("team", teamPid);
  }

  const roles = await prisma.role.createMany({
    data: schemas.map((schema) => ({ schemaId: schema.id, score: "", teamId })), // TODO: Use default score from schema?
  });

  return roles.count;
}

export async function getRolesForTeam(req: Request<{ teamPid: string }>, res: Response) {
  const teamPid = req.params.teamPid;

  if (req.teamleader?.isAuthenticated) {
    requireLeaderOfTeam(req.teamleader, teamPid);
  }

  const roles = await prisma.role.findMany({
    where: { team: { pid: teamPid } },
    select: {
      pid: true,
      score: true,
      schema: { select: { pid: true } },
      participant: { select: { pid: true, firstName: true, lastName: true } },
    },
  });

  return res.status(200).json({
    type: "success",
    payload: {
      roles,
    },
  });
}

const AssignParticipantToRoleBody = z.object({
  participantPid: z.string().uuid(),
});

// requires: auth(leader of the team)
export async function assignParticipantToRole(req: Request<{ pid: string }>, res: Response) {
  const { pid } = req.params;

  if (req.teamleader?.isAuthenticated) {
    requireLeaderOfTeam(req.teamleader, pid);
  }

  const zBody = AssignParticipantToRoleBody.safeParse(req.body);

  if (zBody.success === false) {
    return res.status(400).json(generateInvalidBodyError({ participantPid: DataType.UUID }, zBody.error));
  }

  const { participantPid } = zBody.data;

  const schema = await prisma.role.findFirst({
    where: { pid, team: { participants: { some: { pid: participantPid } } } },
    select: { participant: { select: { pid: true, firstName: true, lastName: true } } },
  });

  if (!schema) {
    return res.status(404).json({
      type: "error",
      payload: {
        message: `No role with the ID '${pid}' could be found in the scope of the participant with the ID '${participantPid}'`,
      },
    });
  }

  // No error handling should be neccesary as the existence of the role and participant have already been checked above
  await prisma.role.update({ where: { pid }, data: { participant: { connect: { pid: participantPid } } } });

  return res.status(200).json({
    type: "success",
    payload: {
      message: `The participant with ID '${participantPid}' was successfully assigned to the role with ID '${pid}'`,
      ...(schema.participant ? { unassigned: schema.participant } : {}),
    },
  });
}
