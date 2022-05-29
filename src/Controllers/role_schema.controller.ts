import { Prisma } from "@prisma/client";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime";
import { Request, Response } from "express";
import { z } from "zod";
import prisma from "../lib/prisma";
import { DurationSchemaT, parseSchema, PointSchemaT } from "../lib/result_schema";
import NotFoundError from "../Middleware/error/NotFoundError";
import SchemaError from "../Middleware/error/SchemaError";
import {
  createInsufficientPermissionsError,
  DataType,
  generateError,
  generateInvalidBodyError,
  NAME_ERROR,
  validateName,
} from "./common";

const RoleSchemaBody = z.object({
  name: z.string(),
  schema: z.string(),
});

const UpdateRoleSchema = RoleSchemaBody.partial();

const roleSchema = {
  pid: true,
  name: true,
  schema: true,
  discipline: { select: { pid: true, name: true } },
  visual: { select: { pid: true } },
} as const;

export const _getAllRoleSchemas = async (res: Response, disciplinePid: string | undefined) => {
  const schemas = await prisma.roleSchema.findMany({
    where: { discipline: { pid: disciplinePid } },
    select: roleSchema,
  });

  return res.status(200).json({
    type: "success",
    payload: {
      roleSchemas: schemas,
    },
  });
};

interface GetAllRoleSchemasSearchParams {
  disciplinePid?: string;
}

export const getAllRoleSchemas = async (req: Request<{}, {}, {}, GetAllRoleSchemasSearchParams>, res: Response) => {
  return _getAllRoleSchemas(res, req.query.disciplinePid);
};

interface GetAllRoleSchemasWithParamQueryParams {
  organisationPid: string;
}

export const getAllRoleSchemasWithParam = async (
  req: Request<GetAllRoleSchemasWithParamQueryParams>,
  res: Response
) => {
  return _getAllRoleSchemas(res, req.params.organisationPid);
};

interface GetRoleSchemaQueryParams {
  pid: string;
}

export const getRoleSchema = async (req: Request<GetRoleSchemaQueryParams>, res: Response) => {
  const { pid } = req.params;

  const schema = await prisma.roleSchema.findUnique({ where: { pid }, select: roleSchema });

  if (!schema) {
    throw new NotFoundError("roleSchema", pid);
  }

  return res.status(200).json({
    type: "success",
    payload: {
      roleSchema: {
        ...schema,
        discipline: {
          ...schema.discipline,
          _links: [{ rel: "self", type: "GET", href: `/api/disciplines/${schema.discipline.pid}` }],
        },
      },
    },
  });
};

interface CreateRoleSchemaBody {
  name?: string;
  schema?: any;
}

// at: POST /discipline/:disciplinePid/role-schemas
// requires: auth(ELEVATED)
export const createRoleSchema = async (
  req: Request<{ disciplinePid: string }, {}, CreateRoleSchemaBody>,
  res: Response
) => {
  if (req.auth?.permission_level !== "ELEVATED") {
    return res.status(403).json(createInsufficientPermissionsError());
  }

  const { name, schema: resultSchema } = req.body;

  if (typeof name !== "string") {
    return res.status(400).json(generateInvalidBodyError({ name: DataType.STRING, schema: DataType.RESULT_SCHEMA }));
  }

  if (!validateName(name)) {
    return res.status(400).json(NAME_ERROR);
  }

  // Validate the result schema (Errors should be handled by the default error handler)
  const validatedSchema = parseSchema(resultSchema);

  try {
    const schema = await prisma.roleSchema.create({
      data: { name, schema: validatedSchema, discipline: { connect: { pid: req.params.disciplinePid } } },
      select: roleSchema,
    });

    return res.status(201).json({ type: "success", payload: { roleSchema: schema } });
  } catch (e) {
    if (e instanceof PrismaClientKnownRequestError && e.code === "P2025") {
      throw new NotFoundError("discipline", req.params.disciplinePid);
    }

    throw e;
  }
};

export const updateRoleSchema = async (req: Request<{ pid: string }>, res: Response) => {
  if (req.auth?.permission_level !== "ELEVATED") {
    res.status(403).json(createInsufficientPermissionsError());
  }

  const { pid } = req.params;

  const result = UpdateRoleSchema.safeParse(req.body);

  if (result.success === false) {
    return res.status(400).json(
      generateInvalidBodyError({
        name: DataType.STRING,
        schema: DataType.RESULT_SCHEMA,
      })
    );
  }

  const body = result.data;

  try {
    const schema = await prisma.roleSchema.update({
      where: { pid },
      data: {
        name: body.name,
        schema: body.schema,
      },
      select: roleSchema,
    });

    if (!schema) {
      throw new NotFoundError("schema", pid);
    }

    res.status(200).json({
      type: "success",
      payload: schema,
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError) {
      return res.status(500).json({
        type: "error",
        payload: {
          message: `Internal Server error occured. Try again later`,
        },
      });
    }
    if (e instanceof Prisma.PrismaClientUnknownRequestError) {
      return res.status(500).json({
        type: "error",
        payload: {
          message: "Unknown error occurred with your request. Check if your parameters are correct",
          schema: {
            name: DataType.STRING,
            schema: DataType.RESULT_SCHEMA,
          },
        },
      });
    }

    throw e;
  }
};

export const deleteRoleSchema = async (req: Request<{ pid: string }>, res: Response) => {
  if (req.auth?.permission_level !== "ELEVATED") {
    res.status(403).json(createInsufficientPermissionsError());
  }

  const { pid } = req.params;

  try {
    await prisma.roleSchema.delete({ where: { pid } });

    return res.status(204).end();
  } catch (e) {
    if (e instanceof PrismaClientKnownRequestError && e.code === "P2025") {
      return res.status(404).json(generateError(`The RoleSchema with the ID ${pid} could not be found`));
    }

    throw e;
  }
}

interface visualParams {
  schemaPid: string;
}

interface visualBody {
  mediaPid: string;
}

export const addVisual = async (req: Request<visualParams, {}, visualBody>, res: Response) => {
  if (req.auth?.permission_level != "ELEVATED") {
    res.status(403).json(createInsufficientPermissionsError());
  }

  const { schemaPid } = req.params;

  const schema = await prisma.roleSchema.update({
    where: { pid: schemaPid },
    data: {
      visual: { connect: { pid: req.body.mediaPid } },
    },
  });

  if (!schema) {
    throw new NotFoundError("role_schema", schemaPid);
  }

  return res.status(200).json({
    type: "success",
    payload: {},
  });
};

export const deleteVisual = async (req: Request<visualParams & { pid: string }>, res: Response) => {
  if (req.auth?.permission_level != "ELEVATED") {
    res.status(403).json(createInsufficientPermissionsError());
  }

  const { schemaPid, pid } = req.params;

  try {
    await prisma.roleSchema.update({
      where: {
        pid: schemaPid,
      },
      data: {
        visual: { disconnect: { pid } },
      },
    });
    return res.status(204).end();
  } catch (e) {
    if (e instanceof PrismaClientKnownRequestError && e.code === "P2025") {
      throw new NotFoundError("role_schema", schemaPid);
    }

    throw e;
  }
};
