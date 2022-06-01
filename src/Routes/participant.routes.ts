import express from "express";
import teamRouter from "./team.routes";
import { createParticipant, deleteParticipant, updateParticipant } from "../Controllers/participant.controller";
import { requireAuthentication, requireConfiguredAuthentication } from "../Middleware/auth/auth";

const router = express.Router();

teamRouter.post<"/:teamPid/participant/", { teamPid: string }>(
  "/:teamPid/participant/",
  requireAuthentication,
  requireConfiguredAuthentication({ optional: true, type: { admin: true, teamleader: true } }),
  createParticipant
);

router.patch<"/:pid/", { pid: string }>(
  "/:pid/",
  requireAuthentication,
  requireConfiguredAuthentication({ optional: true, type: { admin: true, teamleader: true } }),
  updateParticipant
);

router.delete<"/:pid/", { pid: string }>(
  "/:pid/",
  requireAuthentication,
  requireConfiguredAuthentication({ optional: true, type: { admin: true, teamleader: true } }),
  deleteParticipant
);

export default router;
