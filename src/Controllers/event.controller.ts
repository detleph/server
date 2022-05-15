import { Prisma } from "@prisma/client";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime";
import { Request, Response } from "express";
import prisma from "../lib/prisma";
import NotFoundError from "../Middleware/error/NotFoundError";
import { createInsufficientPermissionsError, DataType, generateError, generateInvalidBodyError } from "./common";

export const getAllEvents = async (req: Request, res: Response) => {
  const events = await prisma.event.findMany({
    select: {
      name: true,
      briefDescription: true,
      fullDescription: true,
      visual: {select: {pid: true, description: true}},
      date: true,
      pid: true,
      id: false,
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
        name: true,
        briefDescription: true,
        fullDescription: true,
        date: true,
        pid: true,
        id: false,
        visual: {select: {pid: true, description: true}}
      },
    });

    res.status(200).json({
      type: "success",
      payload: {
        event,
      },
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError) {
      res.status(500).json({
        type: "error",
        payload: {
          message: `Internal Server error occured. Try again later`,
        },
      });
      return;
    }
    if (e instanceof Prisma.PrismaClientUnknownRequestError) {
      res.status(500).json({
        type: "error",
        payload: {
          message: "Unknown error occurred with your request. Check if your parameters are correct",
          schema: {
            eventId: DataType.UUID,
          },
        },
      });
      return;
    }
  }
};

// requires: auth(ELEVATED)
export const addEvent = async (req: Request, res: Response) => {
  if (req.auth?.permission_level !== "ELEVATED") {
    res.status(403).json(createInsufficientPermissionsError());
  }
  if (
    typeof req.body.name !== "string" ||
    typeof req.body.date !== "string" ||
    typeof req.body.description !== "string"
  ) {
    generateInvalidBodyError({
      name: DataType.STRING,
      date: DataType.DATETIME,
      description: DataType.STRING,
    });
  }

  //TODO: Check if date is valid

  const event = await prisma.event.create({
    data: {
      name: req.body.name,
      date: req.body.date,
      briefDescription: req.body.description,
    },
    select: {
      name: true,
      date: true,
      pid: true,
      id: false,
      briefDescription: true,
    },
  });

  res.status(201).json({
    type: "success",
    payload: {
      event,
    },
  });
};

interface DeleteEventQueryParams {
  pid: string;
}

// requires: auth(ELEVATED)
export const deleteEvent = (req: Request<DeleteEventQueryParams>, res: Response) => {
  if (req.auth?.permission_level !== "ELEVATED") {
    res.status(403).json(createInsufficientPermissionsError());
  }

  const { pid } = req.params;

  try {
    prisma.event.delete({ where: { pid } });

    return res.status(204).end();
  } catch (e) {
    if (e instanceof PrismaClientKnownRequestError && e.code === "P2025") {
      return res.status(404).json(generateError(`The organisation with the ID ${pid} could not be found`));
    }

    throw e;
  }
};

// REVIEW: This code **will** need to be de-duplicated

interface visualParams {
  eventPid: string;
}

interface visualBody {
  mediaPid: string;
}

export const addVisual = async (req: Request<visualParams, {}, visualBody>, res: Response) => {
  if (req.auth?.permission_level != "ELEVATED"){
    res.status(403).json(createInsufficientPermissionsError());
  }

  const { eventPid } = req.params;

  if (typeof req.body.mediaPid !== "string") {
    res.status(400).json(generateInvalidBodyError({mediaPid: DataType.STRING}));
  }
  
  const event = await prisma.event.update({
    where: { pid: eventPid },
    data: {
      visual: { connect: { pid: req.body.mediaPid } }
    }
  });

  if (!event) {
    throw new NotFoundError("event", eventPid);
  }

  return res.status(200).json({
    type: "success",
    payload: { }
  })
};

export const deleteVisual = async (req: Request<visualParams, {}, visualBody>, res: Response) => {
  if (req.auth?.permission_level != "ELEVATED"){
    res.status(403).json(createInsufficientPermissionsError());
  }

  const { eventPid } = req.params;

  try {
    await prisma.event.update({ 
      where: { 
        pid: eventPid,
       },
      data: { 
        visual: { disconnect: { pid: req.body.mediaPid } }
       }
    });
    return res.status(204).end();
  } catch (e) {
    if (e instanceof PrismaClientKnownRequestError && e.code === "P2025") {
      throw new NotFoundError("discipline", eventPid);
    }

    throw e;
  }
};
