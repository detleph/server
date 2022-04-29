import express from "express";
import eventRouter from "./event.routes";
import { createDiscipline, getAllDisciplines, getDiscipline } from "../Controllers/discipline.controller";
import { requireAuthentication } from "../Middleware/auth/auth";

const router = express.Router();

router.get("/", getAllDisciplines); // TODO: Optional auth
router.get("/:pid", getDiscipline);

eventRouter.post("/:eventPid/disciplines", requireAuthentication, createDiscipline);

export default router;
