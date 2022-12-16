import { AdminLevel, Prisma } from "@prisma/client";
import { PrismaClientKnownRequestError, PrismaClientUnknownRequestError } from "@prisma/client/runtime";
import { Request, Response } from "express";
import { ZodError } from "zod";
import prisma from "../lib/prisma";

interface StringIndexedObject {
  [k: string]: any;
}

export function createError(message: string, payload: StringIndexedObject = {}, links: StringIndexedObject = {}) {
  return {
    type: "error",
    payload: {
      message: message,
      ...payload,
    },
    _links: links,
  };
}

export enum DataType {
  STRING = "string",
  NUMBER = "number",
  INTEGER = "integer",
  PERMISSION_LEVEL = "'ELEVATED' | 'STANDARD'",
  JOB = "'TEAMLEADER' | 'MEMBER'",
  DATETIME = "ISOstring",
  UUID = "string",
  RESULT_SCHEMA = "result_schema",
}

interface Body {
  [k: string]: DataType;
}

export function generateInvalidBodyError(body: Body, zodError?: ZodError) {
  if (zodError instanceof ZodError) {
    return {
      type: "error",
      payload: {
        message: "The body of your request did not conform to the requirements",
        errors: { body: zodError.format() },
        schema: { body },
      },
    };
  }

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

export const NAME_ERROR = {
  type: "error",
  payload: {
    message: "The name has to be at least 1 character long",
  },
};

export function validateName(name: string) {
  return name.length > 0;
}

type Organisation = Partial<Prisma.OrganisationCreateArgs["data"]>;
type Group = Partial<Prisma.GroupCreateArgs["data"]>;

export async function handleCreateByName(
  create: { type: "organisation"; data: Organisation },
  link: { type: "event"; id: string },
  req: Request<any>,
  res: Response
): Promise<unknown>;
export async function handleCreateByName(
  create: { type: "group"; data: Group },
  link: { type: "organisation"; id: string },
  req: Request<any>,
  res: Response
): Promise<unknown>;
export async function handleCreateByName(
  create: { type: "organisation" | "group"; data: Organisation | Group },
  link: { type: "event" | "organisation"; id: string },
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
    return res.status(400).json(NAME_ERROR);
  }

  // Check if link object exsits

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

  // @ts-ignore
  const object = await prisma[create.type].create({
    data: { ...create.data, [link.type]: { connect: { pid: link.id } } },
    select: { pid: true, name: true },
  });

  res.status(201).json({ type: "success", payload: { [create.type]: object } });
}
