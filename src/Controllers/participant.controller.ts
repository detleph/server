import prisma from "../lib/prisma";
import { z } from "zod";
import { Request, Response } from "express";
import {
  AUTH_ERROR,
  createInsufficientPermissionsError,
  DataType,
  generateError,
  generateInvalidBodyError,
} from "./common";
import { Job, Prisma } from "@prisma/client";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime";
import NotFoundError from "../Middleware/error/NotFoundError";
import { requireConfiguredAuthentication, requireResponsibleForGroup } from "../Middleware/auth/auth";

//TODO: add TeamleaderAuthentification

// REVIEW: All this code should be able to be executed by the teamleader of the team the participant is in AND
//         an admin the group of whom overlaps with the team AND an elevated admin

const ParticipantBody = z.object({
  firstName: z.string(),
  lastName: z.string(),
  groupId: z.string().uuid(),
  //job: z.enum(["TEAMLEADER", "MEMBER"]),
});

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

// at: POST api/teams/:teamPid/participant/
export const createParticipant = async (req: Request<{ teamPid: string }>, res: Response) => {
  const result = ParticipantBody.safeParse(req.body);

  if (result.success === false) {
    return res.status(400).json(
      generateInvalidBodyError(
        {
          firstname: DataType.STRING,
          lastName: DataType.STRING,
          groupId: DataType.UUID,
        },
        result.error
      )
    );
  }
  const body = result.data;
  const { teamPid } = req.params;

  try {
    const participant = await prisma.participant.create({
      data: {
        firstName: body.firstName,
        lastName: body.lastName,
        relevance: "MEMBER",
        group: { connect: { pid: body.groupId } },
        team: { connect: { pid: teamPid } },
      },
      select: returnedParticipant,
    });

    return res.status(201).json({
      type: "success",
      payload: { participant },
    });
  } catch (e) {
    if (e instanceof PrismaClientKnownRequestError && e.code === "P2025") {
      return res
        .status(404)
        .json(generateError(`Could not link to team with ID '${teamPid}, or group with ID ${body.groupId}'`));
    }
    throw e;
  }
};

// at: PATCH api/participants/:pid/
export const updateParticipant = async (req: Request<{ pid: string }>, res: Response) => {
  const result = ParticipantBody.partial().safeParse(req.body);

  if (result.success === false) {
    return res.status(400).json(
      generateInvalidBodyError(
        {
          firstname: DataType.STRING,
          lastName: DataType.STRING,
          groupId: DataType.UUID,
        },
        result.error
      )
    );
  }

  const body = result.data;
  const { pid } = req.params;

  try {
    const participant = await prisma.participant.update({
      where: { pid },
      data: {
        firstName: body.firstName,
        lastName: body.lastName,
        group: { connect: { pid: body.groupId } },
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
