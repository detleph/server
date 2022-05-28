import express from "express";
import { register, requestToken, verifyEmail } from "../Controllers/user_auth.controller";

const router = express.Router();

router.post("/", register);
router.get("/verify/:code", verifyEmail);
router.get("/token", requestToken);

export default router;
