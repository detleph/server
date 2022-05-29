import { Prisma } from "@prisma/client";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime";
import e, { Request, Response } from "express";
import { z } from "zod";
import prisma from "../lib/prisma";
import NotFoundError from "../Middleware/error/NotFoundError";
import { createInsufficientPermissionsError, DataType, generateError, generateInvalidBodyError } from "./common";

require("express-async-errors");

const EventBody = z.object({
  pid: z.string().max(0),
  id: z.string().max(0),
  name: z.string(),
  date: z.string(),
  briefDescription: z.string(),
  fullDescription: z.string(),
});

const UpdateBody = EventBody.partial();

const CreateEventBody = EventBody.partial({
  fullDescription: true,
});

export const getAllEvents = async (req: Request, res: Response) => {
  const events = await prisma.event.findMany({
    select: {
      pid: true,
      name: true,
      date: true,
      briefDescription: true,
      fullDescription: true,
      visual: { select: { pid: true, description: true } },
      disciplines: {
        select: { 
          pid: true, 
          name: true,
        }},
      organisations: {
        select: {
          pid: true,
          name: true,
        }
      }
    },
  });

  res.status(200).json({
    type: "success",
    payload: {
      events,
    },
  });
};

export const getEvent = async (req: Request, res: Response) => {
  const eventId = req.params.eventId;

  if (typeof eventId !== "string") {
    res.status(400).json(
      generateInvalidBodyError({
        eventId: DataType.UUID,
      })
    );
    return;
  }
  try {
    const event = await prisma.event.findUnique({
      where: {
        pid: eventId,
      },
      select: {
        pid: true,
        name: true,
        date: true,
        briefDescription: true,
        fullDescription: true,
        visual: { select: { pid: true, description: true } },
        disciplines: {
          select: { 
            pid: true, 
            name: true,
            briefDescription: true,
            fullDescription: true,
          }},
        organisations: {
          select: {
            pid: true,
            name: true,
          }
        }
      },
    });

    if (!event) {
      throw new NotFoundError("event", eventId);
    }

    res.status(200).json({
      type: "success",
      payload: {
        event,
      },
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
            eventId: DataType.UUID,
          },
        },
      });
    }

    throw e;
  }
};

// requires: auth(ELEVATED)
export const addEvent = async (req: Request, res: Response) => {
  if (req.auth?.permission_level !== "ELEVATED") {
    res.status(403).json(createInsufficientPermissionsError());
  }

  const result = CreateEventBody.safeParse(req.body);

  if(result.success === false){
    return res.status(400).json(
      generateInvalidBodyError({
        name: DataType.STRING,
        date: DataType.DATETIME,
        briefDescription: DataType.STRING,
        ["fullDescription?"]: DataType.STRING,
      })
    );
  }

  //TODO: Check if date is valid

  const event = await prisma.event.create({
    data: {
      name: req.body.name,
      date: req.body.date,
      briefDescription: req.body.briefDescription,
      fullDescription: req.body.fullDescription,
    },
    select: {
      pid: true,
      name: true,
      date: true,
      briefDescription: true,
      fullDescription: true,
    },
  });

  res.status(201).json({
    type: "success",
    payload: {
      event,
    },
  });
};

export const updateEvent = async (req: Request<{ pid: string }>, res: Response) => {
  if (req.auth?.permission_level !== "ELEVATED") {
    res.status(403).json(createInsufficientPermissionsError());
  }

  const { pid } = req.params;

  const result = UpdateBody.safeParse(req.body);

  if (result.success === false) {
    return res.status(400).json(
      generateInvalidBodyError({
        name: DataType.STRING,
        date: DataType.DATETIME,
        briefDescription: DataType.STRING,
        ["fullDescription?"]: DataType.STRING,
      })
    );
  }

  const body = result.data;

  try {
    const event = await prisma.event.update({
      where: { pid },
      data: {
        name: body.name,
        date: body.date,
        briefDescription: body.briefDescription,
        fullDescription: body.fullDescription,
      },
      select: {
        pid: true,
        name: true,
        date: true,
        briefDescription: true,
        fullDescription: true,
      },
    });

    if (!event) {
      throw new NotFoundError("event", pid);
    }

    res.status(200).json({
      type: "success",
      payload: {
        event,
      },
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
            eventId: DataType.UUID,
          },
        },
      });
    }

    throw e;
  }
};

interface DeleteEventQueryParams {
  pid: string;
}

// requires: auth(ELEVATED)
export const deleteEvent = async (req: Request<DeleteEventQueryParams>, res: Response) => {
  if (req.auth?.permission_level !== "ELEVATED") {
    res.status(403).json(createInsufficientPermissionsError());
  }

  const { pid } = req.params;

  try {
    await prisma.event.delete({ where: { pid } });

    return res.status(204).end();
  } catch (e) {
    if (e instanceof PrismaClientKnownRequestError && e.code === "P2025") {
      return res.status(404).json(generateError(`The organisation with the ID ${pid} could not be found`));
    }

    throw e;
  }
};
