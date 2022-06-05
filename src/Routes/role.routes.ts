import Express from "express";
import { assignParticipantToRole, getRolesForTeam } from "../Controllers/role.controller";
import { requireConfiguredAuthentication } from "../Middleware/auth/auth";

const router = Express.Router();

router.put<"/:pid/participant", { pid: string }>(
  "/:pid/participant",
  requireConfiguredAuthentication({ optional: false, type: { admin: true, teamleader: true } }),
  assignParticipantToRole
);

export default router;