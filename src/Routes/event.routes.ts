import Express from "express";
import { addEvent, getAllEvents } from "../Controllers/event.controller";
const router = Express.Router();

router.get("/", getAllEvents);

router.post("/", addEvent);

export default router;
