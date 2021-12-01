import prisma from "../lib/prisma";
import { Request, Response } from "express";

// requires: auth(elevated)
export const getAllAdmins = async (req: Request, res: Response) => {
  if (!req.auth?.isAuthenticated) {
    return res.status(500).json({
      type: "failure",
      payload: {
        message: "The server was not able to validate your credentials; Please try again later",
      },
    });
  }

  if (req.auth.permission_level !== "ELEVATED") {
    return res.status(403).json({
      type: "error",
      payload: {
        message: "You do not have sufficient permissions to use this feature",
      },
      _links: [
        {
          rel: "authentication",
          href: "/api/authentication",
          type: "POST",
        },
      ],
    });
  }

  // TODO: Add exception handling
  const users = await prisma.admin.findMany({ select: { pid: true, name: true, permission_level: true } });

  res.status(200).json({
    type: "success",
    payload: {
      users,
    },
  });
};
