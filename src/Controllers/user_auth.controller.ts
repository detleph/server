/*import { Request, Response } from "express";
import prisma from "../lib/prisma";
import { mailClient } from "../lib/redis";
import { nanoid } from "nanoid";
import { verificationMail } from "../lib/mail";

export const register = async (req: Request, res: Response) => {
  //TODO: Implemnt user endpoint and use following code to send verification mail

  const user = {
    //Supposed to come from database
    id: "10",
    email: "test@test.com",
  };

  const usid = nanoid();

  (await mailClient).set(usid, user.id);

  verificationMail(user.email, "eventname", usid);

  //Send status code
};

export const verifyEmail = async (req: Request, res: Response) => {
  const { code } = req.body || {};

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

  prisma.participant.update({
    where: {
      id: parseInt(acc),
    },
    data: {
      verified: true,
    },
  });
};
*/