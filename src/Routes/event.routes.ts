import Express from "express";
import { addEvent, getAllEvents, getEvent } from "../Controllers/event.controller";
import { requireAuthentication } from "../Middleware/auth/auth";
const router = Express.Router();

router.get("/", getAllEvents);

router.get("/:eventId", getEvent);

router.post("/", requireAuthentication, addEvent);

export default router;
