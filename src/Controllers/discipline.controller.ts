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

const InitialDisciplineBody = z.object({
  name: z.string().min(1),
  minTeamSize: z.number(),
  maxTeamSize: z.number(),
  briefDescription: z.string(),
  fullDescription: z.string(),
});

const disciplineRefiner = [
  (args: any) => (args.minTeamSize && args.maxTeamSize ? args.minTeamSize <= args.maxTeamSize : true),
  { message: "The minTeamSize must be smaller or equal to the maxTeamSize" },
] as const;

const DisciplineBody = InitialDisciplineBody.partial({ briefDescription: true, fullDescription: true }).refine(
  ...disciplineRefiner
);
const updateDisciplineBody = InitialDisciplineBody.partial().refine(...disciplineRefiner);

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

  const result = DisciplineBody.safeParse(req.body);

  if (result.success === false) {
    return res.status(400).json(
      generateInvalidBodyError(
        {
          name: DataType.STRING,
          minTeamSize: DataType.NUMBER,
          maxTeamSize: DataType.NUMBER,
        },
        result.error
      )
    );
  }

  const { name, minTeamSize, maxTeamSize } = result.data;

  try {
    const discipline = await prisma.discipline.create({
      data: { name, minTeamSize, maxTeamSize, event: { connect: { pid: req.params.eventPid } } },
      select: basicDiscipline,
    });

    return res.status(201).json({ type: "success", payload: { discipline } });
  } catch (e) {
    if (e instanceof PrismaClientKnownRequestError && e.code === "P2025") {
      return res.status(404).json(generateError(`Could not link to event with ID '${req.params.eventPid}'`));
    }
    throw e;
  }
};

// requires: auth(ELEVATED)
export const updateDiscipline = async (req: Request<{ pid: string }>, res: Response) => {
  if (req.auth?.permission_level !== "ELEVATED") {
    res.status(403).json(createInsufficientPermissionsError());
  }

  const result = updateDisciplineBody.safeParse(req.body); // FIXME: Useres can currently use two requests to forgo min/max team size checking altogether

  if (result.success === false) {
    return res.status(400).json(
      generateInvalidBodyError(
        {
          name: DataType.STRING,
          minTeamSize: DataType.NUMBER,
          maxTeamSize: DataType.NUMBER,
          briefDescription: DataType.STRING,
          ["fullDescription?"]: DataType.STRING,
        },
        result.error
      )
    );
  }

  const body = result.data;
  const { pid } = req.params;

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
      select: basicDiscipline,
    });

    res.status(200).json({
      type: "success",
      payload: { discipline },
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2025") {
      throw new NotFoundError("discipline", pid);
    }

    throw e;
  }
};

// requires: auth(ELEVATED)
export const deleteDiscipline = async (req: Request<{ pid: string }>, res: Response) => {
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
