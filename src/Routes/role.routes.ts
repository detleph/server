import Express from "express";
import { assignParticipantToRole, getRolesForTeam } from "../Controllers/role.controller";
import { requireAuthentication, requireConfiguredAuthentication } from "../Middleware/auth/auth";

const router = Express.Router();

//TO DO: maybe transfer getRolesForTeam to team router -> Seconded
router.get<"team/:teamPid/", { teamPid: string }>(
  "team/:teamPid/",
  requireAuthentication,
  requireConfiguredAuthentication({ optional: true, type: { admin: true, teamleader: true } }),
  getRolesForTeam
);

router.put<"/:pid/participant", { pid: string }>(
  "/:pid/participant",
  requireAuthentication,
  requireConfiguredAuthentication({ optional: true, type: { admin: true, teamleader: true } }),
  assignParticipantToRole
);

export default router;
