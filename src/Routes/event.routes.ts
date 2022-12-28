import Express from "express";
import { string } from "zod";
import { addEvent, deleteEvent, getAllEvents, getEvent, updateEvent } from "../Controllers/event.controller";
import { requireAuthentication, requireConfiguredAuthentication } from "../Middleware/auth/auth";
import { deleteUnverifiedTeams } from "../Controllers/team.controller";
const router = Express.Router();

router.get("/", getAllEvents);

router.get("/:eventId", getEvent);

router.post("/", requireAuthentication, addEvent);

router.patch<"/:pid/", { pid: string }>("/:pid/", requireAuthentication, updateEvent);

router.delete<"/:pid/", { pid: string }>("/:pid/", requireAuthentication, deleteEvent);

router.delete<"/:pid/deleteUnverified/", { pid: string }>(
  "/:pid/deleteUnverified/",
  requireConfiguredAuthentication({ optional: false, type: "admin" }),
  deleteUnverifiedTeams
);

export default router;
