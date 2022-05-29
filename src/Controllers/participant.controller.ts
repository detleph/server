import prisma from "../lib/prisma";
import { z } from "zod";
import { Request, Response } from "express";
import { createInsufficientPermissionsError, DataType, generateError, generateInvalidBodyError } from "./common";
import { Job, Prisma } from "@prisma/client";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime";
import NotFoundError from "../Middleware/error/NotFoundError";

//TODO: add TeamleaderAuthentification

const ParticipantBody = z.object({
    firstName: z.string(),
    lastName: z.string(),
    groupId: z.string(),
    //job: z.enum(["TEAMLEADER", "MEMBER"]),
});

const returnedParticipant = {
    pid: true,
    firstName: true,
    lastName: true,
    relevance: true,
    team: { select: {
        pid: true, 
        name: true,
    } },
    group: { select: {
        pid: true,
        name: true, 
    } },
} as const;

export const createParticipant = async (req: Request<{ pid: string}>, res: Response) => {
    //insert TeamleaderAuth

    const result = ParticipantBody.safeParse(req.body);

    if(result.success === false){
        return res.status(400).json(
            generateInvalidBodyError({
                firstname: DataType.STRING,
                lastName: DataType.STRING,
                groupId: DataType.UUID,
            })
        );
    }

    const body = result.data;
    const { pid } = req.params;

    try {
        const participant = await prisma.participant.create({
            data: {
                firstName: body.firstName,
                lastName: body.lastName,
                relevance: "MEMBER", 
                group: { connect: { pid: body.groupId } },
                team: { connect: { pid } },
            },
            select: returnedParticipant,
        });

        return res.status(201).json({
            type: "success",
            payload: participant,
        });
    } catch (e) {
        if (e instanceof PrismaClientKnownRequestError && e.code === "P2025") {
          return res.status(404).json(generateError(`Could not link to team with ID '${pid}, or group with ID ${body.groupId}'`));
        }
        throw e;
      }
}

export const updateParticipant = async (req: Request<{ pid: string }>, res: Response) => {
    //insert TeamleaderAuth

    const result = ParticipantBody.safeParse(req.body);

    if(result.success === false){
        return res.status(400).json(
            generateInvalidBodyError({
                firstname: DataType.STRING,
                lastName: DataType.STRING,
                groupId: DataType.UUID,
            })
        );
    }

    const body = result.data;
    const { pid } = req.params;

    try {
        const participant = await prisma.participant.update({
            where: { pid },
            data: {
                firstName: body.firstName,
                lastName: body.lastName,
                group: { connect: { pid: body.groupId, } },
            },
            select: returnedParticipant,
        });
    
        if(!participant) {
            throw new NotFoundError("participant", pid);
        }
    
        res.status(200).json({
            type: "success",
            payload: participant,
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
                    firstname: DataType.STRING,
                    lastName: DataType.STRING,
                    groupId: DataType.UUID,
                },
              },
            });
          }
      
          throw e;
    }
}

export const deleteParticipant = async (req: Request<{ pid: string }>, res: Response) => {
    //insert TeamleaderAuth

    const { pid } = req.params;

    try {
        await prisma.participant.delete({ where: { pid } });

        return res.status(204).end();
    } catch (e) {
        if (e instanceof PrismaClientKnownRequestError && e.code === "P2025") {
            return res.status(404).json(generateError(`The participant with the ID ${pid} could not be found`));
          }
      
          throw e;
    }
}
