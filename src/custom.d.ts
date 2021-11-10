import { AuthJWTPayload } from "./Controllers/admin_auth.controller";

declare module "express-serve-static-core" {
  interface Request {
    auth?: AuthJWTPayload & { isAuthenticated: boolean };
  }
}
