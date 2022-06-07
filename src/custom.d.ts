import { AuthJWTPayload } from "./Controllers/admin_auth.controller";
import { TeamleaderJWTPayload } from "./Middleware/auth/teamleaderAuth";

declare module "express-serve-static-core" {
  interface Request {
    auth?: AuthJWTPayload & { isAuthenticated: boolean };
    teamleader?: TeamleaderJWTPayload & { isAuthenticated: boolean };
  }
}
