import prisma from "../lib/prisma";
import { z } from "zod";
import { Request, Response } from "express";
import { createInsufficientPermissionsError, DataType, generateError, generateInvalidBodyError } from "./common";
import { Job } from "@prisma/client";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime";

//TODO: add TeamleaderAuthentification
// discuss wether 

const ParticipantBody = z.object({
    firstName: z.string(),
    lastName: z.string(),
    groupId: z.string(),
    job: z.enum(["TEAMLEADER", "MEMBER"]),
})

const returnedParticipant = {
    pid: true,
    firstName: true,
    lastName: true,
    relevance: true,
    team: { select: { pid: true, } },
    group: { select: { pid: true, } },
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
                job: DataType.JOB,
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
                relevance: body.job, 
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