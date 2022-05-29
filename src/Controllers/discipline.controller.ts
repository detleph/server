import { Prisma, Organisation, Admin, AdminLevel, Team } from "@prisma/client";
import { PrismaClientKnownRequestError, PrismaClientUnknownRequestError } from "@prisma/client/runtime";
import { Request, Response } from "express";
import prisma from "../lib/prisma";
import ForwardableError from "../Middleware/error/ForwardableError";
import NotFoundError from "../Middleware/error/NotFoundError";
import { number, z } from "zod";
import {
  createInsufficientPermissionsError,
  DataType,
  generateError,
  generateInvalidBodyError,
  NAME_ERROR,
  validateName,
} from "./common";

require("express-async-errors");

const DisciplineBody = z.object({
  name: z.string(),
  maxTeamSize: z.number(),
  minTeamSize: z.number(),
  briefDescription: z.string(),
  fullDescription: z.string(),
  eventPid: z.string(),
})

const UpdateDisciplineBody = DisciplineBody.partial();

const basicDiscipline = {
  pid: true,
  name: true,
  visual: { select: { pid: true } },
  maxTeamSize: true,
  minTeamSize: true,
  briefDescription: true,
  fullDescription: true,
  event: { select: { pid: true, name: true } },
  roles: { select: { pid: true, name: true } },
} as const;

const authenticatedDiscipline = {
  ...basicDiscipline,
  teams: { select: { pid: true, name: true } },
} as const;

const elevatedDiscipline: Prisma.DisciplineFindManyArgs["select"] = {
  ...authenticatedDiscipline,
  teams: { select: { pid: true, name: true, leaderEmail: true } },
};

export const _getAllDisciplines = async (
  res: Response,
  authenticated: boolean | undefined,
  eventId: string | undefined
) => {
  const disciplines = await prisma.discipline.findMany({
    where: { event: { pid: eventId } },
    select: !authenticated ? basicDiscipline : authenticatedDiscipline,
  });

  return res.status(200).json({
    type: "success",
    payload: {
      disciplines,
    },
  });
};

interface GetAllDisciplinesSearchParams {
  eventPid?: string;
}

export const getAllDisciplines = async (req: Request<{}, {}, {}, GetAllDisciplinesSearchParams>, res: Response) => {
  return _getAllDisciplines(res, req.auth?.isAuthenticated, req.query.eventPid);
};

interface GetAllDisciplinesQueryParams {
  eventPid: string;
}

export const GetAllDisciplinesWithParam = async (req: Request<GetAllDisciplinesQueryParams>, res: Response) => {
  return _getAllDisciplines(res, req.auth?.isAuthenticated, req.params.eventPid);
};

interface GetDisciplineQueryParams {
  pid: string;
}

export const getDiscipline = async (req: Request<GetDisciplineQueryParams>, res: Response) => {
  const { pid } = req.params;

  const discipline = await prisma.discipline.findUnique({
    where: { pid },
    select: !req.auth?.isAuthenticated
      ? basicDiscipline
      : req.auth.permission_level !== "ELEVATED"
      ? authenticatedDiscipline
      : elevatedDiscipline,
  });

  if (!discipline) {
    throw new NotFoundError("discipline", pid);
  }

  return res.status(200).json({
    type: "success",
    payload: {
      discipline: {
        ...discipline,
        event: {
          ...discipline.event,
          _links: [{ rel: "self", type: "GET", href: `/api/events/${discipline.event.pid}` }],
        },
        roles: discipline.roles.map((role) => ({
          ...role,
          _links: [{ rel: "self", type: "GET", href: `/api/role/${role.pid}` }],
        })),
        ...((discipline as any).teams
          ? (discipline as any).teams.map((team: Team) => ({
              ...team,
              _links: [{ rel: "self", type: "GET", href: `/api/teams/${team.pid}` }],
            }))
          : {}),
      },
    },
  });
};

export const updateDiscipline = async (req: Request<{ pid: string }>, res: Response) => {
  if (req.auth?.permission_level !== "ELEVATED") {
    res.status(403).json(createInsufficientPermissionsError());
  }

  const { pid } = req.params;

  const result = UpdateDisciplineBody.safeParse(req.body);

  if (result.success === false) {
    return res.status(400).json(
      generateInvalidBodyError({
        name: DataType.STRING,
        minTeamSize: DataType.NUMBER,
        maxTeamSize: DataType.NUMBER,
        briefDescription: DataType.STRING,
        ["fullDescription?"]: DataType.STRING,
      })
    );
  }

  const body = result.data;

  try {
    const discipline = await prisma.discipline.update({
      where: { pid },
      data: {
        name: body.name,
        minTeamSize: body.minTeamSize,
        maxTeamSize: body.maxTeamSize,
        briefDescription: body.briefDescription,
        fullDescription: body.fullDescription,
      },
      select: {
        pid: true,
        name: true,
        minTeamSize: true,
        maxTeamSize: true,
        briefDescription: true,
        fullDescription: true,
      },
    });

    if (!discipline) {
      throw new NotFoundError("discipline", pid);
    }

    res.status(200).json({
      type: "success",
      payload: {
        discipline,
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

interface CreateDisciplineBody {
  name?: string;
  minTeamSize?: number;
  maxTeamSize?: number;
  briefDescription?: string;
  fullDescription?: string;
}

// require: auth(ELEVATED)
// at: POST /event/:eventPid/discipliens
export const createDiscipline = async (req: Request<{ eventPid: string }, {}, CreateDisciplineBody>, res: Response) => {
  if (req.auth?.permission_level !== "ELEVATED") {
    return res.status(403).json(createInsufficientPermissionsError());
  }

  const { name, minTeamSize, maxTeamSize, briefDescription, fullDescription } = req.body;

  if (typeof name !== "string" || 
      typeof minTeamSize !== "number" || 
      typeof maxTeamSize !== "number" || 
      typeof briefDescription !== "string" ||
      (fullDescription && typeof fullDescription !== "string")
    ) {
    return res.status(400).json(
      generateInvalidBodyError({
        name: DataType.STRING,
        minTeamSize: DataType.NUMBER,
        maxTeamSize: DataType.NUMBER,
      })
    );
  }

  if (!validateName(name)) {
    return res.status(400).json(NAME_ERROR);
  }

  try {
    const discipline = await prisma.discipline.create({
      data: { name, minTeamSize, maxTeamSize, briefDescription, fullDescription, event: { connect: { pid: req.params.eventPid } } },
      select: {
        pid: true,
        name: true,
        minTeamSize: true,
        maxTeamSize: true,
        event: { select: { pid: true, name: true } },
      },
    });

    return res.status(201).json({ type: "success", payload: { discipline } });
  } catch (e) {
    if (e instanceof PrismaClientKnownRequestError && e.code === "P2025") {
      return res.status(404).json(generateError(`Could not link to event with ID '${req.params.eventPid}'`));
    }
    throw e;
  }
};

interface DeleteDisciplineQueryParams {
  pid: string;
}

// requires: auth(ELEVATED)
export const deleteDiscipline = async (req: Request<DeleteDisciplineQueryParams>, res: Response) => {
  if (req.auth?.permission_level !== "ELEVATED") {
    res.status(403).json(createInsufficientPermissionsError());
  }

  const { pid } = req.params;

  try {
    await prisma.discipline.delete({ where: { pid } });

    return res.status(204).end();
  } catch (e) {
    if (e instanceof PrismaClientKnownRequestError && e.code === "P2025") {
      throw new NotFoundError("discipline", pid);
    }

    throw e;
  }
};
