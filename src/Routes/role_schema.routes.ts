import express from "express";
import disciplineRouter from "./discipline.routes";
import {
  addVisual,
  createRoleSchema,
  deleteVisual,
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

router.post<"/:schemaPid/images", {schemaPid: string}>("/:schemaPid/images", requireAuthentication, addVisual);

router.delete<"/:schemaPid/images/:pid", {schemaPid: string, pid: string}>("/:schemaPid/images/:pid", requireAuthentication, deleteVisual);


export default router;
