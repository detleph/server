import { Prisma, Organisation, Admin, AdminLevel, Team } from "@prisma/client";
import { Request, Response } from "express";
import prisma from "../lib/prisma";
import ForwardableError from "../Middleware/error/ForwardableError";

const basicDiscipline = {
  pid: true,
  name: true,
  visual: { select: { pid: true, location: true } },
  maxTeamSize: true,
  minTeamSize: true,
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
    throw new ForwardableError(404, `The discipline with ID ${pid} could not be found`);
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
