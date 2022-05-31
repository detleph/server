import express from "express";
import { requireAuthentication, requireConfiguredAuthentication } from "../Middleware/auth/auth";
import { requireTeamleaderAuthentication } from "../Middleware/auth/teamleaderAuth";
import { deleteTeam, getTeam, getTeams, updateTeam } from "../Controllers/team.controller";

const router = express.Router();

router.get("/", requireConfiguredAuthentication({ type: "admin", optional: false }), getTeams);
router.get("/:id", getTeam);

router.put("/", requireTeamleaderAuthentication, updateTeam);
router.delete<"/:pid/", { pid: string }>("/:pid/", requireAuthentication, requireTeamleaderAuthentication, deleteTeam);

export default router;
