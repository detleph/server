import Express from "express";
import { assignParticipantToRole, getRolesForTeam } from "../Controllers/role.controller";

const router = Express.Router();

//TO DO: maybe transfer getRolesForTeam to team router
router.get<"team/:teamPid/", { teamPid: string }>("team/:teamPid/", getRolesForTeam);

router.patch<"/:pid/", { pid: string }>("/:pid/", assignParticipantToRole)