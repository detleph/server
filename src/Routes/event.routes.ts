import Express from "express";
import { string } from "zod";
import { addEvent, addVisual, deleteVisual, getAllEvents, getEvent } from "../Controllers/event.controller";
import { requireAuthentication } from "../Middleware/auth/auth";
const router = Express.Router();

router.get("/", getAllEvents);

router.get("/:eventId", getEvent);

router.post("/", requireAuthentication, addEvent);

router.post<"/:eventPid/images", {eventPid: string}>("/:eventPid/images", requireAuthentication, addVisual);

router.delete<"/:eventPid/images/:pid", {eventPid: string, pid: string}>("/:eventPid/images/:pid", requireAuthentication, deleteVisual);

export default router;
