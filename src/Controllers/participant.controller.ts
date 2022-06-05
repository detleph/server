import prisma from "../lib/prisma";
import { string, z } from "zod";
import { Request, Response } from "express";
import { DataType, generateError, generateInvalidBodyError } from "./common";
import { Prisma } from "@prisma/client";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime";
import NotFoundError from "../Middleware/error/NotFoundError";
import { requireLeaderOfTeam } from "../Middleware/auth/teamleaderAuth";

const InitialParticipant = z.object({
  firstName: z.string(),
  lastName: z.string(),
  groupPid: z.string().min(1).uuid(),
});

const ParticipantBody = InitialParticipant.extend({ teamPid: z.string().uuid() });

const returnedParticipant = {
  pid: true,
  firstName: true,
  lastName: true,
  relevance: true,
  team: {
    select: {
      pid: true,
      name: true,
    },
  },
  group: {
    select: {
      pid: true,
      name: true,
    },
  },
} as const;

// at: POST api/participants/
export const createParticipant = async (req: Request, res: Response) => {
  const result = ParticipantBody.safeParse(req.body);

  if (result.success === false) {
    return res.status(400).json(
      generateInvalidBodyError(
        {
          firstname: DataType.STRING,
          lastName: DataType.STRING,
          groupPid: DataType.UUID,
          teamPid: DataType.UUID,
        },
        result.error
      )
    );
  }
  const body = result.data;

  if (req.teamleader?.isAuthenticated) {
    requireLeaderOfTeam(req.teamleader, body.teamPid);
  }

  try {
    const discipline = await prisma.team.findUnique({
      where: { pid: body.teamPid },
      select: { discipline: true }
    });

    const maxteamsize = discipline?.discipline.maxTeamSize;

    const userCount = await prisma.participant.count({
      where: { team: { pid: body.teamPid } }
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
        team: { connect: { pid: body.teamPid } },
      },
      select: returnedParticipant,
    });

    return res.status(201).json({ type: "success", payload: { participant }, });
  } catch (e) {
    if (e instanceof PrismaClientKnownRequestError && e.code === "P2025") {
      return res
        .status(404)
        .json(generateError(`Could not link to team with ID '${body.teamPid}, or group with ID ${body.groupPid}'`));
    }
    throw e;
  }
};

// at: PATCH api/participants/:pid/
export const updateParticipant = async (req: Request<{ pid: string }>, res: Response) => {
  const { pid } = req.params;
  const teamPid = await getTeamPidByParticipantPid(pid);

  if (req.teamleader?.isAuthenticated) {
    requireLeaderOfTeam(req.teamleader, teamPid);
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
        group: { connect: { pid: body.groupPid } },
      },
      select: returnedParticipant,
    });

    res.status(200).json({
      type: "success",
      payload: { participant },
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2025") {
      throw new NotFoundError("participant", pid);
    }

    throw e;
  }
};

// at: DELETE api/participants/:pid/
export const deleteParticipant = async (req: Request<{ pid: string }>, res: Response) => {
  const { pid } = req.params;
  const teamPid = await getTeamPidByParticipantPid(pid);

  if (req.teamleader?.isAuthenticated) {
    requireLeaderOfTeam(req.teamleader, teamPid);
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

export const getTeamPidByParticipantPid = async function (partPid: string) {
  const participant = await prisma.participant.findUnique({
    where: { pid: partPid },
    select: { team: { select: { pid: true } } }
  });

  if (!participant) {
    throw new NotFoundError("participant", partPid);
  }

  return participant.team.pid;
}
