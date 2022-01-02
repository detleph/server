import prisma from "../lib/prisma";
import { Request, Response } from "express";
import { AdminLevel } from "@prisma/client";
import argon2 from "argon2";

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

interface CreateAdminBody {
  name?: string;
  password: string;
  permission_level: string;
  groups?: string[];
}

const PERMISSION_LEVELS: readonly AdminLevel[] = ["ELEVATED", "STANDARD"]; // TODO: Enforce completeness

const isPermissionLevel = (level: string): level is AdminLevel => PERMISSION_LEVELS.includes(level as any);

// requires: auth(elevated)
export const createAdmin = async (req: Request<{}, {}, CreateAdminBody>, res: Response) => {
  if (!req.auth?.isAuthenticated) {
    return res.status(500).json(AUTH_ERROR);
  }

  if (req.auth.permission_level !== "ELEVATED") {
    return res.status(403).json(createInsufficientPermissionsError());
  }

  const { name, password, permission_level, groups } = req.body || {};

  const groupsIsValid = groups ? groups.filter((e) => typeof e !== "string").length === 0 : true;

  if (
    !(typeof name === "string" && typeof password == "string" && isPermissionLevel(permission_level) && groupsIsValid)
  ) {
    return res.status(400).json({
      type: "error",
      payload: {
        message: "The body of your request did not conform to the requirements",
        schema: {
          body: {
            name: "string",
            password_level: "string",
            permission_level: "'STANDARD' | 'ELEVATED'",
          },
        },
      },
    });
  }

  const password_hash = await argon2.hash(password, { type: argon2.argon2id });

  // Check if all gropus exist
  for (const groupId of groups || []) {
    if (!(await prisma.group.findUnique({ where: { pid: groupId } }))) {
      return res.status(404).json({
        type: "error",
        payload: {
          message: `The group with ID '${groupId}' could not be found!`,
        },
      });
    }
  }

  // TODO: Check for uniqueness of the name
  const user = await prisma.admin.create({
    data: {
      name,
      password: password_hash,
      permission_level,
      groups: { connect: groups?.map((group) => ({ pid: group })) },
    },
    select: { pid: true, name: true, permission_level: true },
  });

  res.status(201).json({
    type: "success",
    payload: {
      user,
    },
  });
};

interface UpdatePasswordBody {
  pid?: string;
  password?: string;
  new_password: string;
}

// Expects a valid username (Should be tested beforehand)
const updatePasswordField = async (pid: string, new_password: string) => {
  const new_password_hash = await argon2.hash(new_password, { type: argon2.argon2id });

  await prisma.admin.update({ where: { pid }, data: { password: new_password_hash } });
};

// requires: auth
export const updatePassword = async (req: Request<{}, {}, UpdatePasswordBody>, res: Response) => {
  if (!req.auth?.isAuthenticated) {
    return res.status(500).json(AUTH_ERROR);
  }

  const pid = req.body.pid || req.auth.pid;

  if (typeof req.body.new_password !== "string") {
    return res.status(400).json({
      type: "error",
      payload: {
        message: "The body of your request did not conform to the requirements",
        schema: {
          body: {
            new_password: "string",
          },
        },
      },
    });
  }

  const user_to_upate = await prisma.admin.findUnique({ where: { pid } });

  if (!user_to_upate) {
    // REVIEW: This allows potential attackers (which are authorized with some account)
    //         to test account names
    return res.status(404).json({
      type: "error",
      payload: {
        message: "The requested user was not found",
      },
    });
  }

  if (req.auth.permission_level == "ELEVATED" && user_to_upate.permission_level == "STANDARD") {
    updatePasswordField(pid, req.body.new_password);

    res.status(200).json({
      type: "success",
    });
  } else if (req.auth.pid === pid) {
    if (typeof req.body.password !== "string") {
      return res.status(400).json({
        type: "error",
        payload: "The body of your request did not conform to the requirements",
        schema: {
          body: {
            password: "string",
            new_password: "string",
          },
        },
      });
    }

    if (await argon2.verify(user_to_upate.password, req.body.password, { type: argon2.argon2id })) {
      updatePasswordField(pid, req.body.new_password);

      return res.status(200).json({
        type: "success",
      });
    }

    return res.status(401).json({
      type: "error",
      payload: {
        message: "The provided password is not valid",
      },
    });
  } else {
    res.status(403).json({
      type: "error",
      payload: {
        message: "Operation not permitted; Try logging in as another user",
      },
    });
  }
};
