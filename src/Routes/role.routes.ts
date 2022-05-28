import Express from "express";
import { assignParticipantToRole } from "../Controllers/role.controller";

const router = Express.Router();

router.patch<"/:pid/", { pid: string }>("/:pid/", assignParticipantToRole)