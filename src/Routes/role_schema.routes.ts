import express from "express";
import disciplineRouter from "./discipline.routes";
import {
  createRoleSchema,
  getAllRoleSchemas,
  getAllRoleSchemasWithParam,
  getRoleSchema,
} from "../Controllers/role_schema.controller";
import { requireAuthentication } from "../Middleware/auth/auth";

const router = express.Router();

router.get("/", getAllRoleSchemas);
router.get("/:pid", getRoleSchema);

disciplineRouter.get("/:disciplinePid/role-schemas", getAllRoleSchemasWithParam);
disciplineRouter.post("/:disciplinePid/role-schemas", requireAuthentication, createRoleSchema);

export default router;
