import express from "express";
import { createParticipant, deleteParticipant, updateParticipant } from "../Controllers/participant.controller";
import { requireConfiguredAuthentication } from "../Middleware/auth/auth";

const router = express.Router();

router.post(
  "/",
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
