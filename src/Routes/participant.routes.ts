import express from "express";
import teamRouter from "./team.routes";
import roleRouter from "./role.routes";
import {
  createParticipant,
  deleteParticipant,
  getAllParticipants,
  getAllParticipantsParams,
  getParticipantForRole,
  updateParticipant,
} from "../Controllers/participant.controller";
import { requireAuthentication, requireConfiguredAuthentication } from "../Middleware/auth/auth";

require("express-async-errors");

const router = express.Router();

router.get(
  "/",
  requireConfiguredAuthentication({ optional: false, type: { admin: true, teamleader: true } }),
  getAllParticipants
);

teamRouter.get(
  "/:teamPid/particpants",
  requireConfiguredAuthentication({ type: { admin: true, teamleader: true }, optional: false }),
  getAllParticipantsParams
);

roleRouter.get(
  "/:rolePid/participant",
  requireConfiguredAuthentication({ type: { admin: true, teamleader: true }, optional: false }),
  getParticipantForRole
);

teamRouter.post<"/:teamPid/participants/", { teamPid: string }>(
  "/:teamPid/participants/",
  requireConfiguredAuthentication({ optional: false, type: { admin: true, teamleader: true } }),
  createParticipant
);

router.patch<"/:pid/", { pid: string }>(
  "/:pid/",
  requireConfiguredAuthentication({ optional: false, type: { admin: true, teamleader: true } }),
  updateParticipant
);

router.delete<"/:pid/", { pid: string }>(
  "/:pid/",
  requireConfiguredAuthentication({ optional: false, type: { admin: true, teamleader: true } }),
  deleteParticipant
);

export default router;
