import { PrismaClientUnknownRequestError } from "@prisma/client/runtime";
import { Request, Response } from "express";
import prisma from "../lib/prisma";
import { generateError, genericError } from "./common";

const basicGroup = {
  pid: true,
  name: true,
  oragnisation: { select: { pid: true, name: true } },
} as const;

export const _getAllGroups = async (res: Response, organisationId: string | undefined) => {
  const groups = await prisma.group.findMany({
    where: { oragnisation: { pid: organisationId } },
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
    const group = await prisma.group.findUnique({
      where: { pid },
      select: {
        pid: true,
        name: true,
        oragnisation: { select: { pid: true, name: true } },
        admins: { select: { pid: true, name: true } },
        participants: { select: { pid: true } },
      },
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
            ...group.oragnisation,
            _links: [{ rel: "self", type: "GET", href: `/api/organisation/${group.oragnisation.pid}` }],
          },
          admins: group.admins.map((admin) => ({
            ...admin,
            _links: [{ rel: "self", type: "GET", href: `/api/admins/${admin.pid}` }],
          })),
          participants: group.participants.map((participant) => ({
            ...participant,
            _links: [{ rel: "self", type: "GET", href: `/api/participant/${participant.pid}` }],
          })),
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
