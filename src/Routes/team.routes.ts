import express from "express";
import { requireAuthentication } from "../Middleware/auth/auth";
import { requireTeamleaderAuthentication } from "../Middleware/auth/teamleaderAuth";
import { register } from "../Controllers/user_auth.controller";

const router = express.Router();

router.post("/", requireAuthentication, requireTeamleaderAuthentication, register);

router.delete<"/:pid/", { pid: string }>("/:pid/", requireAuthentication, requireTeamleaderAuthentication, deleteTeam);

export default router;
