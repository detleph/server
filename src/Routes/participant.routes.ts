import express from "express";
import teamRouter from "./team.routes";
import {
  createParticipant,
  deleteParticipant,
  getAllParticipants,
  getAllParticipantsParams,
  updateParticipant,
} from "../Controllers/participant.controller";
import { requireAuthentication, requireConfiguredAuthentication } from "../Middleware/auth/auth";

require("express-async-errors");

const router = express.Router();

router.get(
  "/",
  requireConfiguredAuthentication({ type: { admin: true, teamleader: true }, optional: false }),
  getAllParticipants
);

teamRouter.get(
  "/:pid/particpants",
  requireConfiguredAuthentication({ type: { admin: true, teamleader: true }, optional: false }),
  getAllParticipantsParams
);

teamRouter.post<"/:teamPid/participants/", { teamPid: string }>(
  "/:teamPid/participants/",
  requireConfiguredAuthentication({ optional: true, type: { admin: true, teamleader: true } }),
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
