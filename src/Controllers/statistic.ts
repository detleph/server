import { NextFunction, Request, Response } from "express";
import prisma from "../lib/prisma";
import { createInsufficientPermissionsError } from "./common";

export const visitLogger = async (req: Request, res: Response) => {
    const address = req.headers['x-forwarded-for']?.at(0) || req.socket.remoteAddress;

    prisma.visitorLog.create({data: { ipAddress: address, }});
}

export const getAllVisits = async (req: Request, res: Response) => {
    if (req.auth?.permission_level != "ELEVATED") {
      res.status(403).json(createInsufficientPermissionsError());
    }
  
    const data = await prisma.visitorLog.findMany({
      select: {
        id: true,
        date: true,
        ipAddress: true,
      }
    });
  
    res.status(200).json({
      type: "success",
      payload: {
        data,
      },
    });
  }