import { Request, Response } from "express";
import prisma from "../lib/prisma";
import { createInsufficientPermissionsError, DataType, generateInvalidBodyError } from "./common";
import { requireLeaderOfTeam } from "../Middleware/auth/teamleaderAuth";
import { TeamBody } from "./user_auth.controller";
import NotFoundError from "../Middleware/error/NotFoundError";
import { requireResponsibleForGroups } from "../Middleware/auth/auth";
import AuthError from "../Middleware/error/AuthError";
import { runInNewContext } from "vm";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime";
import logger from "../Middleware/error/logger";

require("express-async-errors");

export const basicTeam = {
  pid: true,
  creationDate: true,
  name: true,
  leaderEmail: true,
  discipline: { select: { pid: true } },
};

const detailedTeam = {
  pid: true,
  creationDate: true,
  name: true,
  leaderEmail: true,
  discipline: { select: { pid: true } },
  roles: {
    select: {
      pid: true,
      schema: { select: { name: true } },
      participant: { select: { pid: true } },
    },
  },
  participants: {
    select: {
      pid: true,
      firstName: true,
      lastName: true,
    },
  },
};

export const getTeams = async (req: Request<{}, {}, {}, { showHidden?: string }>, res: Response) => {
  if (req.auth?.permission_level == "STANDARD") {
    throw new AuthError("A STANDARD Admin is not allowed to get all teams!");
  }

  const show: boolean = req.query.showHidden === "true";

  logger.info(typeof show);

  const teams = await prisma.team.findMany({
    where: { verified: { equals: show ? undefined : true } },
    select: basicTeam,
  });

  return res.status(200).json({ type: "success", payload: { teams } });
};

export const getTeam = async (req: Request<{ pid: string }>, res: Response) => {
  const { pid } = req.params;

  if (req.teamleader?.isAuthenticated) {
    await requireLeaderOfTeam(req.teamleader, pid);
  } else if (req.auth?.permission_level == "STANDARD") {
    requireResponsibleForGroups(req.auth, await getGroupsByTeamPid(pid));
  }

  const team = await prisma.team.findUnique({
    where: { pid },
    select: detailedTeam,
  });

  if (!team) {
    throw new NotFoundError("team", pid);
  }

  res.status(200).json({ type: "success", payload: { team } });
};

export const updateTeam = async (req: Request, res: Response) => {
  const { pid } = req.params;

  if (req.teamleader?.isAuthenticated) {
    await requireLeaderOfTeam(req.teamleader, pid);
  } else if (req.auth?.permission_level == "STANDARD") {
    requireResponsibleForGroups(req.auth, await getGroupsByTeamPid(pid));
  }

  const result = TeamBody.omit({ partGroupId: true, partFirstName: true, partLastName: true }).safeParse(req.body);

  if (result.success === false) {
    return res.status(400).json(
      generateInvalidBodyError(
        {
          teamName: DataType.STRING,
          leaderEmail: DataType.STRING,
          disciplineId: DataType.UUID,
        },
        result.error
      )
    );
  }

  const body = result.data;

  try {
    const team = await prisma.team.update({
      where: {
        pid: pid,
      },
      data: {
        name: body.teamName,
        discipline: { connect: { pid: body.disciplineId } },
        leaderEmail: body.leaderEmail,
      },
      select: basicTeam,
    });

    res.status(200).json({ type: "success", payload: { team } });
  } catch (e) {
    if (e instanceof PrismaClientKnownRequestError && e.code === "P2025") {
      throw new NotFoundError("team", pid);
    }

    throw e;
  }
};

export const deleteTeam = async (req: Request, res: Response) => {
  const { pid } = req.params;

  if (req.teamleader?.isAuthenticated) {
    await requireLeaderOfTeam(req.teamleader, pid);
  }

  if (req.auth?.permission_level == "STANDARD") {
    throw new AuthError("STANDARD Admins are not allowed to delete Teams!");
  }

  try {
    await prisma.team.delete({ where: { pid } });

    res.status(204).json({ type: "success", payload: { message: "Succesfully deleted team" } });
  } catch (e) {
    if (e instanceof PrismaClientKnownRequestError && e.code === "P2025") {
      throw new NotFoundError("team", pid);
    }

    throw e;
  }
};

export const deleteUnverifiedTeams = async (req: Request, res: Response) => {
  if (req.auth?.permission_level == "STANDARD") {
    throw new AuthError("A STANDARD Admin is not allowed to delete unverified teams!");
  }

  const { pid } = req.params;

  await _deleteUnverifiedTeams(pid);

  res.status(204).send();
};

export async function checkTeamExistence(teamPid: string) {
  const teamCount = await prisma.team.count({
    where: { pid: teamPid },
  });
  if (teamCount == 0) {
    throw new NotFoundError("team", teamPid);
  }
}

export async function getGroupsByTeamPid(teamPid: string) {
  const team = await prisma.team.findUnique({
    where: { pid: teamPid },
    select: { participants: { select: { group: true } } },
  });

  let groups: string[] = [];

  team?.participants.forEach((participant: { group: { pid: string } }) => {
    groups.push(participant.group.pid);
  });

  return groups;
}

export async function _deleteUnverifiedTeams(eventPid: string) {
  await prisma.team.deleteMany({
    where: {
      AND: [{ discipline: { event: { pid: eventPid } } }, { verified: { equals: false } }],
    },
  });
}
