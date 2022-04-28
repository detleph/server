import express from "express";
import eventRouter from "./event.routes";
import {
  createOrganisation,
  deleteOrganisation,
  getAllOrganisations,
  getAllOrganisationsWithParam,
  getOrganisation,
  updateOrganisation,
} from "../Controllers/organisation.controller";
import { requireAuthentication } from "../Middleware/auth/auth";

const router = express.Router();

router.get("/", getAllOrganisations);
router.get("/:pid", getOrganisation);
router.put<"/:pid", { pid: string }>("/:pid", requireAuthentication, updateOrganisation);
router.delete<"/:pid", { pid: string }>("/:pid", requireAuthentication, deleteOrganisation);

eventRouter.get("/:eventPid/organisations", getAllOrganisationsWithParam);
eventRouter.post<"/:eventPid/organisations", { eventPid: string }>(
  "/:eventPid/organisations",
  requireAuthentication,
  createOrganisation
);

export default router;
