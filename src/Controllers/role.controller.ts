import { Prisma } from "@prisma/client";
import { Request, Response } from "express";
import { z } from "zod";
import prisma from "../lib/prisma";
import { requireResponsibleForGroups } from "../Middleware/auth/auth";
import { requireLeaderOfTeam, requireResponsibleForParticipant } from "../Middleware/auth/teamleaderAuth";
import NotFoundError from "../Middleware/error/NotFoundError";
import { DataType, generateInvalidBodyError } from "./common";
import { getGroupByParticipantPid } from "./participant.controller";
import { getGroupsByTeamPid } from "./team.controller";

require("express-async-errors");

const basicRole = {
  pid: true,
  score: true,
  schema: { select: { pid: true } },
  participant: { select: { pid: true, firstName: true, lastName: true } },
};

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

export async function getRolesForTeam(req: Request<{ pid: string }>, res: Response) {
  const pid = req.params.pid;

  if (req.teamleader?.isAuthenticated) {
    await requireLeaderOfTeam(req.teamleader, pid);
  } else if (req.auth?.permission_level == "STANDARD") {
    requireResponsibleForGroups(req.auth, await getGroupsByTeamPid(pid));
  }

  const roles = await prisma.role.findMany({
    where: { team: { pid } },
    select: basicRole,
  });

  return res.status(200).json({
    type: "success",
    payload: {
      roles,
    },
  });
}

export async function getRole(req: Request<{ rolePid: string }>, res: Response) {
  const rolePid = req.params.rolePid;

  const role = await prisma.role.findUnique({ where: { pid: rolePid }, select: detailedRole });

  if (!role) {
    throw new NotFoundError("role", rolePid);
  }

  if (req.teamleader?.isAuthenticated) {
    await requireLeaderOfTeam(req.teamleader, role.team.pid);
  } else if (req.auth?.permission_level == "STANDARD" && role.participant?.pid !== undefined) {
    requireResponsibleForGroups(req.auth, await getGroupByParticipantPid(role.participant?.pid));
  }

  return res.status(200).json({
    type: "success",
    payload: {
      role,
    },
  });
}

const AssignParticipantToRoleBody = z.object({
  participantPid: z.string().uuid(),
});

// requires: auth(leader of the team)
export async function assignParticipantToRole(req: Request<{ pid: string }>, res: Response) {
  const { pid } = req.params;

  const zBody = AssignParticipantToRoleBody.safeParse(req.body);

  if (zBody.success === false) {
    return res.status(400).json(generateInvalidBodyError({ participantPid: DataType.UUID }, zBody.error));
  }

  const { participantPid } = zBody.data;

  if (req.teamleader?.isAuthenticated) {
    requireResponsibleForParticipant(req.teamleader, participantPid);
  } else {
    requireResponsibleForGroups(req.auth, await getGroupByParticipantPid(participantPid));
  }

  try {
    const schema = await prisma.role.update({
      where: { pid },
      data: { participant: { connect: { pid: participantPid } } },
      select: detailedRole,
    });

    return res.status(200).json({
      type: "success",
      payload: {
        message: `The participant with ID '${participantPid}' was successfully assigned to the role with ID '${pid}'`,
        ...(schema.participant ? { unassigned: schema.participant } : {}),
      },
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2025") {
      return res.status(404).json({
        type: "error",
        payload: {
          message: `No role with the ID '${pid}' could be found in the scope of the participant with the ID '${participantPid}'`,
        },
      });
    }

    throw e;
  }
}
