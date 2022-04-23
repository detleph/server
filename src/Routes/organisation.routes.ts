import express from "express";
import eventRouter from "./event.routes";
import {
  createOrganisation,
  getAllOrganisations,
  getAllOrganisationsWithParam,
  getOrganisation,
} from "../Controllers/organisation.controller";
import { requireAuthentication } from "../Middleware/auth/auth";

const router = express.Router();

router.get("/", getAllOrganisations);
router.get("/:pid", getOrganisation);

eventRouter.get("/:eventPid/organisations", getAllOrganisationsWithParam);
eventRouter.post<"/:eventPid/organisations", { eventPid: string }>(
  "/:eventPid/organisations",
  requireAuthentication,
  createOrganisation
);

export default router;
