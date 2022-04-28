import express from "express";
import { getAllDisciplines, getDiscipline } from "../Controllers/discipline.controller";

const router = express.Router();

router.get("/", getAllDisciplines); // TODO: Optional auth
router.get("/:pid", getDiscipline);

export default router;
