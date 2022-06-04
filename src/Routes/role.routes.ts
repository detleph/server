import Express from "express";
import { assignParticipantToRole, getRole, getRolesForTeam } from "../Controllers/role.controller";
import { requireAuthentication, requireConfiguredAuthentication } from "../Middleware/auth/auth";
import { requireTeamleaderAuthentication } from "../Middleware/auth/teamleaderAuth";
import teamRouter from "./team.routes";

const router = Express.Router();

router.get(
  "/:rolePid",
  requireConfiguredAuthentication({ type: { admin: true, teamleader: true }, optional: false }),
  getRole
);

router.put<"/:pid/participant", { pid: string }>(
  "/:pid/participant",
  requireConfiguredAuthentication({ optional: false, type: { admin: true, teamleader: true } }),
  assignParticipantToRole
);

teamRouter.get<"/:pid/roles", { pid: string }>(
  "/:pid/roles",
  requireConfiguredAuthentication({ optional: false, type: { admin: true, teamleader: true } }),
  getRolesForTeam
);

export default router;
