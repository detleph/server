import Express from "express";
import { assignParticipantToRole, getRolesForTeam } from "../Controllers/role.controller";
import { requireConfiguredAuthentication } from "../Middleware/auth/auth";
import teamRouter from "./team.routes";

const router = Express.Router();

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