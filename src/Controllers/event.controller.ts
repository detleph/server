import { Prisma } from "@prisma/client";
import { Request, Response } from "express";
import prisma from "../lib/prisma";
import { DataType, generateInvalidBodyError } from "./common";

export const getAllEvents = async (req: Request, res: Response) => {
  const events = await prisma.event.findMany({
    select: {
      name: true,
      description: true,
      date: true,
      pid: true,
      id: false,
    },
  });
  if (events.length > 0) res.status(200).json(events);
  else res.status(200).json([]);
};

export const getEvent = async (req: Request, res: Response) => {
  const eventId = req.params.eventId;

  if (eventId === undefined || null) {
    res.status(400).json(
      generateInvalidBodyError({
        eventId: DataType.STRING,
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
        description: true,
        date: true,
        pid: true,
        id: false,
      },
    });

    res.status(200).json(event);
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
          shema: {
            eventId: DataType.UUID,
          },
        },
      });
      return;
    }
  }
};

export const addEvent = async (req: Request, res: Response) => {
  if (
    typeof req.body.name !== "string" ||
    typeof req.body.date !== "string" ||
    typeof req.body.description !== "string"
  ) {
    res.status(400).json(
      generateInvalidBodyError({
        name: DataType.STRING,
        date: DataType.DATETIME,
        description: DataType.STRING,
      })
    );
    return;
  }

  //TODO: Check if date is valid

  const event = await prisma.event.create({
    data: {
      name: req.body.name,
      date: req.body.date,
      description: req.body.description,
    },
    select: {
      name: true,
      date: true,
      pid: true,
      id: false,
      description: true,
    },
  });

  res.status(201).json({
    type: "succes",
    payload: {
      event,
    },
  });
};
