import prisma from "../lib/prisma";
import { Request, Response } from "express";
import { AdminLevel } from "@prisma/client";

const AUTH_ERROR = {
  type: "failure",
  payload: {
    message: "The server was not able to validate your credentials; Please try again later",
  },
};

const createInsufficientPermissionsError = (required: AdminLevel = "ELEVATED") => ({
  type: "error",
  payload: {
    message: "You do not have sufficient permissions to use this feature",
    required_level: required,
  },
  _links: [
    {
      rel: "authentication",
      href: "/api/authentication",
      type: "POST",
    },
  ],
});

// requires: auth(elevated)
export const getAllAdmins = async (req: Request, res: Response) => {
  if (!req.auth?.isAuthenticated) {
    return res.status(500).json(AUTH_ERROR);
  }

  if (req.auth.permission_level !== "ELEVATED") {
    return res.status(403).json(createInsufficientPermissionsError());
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
