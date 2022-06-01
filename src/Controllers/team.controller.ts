import { Request, Response } from "express";
import prisma from "../lib/prisma";
import { createInsufficientPermissionsError, DataType, generateInvalidBodyError } from "./common";
import { requireLeaderOfTeam } from "../Middleware/auth/teamleaderAuth";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import NotFoundError from "../Middleware/error/NotFoundError";

const TeamBody = z.object({
  teamName: z.string().min(1),
  leaderEmail: z.string().email(),
  disciplineId: z.string().uuid(),
  partFirstName: z.string().min(1),
  partLastName: z.string().min(1),
  partGroupId: z.string().uuid(),
});

interface CreateTeamBody {
  teamName: string;
  leaderEmail: string;
  disciplineId: string;
  partFirstName: string;
  partLastName: string;
  partGroupId: string;
}

export const getTeams = async (req: Request, res: Response) => {
  const teams = prisma.team.findMany({ select: { pid: true, name: true, disciplineId: true } });

  res.status(200).json(teams);
};

export const getTeam = async (req: Request, res: Response) => {
  const { pid } = req.params;

  const team = prisma.team.findUnique({
    where: { pid },
    select: {
      disciplineId: true,
      name: true,
      pid: true,
    },
  });

  res.status(200).json(team);
};

export const updateTeam = async (req: Request, res: Response) => {
  const result = TeamBody.merge(z.object({ pid: z.string().min(1) }))
    .omit({ partGroupId: true, partFirstName: true, partLastName: true })
    .safeParse(req.body);

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
    requireLeaderOfTeam(req.teamleader, body.pid);
  } catch {
    return res.status(401).json(createInsufficientPermissionsError("STANDARD"));
  }

  try {
    const team = prisma.team.update({
      where: {
        pid: body.pid,
      },
      data: {
        name: body.teamName,
        discipline: { connect: { pid: body.disciplineId } },
        leaderEmail: body.leaderEmail,
      },
    });

    res.status(204).json(team);
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2025") {
      throw new NotFoundError("discipline", body.pid);
    }

    throw e;
  }
};

export const deleteTeam = async (req: Request, res: Response) => {
  const { pid } = req.params;

  try {
    requireLeaderOfTeam(req.teamleader, pid);
  } catch {
    return res.status(401).json(createInsufficientPermissionsError("STANDARD"));
  }

  prisma.team.delete({ where: { pid } });

  res.status(204).json("Welp its gone");
};
