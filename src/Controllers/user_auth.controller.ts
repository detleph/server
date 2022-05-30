import { Request, Response } from "express";
import prisma from "../lib/prisma";
import { mailClient } from "../lib/redis";
import { nanoid } from "nanoid";
import { verificationMail } from "../lib/mail";
import { createInsufficientPermissionsError, DataType, generateInvalidBodyError } from "./common";
import { generateTeamleaderJWT, requireLeaderOfTeam } from "../Middleware/auth/teamleaderAuth";
import { createRolesForTeam } from "./role.controller";
import { any, z } from "zod";

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

// TODO: Some kind of auth (Teamleader probably)
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
      disciplineId: true,
    },
  });

  //TODO: maybe use returned amount of created use?
  createRolesForTeam(team.pid);

  const usid = nanoid();

  (await mailClient).set(usid, team.pid);

  verificationMail(req.body.leaderEmail, "eventname", usid);

  res.status(201).json({ type: "success", payload: { team } });
};

export const requestToken = async (req: Request, res: Response) => {
  const { teamId } = req.body || {};

  if (!(typeof teamId === "string")) {
    return res.status(400).json(generateInvalidBodyError({ teamId: DataType.STRING }));
  }

  const team = await prisma.team.findUnique({
    where: {
      pid: teamId,
    },
  });

  if (!team) {
    return res.status(404).json();
  }

  const usid = nanoid();

  (await mailClient).set(usid, team.pid);

  verificationMail(team.leaderEmail, "eventname", usid);

  res.status(200).json({ type: "sucess", message: "Email sent!" });
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

  res.status(200).json({ type: "succes", payload: { token } }); //TODO: This needs to set a cookie or smth so that the client also gets this info
};
