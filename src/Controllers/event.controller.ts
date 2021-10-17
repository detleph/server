import { Request, Response } from "express";
import prisma from "../lib/prisma";

const getAllEvents = async (req: Request, res: Response) => {
  const events = await prisma.event.findMany({
    select: {
      name: true,
      date: true,
      pid: true,
      id: false,
    },
  });
  if (events.length > 0) res.status(200).send(events);
  else res.status(204).send();
};

const addEvent = async (req: Request, res: Response) => {
  // TODO: Add checks if user has admin permissions

  if (req.body.name == null || undefined || req.body.date == null || undefined) {
    res.status(400).send("Malformed request");
    return;
  }

  const event = await prisma.event.create({
    data: {
      name: req.body.name,
      date: req.body.date,
    },
    select: {
      name: true,
      date: true,
      pid: true,
      id: false,
    },
  });
  res.status(201).send(event);
};

export { getAllEvents, addEvent };
