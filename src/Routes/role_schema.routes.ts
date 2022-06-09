import express from "express";
import disciplineRouter from "./discipline.routes";
import {
  createRoleSchema,
  deleteRoleSchema,
  getAllRoleSchemas,
  getAllRoleSchemasWithParam,
  getRoleSchema,
  updateRoleSchema,
} from "../Controllers/role_schema.controller";
import { requireAuthentication, requireConfiguredAuthentication } from "../Middleware/auth/auth";

const router = express.Router();

router.get("/", getAllRoleSchemas);

router.get("/:pid", getRoleSchema);

router.patch("/:pid", requireConfiguredAuthentication({ optional: false, type: "admin" }), updateRoleSchema);

router.delete("/:pid", requireConfiguredAuthentication({ optional: false, type: "admin" }), deleteRoleSchema)

disciplineRouter.get("/:disciplinePid/role-schemas", getAllRoleSchemasWithParam);

disciplineRouter.post("/:disciplinePid/role-schemas", requireAuthentication, createRoleSchema);

export default router;
