import { PrismaClientUnknownRequestError } from "@prisma/client/runtime";
import { Request, Response } from "express";
import prisma from "../lib/prisma";
import {
  AUTH_ERROR,
  createInsufficientPermissionsError,
  DataType,
  generateError,
  generateInvalidBodyError,
  genericError,
  handleCreateByName,
} from "./common";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime";
import { Prisma } from "@prisma/client";

function validateOranisationName(name: string) {
  return name.length > 0;
}

const detailedOrganisation = {
  pid: true,
  name: true,
  event: {
    select: {
      pid: true,
      name: true,
      date: true,
      description: true,
    },
  },
} as const;

const basicOrganisation = {
  pid: true,
  name: true,
  event: {
    select: {
      pid: true,
      name: true,
    },
  },
} as const;

export const _getAllOrganisations = async (res: Response, eventId: string | undefined = undefined) => {
  const organisations = await prisma.organisation.findMany({
    where: { event: { pid: eventId } },
    select: basicOrganisation,
  });

  return res.status(200).json({
    type: "success",
    payload: {
      organisations,
    },
  });
};

interface GetAllOrganisationsSearchParams {
  eventId?: string;
}

export const getAllOrganisations = async (req: Request<{}, {}, {}, GetAllOrganisationsSearchParams>, res: Response) => {
  // TODO: Maybe rename to eventPid
  return _getAllOrganisations(res, req.query.eventId);
};

interface GetAllOrganisationsWithParamQueryParams {
  eventPid: string;
}

export const getAllOrganisationsWithParam = async (
  req: Request<GetAllOrganisationsWithParamQueryParams>,
  res: Response
) => {
  return _getAllOrganisations(res, req.params.eventPid);
};

interface GetOrganisationQueryParams {
  pid: string;
}

export const getOrganisation = async (req: Request<GetOrganisationQueryParams>, res: Response) => {
  const { pid } = req.params;

  const organisation = await prisma.organisation.findUnique({
    where: { pid },
    select: detailedOrganisation,
  });

  if (!organisation) {
    return res.status(404).json({
      type: "error",
      payload: {
        message: `The organisation with ID '${pid} could not be found'`,
      },
    });
  }

  return res.status(200).json({
    type: "success",
    payload: {
      organisation: {
        ...organisation,
        event: {
          ...organisation.event,
          _links: [{ rel: "self", type: "GET", href: `/api/event/${organisation.event.pid}` }],
        },
      },
    },
  });
};

interface CreateOrganisationQueryParams {
  eventPid: string;
}

interface CreateOrganisationBody {
  name?: string;
}

// at: POST /api/events/:eventPid/organisations
// requires: auth(ELEVATED)
export const createOrganisation = async (
  req: Request<CreateOrganisationQueryParams, {}, CreateOrganisationBody>,
  res: Response
) => {
  return handleCreateByName(
    { type: "organisation", data: { name: req.body.name } },
    { type: "event", id: req.params.eventPid },
    req,
    res
  );
};

interface UpdateOrganisationQueryParams {
  pid: string;
}

interface UpdateOrganisationBody {
  name?: string;
}

// requires: auth(ELEVATED)
export const updateOrganisation = async (
  req: Request<UpdateOrganisationQueryParams, {}, UpdateOrganisationBody>,
  res: Response
) => {
  if (!req.auth?.isAuthenticated) {
    return res.status(500).json(AUTH_ERROR);
  }

  if (req.auth.permission_level !== "ELEVATED") {
    return res.status(403).json(createInsufficientPermissionsError());
  }

  const { pid } = req.params;
  const { name } = req.body;

  if (name !== undefined && typeof name !== "string") {
    return res.status(400).json(
      generateInvalidBodyError({
        name: DataType.STRING,
      })
    );
  }

  if (name !== undefined && !validateOranisationName(name)) {
    return res.status(400).json({
      type: "error",
      payload: {
        message: "The name has to be at least 1 character long",
      },
    });
  }

  try {
    const organisation = await prisma.organisation.update({
      where: { pid },
      data: { name },
      select: detailedOrganisation,
    });

    return res.status(200).json({
      type: "success",
      payload: {
        organisation,
      },
    });
  } catch (e) {
    if (e instanceof PrismaClientKnownRequestError) {
      if (e.code === "P2025") {
        return res.status(404).json(generateError(`The organisation with the ID ${pid} could not be found`));
      }
    } else if (e instanceof PrismaClientUnknownRequestError) {
      return res.status(400).send(generateError("Unkonwn error occured. This could be due to malformed IDs"));
    }
  }

  return res.status(500).json(genericError);
};

interface DeleteOrganisationQueryParams {
  pid: string;
}

// requires: auth(ELEVATED)
export const deleteOrganisation = async (req: Request<DeleteOrganisationQueryParams>, res: Response) => {
  if (!req.auth?.isAuthenticated) {
    return res.status(500).json(AUTH_ERROR);
  }

  if (req.auth.permission_level !== "ELEVATED") {
    return res.status(403).json(createInsufficientPermissionsError());
  }

  const { pid } = req.params;

  try {
    prisma.organisation.delete({ where: { pid } });

    res.status(204).end();
  } catch (e) {
    if (e instanceof PrismaClientKnownRequestError) {
      if ((e.code = "P2025")) {
        return res.status(404).json(generateError(`The organisation with the ID ${pid} could not be found`));
      }
    } else if (e instanceof PrismaClientUnknownRequestError) {
      return res.status(400).send(generateError("Unkonwn error occured. This could be due to malformed IDs"));
    }
  }

  return res.status(500).json(genericError);
};
