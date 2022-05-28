import { Role } from "@prisma/client";
import { Request, Response } from "express";
import { z } from "zod";
import prisma from "../lib/prisma";
import { requireLeaderOfTeam, requireResponsibleForParticipant } from "../Middleware/auth/teamleaderAuth";
import NotFoundError from "../Middleware/error/NotFoundError";
import { DataType, generateInvalidBodyError } from "./common";

require("express-async-errors");

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
    data: schemas.map((schema) => ({ schemaId: schema.id, score: "", teamId })),
  });

  return roles.count;
}

export async function getRolesForTeam(req: Request<{ teamPid: string }>, res: Response) {
  const teamPid = req.params.teamPid;

  requireLeaderOfTeam(req.teamleader, teamPid);

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
  const zBody = AssignParticipantToRoleBody.safeParse(req.body);

  if (zBody.success === false) {
    return res.status(400).json(generateInvalidBodyError({ participant: DataType.UUID }));
  }

  const { participantPid } = zBody.data;
  const rolePid = req.params.pid;

  requireResponsibleForParticipant(req.teamleader, participantPid);

  const schema = await prisma.role.findFirst({
    where: { pid: rolePid, team: { participants: { some: { pid: participantPid } } } },
    select: { participant: { select: { pid: true, firstName: true, lastName: true } } },
  });

  if (!schema) {
    return res.status(404).json({
      type: "error",
      payload: {
        message: `No role with the ID '${rolePid}' could be found in the scope of the participant with the ID '${participantPid}'`,
      },
    });
  }

  await prisma.role.update({ where: { pid: rolePid }, data: { participant: { connect: { pid: participantPid } } } });

  return res.status(200).json({
    type: "success",
    payload: {
      message: `The participant with ID '${participantPid}' was successfully assigned to the role with ID '${rolePid}'`,
      ...(schema.participant ? { unassigned: schema.participant } : {}),
    },
  });
}

export async function deleteRolesFromTeam(teamPid: string){
  await prisma.role.deleteMany({
    where: { team: { pid: teamPid, } }
  });
}