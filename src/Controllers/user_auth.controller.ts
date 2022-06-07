import { Request, Response } from "express";
import prisma from "../lib/prisma";
import { mailClient } from "../lib/redis";
import { nanoid } from "nanoid";
import { verificationMail } from "../lib/mail";
import { DataType, generateError, generateInvalidBodyError } from "./common";
import { generateTeamleaderJWT } from "../Middleware/auth/teamleaderAuth";
import { createRolesForTeam } from "./role.controller";
import { z } from "zod";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime";
import NotFoundError from "../Middleware/error/NotFoundError";

require("express-async-errors");

export const TeamBody = z.object({
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

export const register = async (req: Request<{}, {}, CreateTeamBody>, res: Response) => {
  const result = TeamBody.safeParse(req.body);

  if (result.success === false) {
    return res.status(400).json(
      generateInvalidBodyError(
        {
          teamName: DataType.STRING,
          leaderEmail: DataType.STRING,
          disciplineId: DataType.UUID,
          partFirstName: DataType.STRING,
          partLastName: DataType.STRING,
          partGroupId: DataType.UUID,
        },
        result.error
      )
    );
  }

  const body = result.data;

  try {
    const team = await prisma.team.create({
      data: {
        leaderEmail: body.leaderEmail,
        name: body.teamName,
        roles: undefined,
        discipline: { connect: { pid: body.disciplineId } },
        participants: {
          create: {
            firstName: body.partFirstName,
            lastName: body.partLastName,
            relevance: "TEAMLEADER",
            group: { connect: { pid: body.partGroupId } },
          },
        },
      },
      select: {
        pid: true,
        name: true,
        discipline: { select: { pid: true, name: true } },
      },
    });

    await createRolesForTeam(team.pid);

    const usid = nanoid();

    (await mailClient).set(usid, team.pid);

    verificationMail(req.body.leaderEmail, team.discipline.name, usid);
    return res.status(201).json({ type: "success", payload: { team } });
  } catch (e) {
    if (e instanceof PrismaClientKnownRequestError && e.code === "P2025") {
      return res.status(404).json({
        type: "error",
        payload: {
          message: `Could not connect to discipline with the ID '${body.disciplineId}' or could not connect participant to group with the ID '${body.partGroupId}'`,
        },
      });
    }

    throw e;
  }
};

export const requestToken = async (req: Request, res: Response) => {
  const data = z.object({ teamId: z.string().min(1) }).safeParse(req);

  if (data.success == false) {
    return res.status(400).json(generateInvalidBodyError({ teamId: DataType.STRING }, data.error));
  }

  const { teamId } = data.data;

  const team = await prisma.team.findUnique({
    where: {
      pid: teamId,
    },
    select: {
      discipline: { select: { name: true } },
      pid: true,
      leaderEmail: true,
    },
  });

  if (!team) {
    return res.status(404).json(generateError("Team does not exist!"));
  }

  const usid = nanoid();

  (await mailClient).set(usid, team.pid);

  verificationMail(team.leaderEmail, team.discipline.name, usid);

  res.status(200).json({ type: "sucess", payload: { message: "Email sent!" } });
};

export const requestTokenEmail = async (req: Request, res: Response) => {
  const data = z.object({ email: z.string().min(1) }).safeParse(req);

  if (data.success == false) {
    return res.status(400).json(generateInvalidBodyError({ email: DataType.STRING }, data.error));
  }

  const { email } = data.data;

  const teams = await prisma.team.findMany({
    where: {
      leaderEmail: email,
    },
    select: {
      discipline: { select: { name: true } },
      pid: true,
      leaderEmail: true,
    },
  });

  if (!teams) {
    return res.status(404).json(generateError("Team does not exist!"));
  }

  const team = teams[0]; //REVIEW: maybe a email should be only able to be responsible for one team

  if (!team) {
    return res.status(404).json(generateError("Team does not exist!"));
  }

  const usid = nanoid();

  (await mailClient).set(usid, team.pid);

  verificationMail(team.leaderEmail, team.discipline.name, usid);

  res.status(200).json({ type: "sucess", payload: { message: "Email sent!" } });
};

export const verifyEmail = async (req: Request, res: Response) => {
  const { code } = req.params || {};

  if (!(typeof code === "string")) {
    return res.status(400).json({
      type: "error",
      payload: {
        message: "Invalid Request parameter",
      },
    });
  }

  const acc = await mailClient.get(code);

  if (!acc) {
    return res.status(404).json({
      type: "error",
      payload: {
        message: "Invalid token. It might be expired",
      },
    });
  }

  try {
    const team = await prisma.team.update({
      where: {
        pid: acc,
      },
      data: {
        verified: true,
      },
    });

    mailClient.set(code, "");

    const token = generateTeamleaderJWT(team);

    res.cookie("teamLeaderToken", token, {
      path: "/",
      maxAge: 1000 * 60 * 60 * 24 * 4,
    });

    res.status(200).json({ type: "succes", payload: { token } });
  } catch (e) {
    if (e instanceof PrismaClientKnownRequestError && e.code === "P2025") {
      throw new NotFoundError("discipline", acc);
    }

    throw e;
  }
};
