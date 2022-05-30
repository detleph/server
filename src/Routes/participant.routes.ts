import express from "express";
import teamRouter from "./team.routes";
import { createParticipant, deleteParticipant, updateParticipant } from "../Controllers/participant.controller";
import { requireAuthentication } from "../Middleware/auth/auth";
import { requireTeamleaderAuthentication } from "../Middleware/auth/teamleaderAuth";

const router = express.Router();

teamRouter.post<"/:pid/participant/", { pid: string }>(
  "/:pid/participant/",
  requireAuthentication,
  requireTeamleaderAuthentication,
  createParticipant
);

teamRouter.patch<"/:pid/participant/", { pid: string }>(
  "/:pid/participant/",
  requireAuthentication,
  requireTeamleaderAuthentication,
  updateParticipant
);

teamRouter.delete<"/:pid/participant/", { pid: string }>(
  "/:pid/participant/",
  requireAuthentication,
  requireTeamleaderAuthentication,
  deleteParticipant
);

export default router;
