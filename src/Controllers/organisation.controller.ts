import { PrismaClientUnknownRequestError } from "@prisma/client/runtime";
import { Request, Response } from "express";
import prisma from "../lib/prisma";
import { AUTH_ERROR, createInsufficientPermissionsError, DataType, generateInvalidBodyError } from "./common";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime";
import { Prisma } from "@prisma/client";

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
  if (!req.auth?.isAuthenticated) {
    return res.status(500).json(AUTH_ERROR);
  }

  if (req.auth.permission_level !== "ELEVATED") {
    return res.status(403).json(createInsufficientPermissionsError());
  }

  const { name } = req.body || {};
  const { eventPid } = req.params;

  if (typeof name !== "string") {
    return res.status(400).json(generateInvalidBodyError({ name: DataType.STRING, eventId: DataType.UUID }));
  }

  // Check if event exists

  try {
    const event = await prisma.event.findUnique({ where: { pid: eventPid }, select: { id: true } });

    if (!event) {
      return res.status(404).json({
        type: "error",
        payload: {
          message: `The event with the ID ${eventPid} could not be found`,
        },
      });
    }
  } catch (e) {
    // REVIEW: Check for valid UUID
    if (e instanceof PrismaClientUnknownRequestError) {
      return res.status(400).send({
        type: "error",
        payload: {
          message: "Unknown error occured. This could be to malformed IDs",
        },
      });
    }
  }

  const organisation = await prisma.organisation.create({
    data: { name, event: { connect: { pid: eventPid } } },
    select: detailedOrganisation,
  });

  res.status(201).json({ type: "success", payload: { organisation } });
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

  if (name && typeof name !== "string") {
    return res.status(400).json(
      generateInvalidBodyError({
        name: DataType.STRING,
      })
    );
  }

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
};
