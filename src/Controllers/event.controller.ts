import { Prisma } from "@prisma/client";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime";
import e, { Request, Response } from "express";
import { z } from "zod";
import prisma from "../lib/prisma";
import NotFoundError from "../Middleware/error/NotFoundError";
import { createInsufficientPermissionsError, DataType, generateError, generateInvalidBodyError } from "./common";

require("express-async-errors");

export const dateSchema = z.preprocess((arg) => {
  if (typeof arg == "string" || arg instanceof Date) return new Date(arg);
}, z.date());

const EventBody = z.object({
  name: z.string().min(1),
  date: dateSchema,
  briefDescription: z.string(),
  fullDescription: z.string(),
});

const UpdateBody = EventBody.partial();

const CreateEventBody = EventBody.partial({
  fullDescription: true,
});

const basicEvent = {
  pid: true,
  name: true,
  date: true,
  briefDescription: true,
  fullDescription: true,
} as const;

const detailedEvent = {
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
    },
  },
} as const;

export const getAllEvents = async (req: Request, res: Response) => {
  const events = await prisma.event.findMany({
    select: detailedEvent,
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

  const event = await prisma.event.findUnique({
    where: {
      pid: eventId,
    },
    select: detailedEvent,
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
};

// requires: auth(ELEVATED)
export const addEvent = async (req: Request, res: Response) => {
  if (req.auth?.permission_level !== "ELEVATED") {
    res.status(403).json(createInsufficientPermissionsError());
  }

  const result = CreateEventBody.safeParse(req.body);

  if (result.success === false) {
    return res.status(400).json(
      generateInvalidBodyError(
        {
          name: DataType.STRING,
          date: DataType.DATETIME,
          briefDescription: DataType.STRING,
          ["fullDescription?"]: DataType.STRING,
        },
        result.error
      )
    );
  }

  const body = result.data;

  const event = await prisma.event.create({
    data: {
      name: body.name,
      date: body.date,
      briefDescription: body.briefDescription,
      fullDescription: body.fullDescription,
    },
    select: basicEvent,
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
      generateInvalidBodyError(
        {
          name: DataType.STRING,
          date: DataType.DATETIME,
          briefDescription: DataType.STRING,
          ["fullDescription?"]: DataType.STRING,
        },
        result.error
      )
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

    res.status(200).json({
      type: "success",
      payload: {
        event,
      },
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2025") {
      throw new NotFoundError("event", pid);
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
      throw new NotFoundError("event", pid);
    }

    throw e;
  }
};
