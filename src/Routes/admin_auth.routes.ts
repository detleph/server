import express from "express";
import { authenticateUser } from "../Controllers/admin_auth.controller";

const router = express.Router();

router.post("/", authenticateUser);

export default router;
