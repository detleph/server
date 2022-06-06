import express from "express";
import { createParticipant, deleteParticipant, updateParticipant } from "../Controllers/participant.controller";
import { requireConfiguredAuthentication } from "../Middleware/auth/auth";
import teamRouter from "./team.routes";

const router = express.Router();

teamRouter.post<"/:teamPid/participants", { teamPid: string }>(
  "/:teamPid/participants",
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
