import express from "express";
import { getAllGroups, getAllGroupsWithParam, getGroup } from "../Controllers/group.controllers";
import organisationRouter from "./organisation.routes";

const router = express.Router();

router.get("/", getAllGroups);
router.get("/:pid", getGroup);

organisationRouter.get("/:organisationPid/groups", getAllGroupsWithParam);

export default router;
