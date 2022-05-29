import express from "express";
import eventRouter from "./event.routes";
import {
  addVisual,
  createDiscipline,
  deleteDiscipline,
  deleteVisual,
  getAllDisciplines,
  getDiscipline,
  updateDiscipline,
} from "../Controllers/discipline.controller";
import { requireAuthentication } from "../Middleware/auth/auth";

const router = express.Router();

router.get("/", getAllDisciplines); // TODO: Optional auth

router.get("/:pid", getDiscipline);

router.put("/:pid", requireAuthentication, updateDiscipline);
router.delete<"/:pid", { pid: string }>("/:pid", requireAuthentication, deleteDiscipline);

router.post<"/:disciplinePid/images", { disciplinePid: string }>(
  "/:disciplinePid/images",
  requireAuthentication,
  addVisual
);

router.delete<"/:disciplinePid/images/:pid", { disciplinePid: string; pid: string }>(
  "/:disciplinePid/images/:pid",
  requireAuthentication,
  deleteVisual
);

eventRouter.post("/:eventPid/disciplines", requireAuthentication, createDiscipline);

export default router;
