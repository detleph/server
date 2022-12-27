import express from "express";
import { requireConfiguredAuthentication } from "../Middleware/auth/auth";
import { deleteTeam, deleteUnverifiedTeams, getTeam, getTeams, updateTeam } from "../Controllers/team.controller";
import { getRolesForTeam } from "../Controllers/role.controller";

const router = express.Router();

router.get("/", requireConfiguredAuthentication({ type: "admin", optional: false }), getTeams);
router.get<"/:pid/", { pid: string }>(
  "/:pid/",
  requireConfiguredAuthentication({ optional: false, type: { admin: true, teamleader: true } }),
  getTeam
);

router.put<"/:pid/", { pid: string }>(
  "/:pid/",
  requireConfiguredAuthentication({ optional: false, type: { admin: true, teamleader: true } }),
  updateTeam
);
router.delete<"/:pid/", { pid: string }>(
  "/:pid/",
  requireConfiguredAuthentication({ optional: false, type: { admin: true, teamleader: true } }),
  deleteTeam
);
router.delete<"/:pid/deleteUnverified/", {pid: string}>(
  "/:pid/deleteUnverified/",
  requireConfiguredAuthentication({optional: false, type: "admin"}),
  deleteUnverifiedTeams
);

export default router;
