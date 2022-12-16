import prisma from "../lib/prisma";
import { Request, Response } from "express";
import { AdminLevel } from "@prisma/client";
import argon2 from "argon2";
import { AUTH_ERROR, createInsufficientPermissionsError, DataType, generateInvalidBodyError } from "./common";
import { authClient } from "../lib/redis";
import NotFoundError from "../Middleware/error/NotFoundError";
import { notFoundHandler } from "../Middleware/error/defaultRoutes";

require("express-async-errors");

export const regenerateRevision = async (pid: string) => {
  // TOOO: Add error handling
  const { revision } = await prisma.admin.update({
    where: { pid },
    data: { revision: new Date() },
    select: { revision: true },
  });

  await authClient.set(pid, revision.toISOString());
};

// requires: auth(elevated)
export const getAllAdmins = async (req: Request, res: Response) => {
  if (!req.auth?.isAuthenticated) {
    return res.status(500).json(AUTH_ERROR);
  }

  if (req.auth.permission_level !== "ELEVATED") {
    return res.status(403).json(createInsufficientPermissionsError());
  }

  // TODO: Add exception handling
  const users = await prisma.admin.findMany({
    select: { pid: true, name: true, permission_level: true, groups: { select: { pid: true } } },
  });

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
    return res.status(400).json(
      generateInvalidBodyError({
        name: DataType.STRING,
        password: DataType.STRING,
        permission_level: DataType.PERMISSION_LEVEL,
      })
    );
  }

  const password_hash = await argon2.hash(password, { type: argon2.argon2id });

  // Check if all gropus exist
  for (const groupId of groups || []) {
    if (!(await prisma.group.findUnique({ where: { pid: groupId } }))) {
      throw new NotFoundError("group", groupId);
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

// Expects a valid username (Should be tested beforehand)
const updatePasswordField = async (pid: string, new_password: string) => {
  const new_password_hash = await argon2.hash(new_password, { type: argon2.argon2id });

  await prisma.admin.update({ where: { pid }, data: { password: new_password_hash } });
};

interface UpdateForeignPasswordBody {
  new_password?: string;
}

interface UpdateForeignPasswordQueryParams {
  pid: string;
}

export const updateForeignPassword = async (
  req: Request<UpdateForeignPasswordQueryParams, {}, UpdateForeignPasswordBody>,
  res: Response
) => {
  if (!req.auth?.isAuthenticated) {
    return res.status(500).json(AUTH_ERROR);
  }

  if (typeof req.body.new_password !== "string") {
    return res.status(400).json(generateInvalidBodyError({ new_password: DataType.STRING }));
  }

  const user_to_upate = await prisma.admin.findUnique({ where: { pid: req.params.pid } });

  if (!user_to_upate) {
    // REVIEW: This allows potential attackers (which are authorized with some account)
    //         to test account names
    throw new NotFoundError("user", req.params.pid);
  }

  if (req.auth.permission_level == "ELEVATED" && user_to_upate.permission_level == "STANDARD") {
    await updatePasswordField(req.params.pid, req.body.new_password); // REVIEW: Should this be awaited?
    await regenerateRevision(req.params.pid);

    res.status(200).json({
      type: "success",
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

interface UpdatePasswordBody {
  password?: string;
  new_password?: string;
}

// requires: auth
export const updateOwnPassword = async (req: Request<{}, {}, UpdatePasswordBody>, res: Response) => {
  if (!req.auth?.isAuthenticated) {
    return res.status(500).json(AUTH_ERROR);
  }

  const pid = req.auth.pid;

  if (typeof req.body.password !== "string" || typeof req.body.new_password !== "string") {
    return res.status(400).json(generateInvalidBodyError({ password: DataType.STRING, new_password: DataType.STRING }));
  }

  const user_to_upate = await prisma.admin.findUnique({ where: { pid } });

  if (!user_to_upate) {
    // REVIEW: This allows potential attackers (which are authorized with some account)
    //         to test account names
    throw new NotFoundError("user", pid);
  }

  if (await argon2.verify(user_to_upate.password, req.body.password, { type: argon2.argon2id })) {
    await updatePasswordField(pid, req.body.new_password);
    await regenerateRevision(pid);

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
};
