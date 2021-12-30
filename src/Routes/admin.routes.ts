import express from "express";
import { getAllAdmins, createAdmin, updatePassword } from "../Controllers/admin.controller";
import { requireAuthentication } from "../Middleware/auth/auth";

const router = express.Router();

router.get("/", requireAuthentication, getAllAdmins);

router.post("/", requireAuthentication, createAdmin);

// TODO: Use URL parameters to specify the user to update
router.put("/password", requireAuthentication, updatePassword);

export default router;
