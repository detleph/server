import { Admin, Prisma } from "@prisma/client";
import { PrismaClientKnownRequestError, PrismaClientUnknownRequestError } from "@prisma/client/runtime";
import { Request, Response } from "express";
import { z } from "zod";
import prisma from "../lib/prisma";
import NotFoundError from "../Middleware/error/NotFoundError";
import { createInsufficientPermissionsError, DataType, generateError, generateInvalidBodyError, genericError, handleCreateByName } from "./common";

const updateGroupBody = z.object({
  name: z.string(),
  user_limit: z.number(),
  level: z.number(),
}).partial();

const basicGroup = {
  pid: true,
  name: true,
  level: true,
  organisation: { select: { pid: true, name: true } },
} as const;

export const _getAllGroups = async (res: Response, organisationId: string | undefined) => {
  const groups = await prisma.group.findMany({
    where: { organisation: { pid: organisationId } },
    select: basicGroup,
  });

  return res.status(200).json({
    type: "success",
    payload: {
      groups,
    },
  });
};

interface GetAllGroupsSearchParams {
  organisationPid?: string;
}

export const getAllGroups = async (req: Request<{}, {}, {}, GetAllGroupsSearchParams>, res: Response) => {
  return _getAllGroups(res, req.query.organisationPid);
};

interface getAllGroupsWithParamQueryParams {
  organisationPid: string;
}

export const getAllGroupsWithParam = async (req: Request<getAllGroupsWithParamQueryParams>, res: Response) => {
  return _getAllGroups(res, req.params.organisationPid);
};

interface GetGroupQueryParams {
  pid: string;
}

export const getGroup = async (req: Request<GetGroupQueryParams>, res: Response) => {
  const { pid } = req.params;

  try {
    const group: {
      pid: string;
      name: string;
      organisation: { pid: string; name: string };
      admins?: { pid: string; name: string }[];
      participants?: { pid: string }[];
    } | null = await prisma.group.findUnique({
      where: { pid },
      select: req.auth?.isAuthenticated
        ? {
            pid: true,
            name: true,
            organisation: { select: { pid: true, name: true } },
            admins: { select: { pid: true, name: true } },
            participants: { select: { pid: true } },
          }
        : basicGroup,
    });

    if (!group) {
      return res.status(404).json(generateError(`The group with ID '${pid}' could not be found`));
    }

    return res.status(200).json({
      type: "success",
      payload: {
        group: {
          ...group,
          organisation: {
            ...group.organisation,
            _links: [{ rel: "self", type: "GET", href: `/api/organisation/${group.organisation.pid}` }],
          },
          ...(req.auth?.isAuthenticated
            ? {
                admins: group.admins?.map((admin) => ({
                  ...admin,
                  _links: [{ rel: "self", type: "GET", href: `/api/admins/${admin.pid}` }],
                })),
                participants: group.participants?.map((participant) => ({
                  ...participant,
                  _links: [{ rel: "self", type: "GET", href: `/api/participant/${participant.pid}` }],
                })),
              }
            : {}),
        },
      },
    });
  } catch (e) {
    if (e instanceof PrismaClientUnknownRequestError) {
      return res.status(400).json(generateError("Unknown error occured. This could be due to malformed IDs"));
    }
  }

  return res.status(500).json(genericError);
};

// at: POST /api/organisations/:eventPid/groups
// requires: auth(ELEVATED)
export const createGroup = async (req: Request<{ organisationPid: string }, {}, { name?: string }>, res: Response) => {
  return handleCreateByName(
    { type: "group", data: { name: req.body.name, level: 1 } },
    { type: "organisation", id: req.params.organisationPid },
    req,
    res
  );
};

export const updateGroup = async (req: Request<{ pid: string }>, res: Response) => {
  //insert TeamleaderAuth

  const result = updateGroupBody.safeParse(req.body);

  if(result.success === false){
      return res.status(400).json(
          generateInvalidBodyError({
              name: DataType.STRING,
              user_limit: DataType.NUMBER,
              level: DataType.NUMBER,
          })
      );
  }

  const body = result.data;
  const { pid } = req.params;

  try {
      const group = await prisma.group.update({
          where: { pid },
          data: {
              name: body.name,
              user_limit: body.user_limit,
              level: body.level,
          },
          select: basicGroup,
      });
  
      if(!group) {
          throw new NotFoundError("group", pid);
      }
  
      res.status(200).json({
          type: "success",
          payload: group,
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
                user_limit: DataType.NUMBER,
                level: DataType.NUMBER,
              },
            },
          });
        }
    
        throw e;
  }
}

interface DeleteGroupQueryParams {
  pid: string;
}

export const deleteGroup = async (req: Request<DeleteGroupQueryParams>, res: Response) => {
  if (req.auth?.permission_level !== "ELEVATED") {
    return res.status(403).json(createInsufficientPermissionsError());
  }

  const { pid } = req.params;

  try {
    prisma.group.delete({ where: { pid } });

    return res.status(204).end();
  } catch (e) {
    if (e instanceof PrismaClientKnownRequestError && e.code === "P2025") {
      return res.status(404).json(generateError(`The group with the ID ${pid} could not be found`));
    }

    throw e;
  }
};
