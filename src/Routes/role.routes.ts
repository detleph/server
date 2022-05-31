import Express from "express";
import { assignParticipantToRole, getRolesForTeam } from "../Controllers/role.controller";

const router = Express.Router();

//TO DO: maybe transfer getRolesForTeam to team router -> Seconded
router.get<"team/:teamPid/", { teamPid: string }>("team/:teamPid/", getRolesForTeam);

router.put<"/:pid/participant", { pid: string }>("/:pid/participant", assignParticipantToRole);
