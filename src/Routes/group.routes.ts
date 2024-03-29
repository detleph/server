import express from "express";
import {
  createGroup,
  deleteGroup,
  getAllGroups,
  getAllGroupsWithParam,
  getGroup,
  updateGroup,
} from "../Controllers/group.controllers";
import { requireAuthentication } from "../Middleware/auth/auth";
import organisationRouter from "./organisation.routes";

const router = express.Router();

router.get("/", getAllGroups);
router.get("/:pid", getGroup);
router.delete<"/:pid", { pid: string }>("/:pid", requireAuthentication, deleteGroup);
router.patch("/:pid", requireAuthentication, updateGroup);

organisationRouter.get("/:organisationPid/groups", getAllGroupsWithParam);
organisationRouter.post("/:organisationPid/groups", requireAuthentication, createGroup);

export default router;
