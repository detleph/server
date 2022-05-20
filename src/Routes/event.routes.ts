import Express from "express";
import { string } from "zod";
import {
  addEvent,
  addVisual,
  deleteEvent,
  deleteVisual,
  getAllEvents,
  getEvent,
  updateEvent,
} from "../Controllers/event.controller";
import { requireAuthentication } from "../Middleware/auth/auth";
const router = Express.Router();

router.get("/", getAllEvents);

router.get("/:eventId", getEvent);

router.post("/", requireAuthentication, addEvent);

router.patch<"/:pid/", { pid: string }>("/:pid/", requireAuthentication, updateEvent);

router.delete<"/:pid/", { pid: string }>("/:pid/", requireAuthentication, deleteEvent);

router.post<"/:eventPid/media", { eventPid: string }>("/:eventPid/media", requireAuthentication, addVisual);

router.delete<"/:eventPid/media/:pid", { eventPid: string; pid: string }>(
  "/:eventPid/media/:pid",
  requireAuthentication,
  deleteVisual
);

export default router;
