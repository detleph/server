import express from "express";
import { getAllAdmins, createAdmin, updateOwnPassword, updateForeignPassword } from "../Controllers/admin.controller";
import { requireAuthentication } from "../Middleware/auth/auth";

const router = express.Router();

router.get("/", requireAuthentication, getAllAdmins);

router.post("/", requireAuthentication, createAdmin);

router.put("/current/password", requireAuthentication, updateOwnPassword);
router.put<"/:pid/password", { pid: string }>("/:pid/password", requireAuthentication, updateForeignPassword);

export default router;
