import { Request, Response } from "express";
import prisma from "../lib/prisma";
import { DataType, generateInvalidBodyError } from "./common";

export const getAllOrganisations = async (req: Request, res: Response) => {
  const organisations = await prisma.organisation.findMany({
    select: { pid: true, name: true, event: { select: { pid: true, name: true } } },
  });

  res.status(200).json({
    type: "success",
    payload: {
      organisations,
    },
  });
};

interface GetOrganisationQueryParams {
  pid: string;
}

export const getOrganisation = async (req: Request<GetOrganisationQueryParams>, res: Response) => {
  const { pid } = req.params;

  const organisation = await prisma.organisation.findUnique({
    where: { pid },
    select: { pid: true, name: true, event: { select: { pid: true, date: true, name: true, description: true } } },
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
