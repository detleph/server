import { AdminLevel, Prisma } from "@prisma/client";
import { PrismaClientKnownRequestError, PrismaClientUnknownRequestError } from "@prisma/client/runtime";
import { Request, Response } from "express";
import prisma from "../lib/prisma";

export enum DataType {
  STRING = "string",
  NUMBER = "number",
  INTEGER = "integer",
  PERMISSION_LEVEL = "'ELEVATED' | 'STANDARD'",
  DATETIME = "ISOstring",
  UUID = "string",
}

interface Body {
  [k: string]: DataType;
}

export function generateInvalidBodyError(body: Body) {
  return {
    type: "error",
    payload: {
      message: "The body of your request did not conform to the requirements",
      schema: { body },
    },
  };
}

export const AUTH_ERROR = {
  type: "failure",
  payload: {
    message: "The server was not able to validate your credentials; Please try again later",
  },
};

export const createInsufficientPermissionsError = (required: AdminLevel = "ELEVATED") => ({
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

export const generateError = (message: string) => {
  return {
    type: "error",
    payload: {
      message,
    },
  };
};

export const genericError = {
  type: "error",
  payload: {
    message: "There was an error processing your request, please try again later",
  },
};

export function validateName(name: string) {
  return name.length > 0;
}

type Organisation = Partial<Prisma.OrganisationCreateArgs["data"]>;
type Group = Partial<Prisma.GroupCreateArgs["data"]>;

export async function handleCreateByName(
  create: { type: "oragnisation"; data: Organisation },
  link: { type: "event"; id: string },
  req: Request<any>,
  res: Response
): Promise<unknown>;
export async function handleCreateByName(
  create: { type: "group"; data: Group },
  link: { type: "oragnisation"; id: string },
  req: Request<any>,
  res: Response
): Promise<unknown>;
export async function handleCreateByName(
  create: { type: "oragnisation" | "group"; data: Organisation | Group },
  link: { type: "event" | "oragnisation"; id: string },
  req: Request<any>,
  res: Response
) {
  if (!req.auth?.isAuthenticated) {
    return res.status(500).json(AUTH_ERROR);
  }

  if (req.auth.permission_level !== "ELEVATED") {
    return res.status(403).json(createInsufficientPermissionsError());
  }

  const { name } = create.data;

  if (typeof name !== "string") {
    return res
      .status(400)
      .json(generateInvalidBodyError({ name: DataType.STRING, [link.type + "Pid"]: DataType.STRING }));
  }

  if (!validateName(name)) {
    return res.status(400).json({
      type: "error",
      payload: {
        message: "The name has to be at least 1 character long",
      },
    });
  }

  // Check if link object exsits

  try {
    // @ts-ignore
    const linked = await prisma[link.type].findUnique({ where: { pid: link.id }, select: { id: true } });

    if (!linked) {
      return res.status(404).json({
        type: "error",
        payload: {
          message: `Could not link to ${link.type} with ID '${link.id}'`,
        },
      });
    }
  } catch (e) {
    // REVIEW: Check for valid UUID
    if (e instanceof PrismaClientUnknownRequestError) {
      return res.status(400).json({
        type: "error",
        payload: {
          message: "Unknown error occured. This could be due to malformed IDs",
        },
      });
    }
  }

  // @ts-ignore
  const object = await prisma[create.type].create({
    data: { ...create.data, [link.type]: { connect: { pid: link.id } } },
    select: { pid: true, name: true },
  });

  res.status(201).json({ type: "success", payload: { [create.type]: object } });
}
