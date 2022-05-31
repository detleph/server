import express from "express";
import eventRouter from "./event.routes";
import {
  createDiscipline,
  deleteDiscipline,
  getAllDisciplines,
  getDiscipline,
  updateDiscipline,
} from "../Controllers/discipline.controller";
import { requireAuthentication } from "../Middleware/auth/auth";

const router = express.Router();

router.get("/", getAllDisciplines); // TODO: Optional auth

router.get("/:pid", getDiscipline);

router.patch("/:pid", requireAuthentication, updateDiscipline);
router.delete<"/:pid", { pid: string }>("/:pid", requireAuthentication, deleteDiscipline);

eventRouter.post("/:eventPid/disciplines", requireAuthentication, createDiscipline);

export default router;
