import express from "express";
import { getAllAdmins, createAdmin } from "../Controllers/admin.controller";
import { requireAuthentication } from "../Middleware/auth/auth";

const router = express.Router();

router.get("/", requireAuthentication, getAllAdmins);

router.post("/", requireAuthentication, createAdmin);

export default router;
