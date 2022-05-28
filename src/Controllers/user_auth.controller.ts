import { Request, Response } from "express";
import prisma from "../lib/prisma";
import { mailClient } from "../lib/redis";
import { nanoid } from "nanoid";
import { verificationMail } from "../lib/mail";
import { DataType, generateInvalidBodyError } from "./common";
import { generateTeamleaderJWT } from "../Middleware/auth/teamleaderAuth";

interface CreateTeamBody {
  name: string;
  leaderEmail: string;
  disciplineId: string;
}

export const register = async (req: Request<{}, {}, CreateTeamBody>, res: Response) => {
  if (req.body.name == null || req.body.disciplineId == null || req.body.leaderEmail == null) {
    res.status(400).json(
      generateInvalidBodyError({
        name: DataType.STRING,
        leaderEmail: DataType.STRING,
        disciplineId: DataType.STRING,
      })
    );
    return;
  }

  const team = await prisma.team.create({
    data: {
      leaderEmail: req.body.leaderEmail,
      name: req.body.name,
      roles: undefined,
      discipline: { connect: { pid: req.body.disciplineId } },
    },
    select: {
      pid: true,
      name: true,
      disciplineId: true,
    },
  });

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

//TODO: This should be a get request with the code as a veriable part in the url
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

  res.status(200).json({ type: "succes", payload: { token: generateTeamleaderJWT(team) } }); //TODO: This needs to set a cookie or smth so that the client also gets this info
};
