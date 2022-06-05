import { Request, Response } from "express";
import prisma from "../lib/prisma";
import { DataType, generateInvalidBodyError } from "./common";
import { requireLeaderOfTeam } from "../Middleware/auth/teamleaderAuth";
import { TeamBody } from "./user_auth.controller";
import { Prisma } from "@prisma/client";
import NotFoundError from "../Middleware/error/NotFoundError";

export const basicTeam = {
  pid: true,
  name: true,
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

export const getTeams = async (req: Request, res: Response) => {
  const teams = await prisma.team.findMany({ select: basicTeam });

  res.status(200).json({ type: "success", payload: { teams } });
};

export const getTeam = async (req: Request<{ pid: string }>, res: Response) => {
  const { pid } = req.params;

  if (req.teamleader?.isAuthenticated) {
    requireLeaderOfTeam(req.teamleader, pid);
  }

  const team = await prisma.team.findUnique({
    where: { pid },
    select: basicTeam,
  });

  if (!team) {
    throw new NotFoundError("team", pid);
  }

  res.status(200).json({ type: "success", payload: { team } });
};

export const updateTeam = async (req: Request, res: Response) => {
  const { pid } = req.params;

  if (req.teamleader?.isAuthenticated) {
    requireLeaderOfTeam(req.teamleader, pid);
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
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2025") {
      throw new NotFoundError("team", pid);
    }

    throw e;
  }
};

export const deleteTeam = async (req: Request, res: Response) => {
  const { pid } = req.params;

  if (req.teamleader?.isAuthenticated) {
    requireLeaderOfTeam(req.teamleader, pid);
  }

  await prisma.team.delete({ where: { pid } });

  res.status(204).json({ type: "success", payload: { message: "Sucesfully deleted team" } });
};
