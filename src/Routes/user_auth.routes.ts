import express from "express";
import { register, requestToken, requestTokenEmail, verifyEmail } from "../Controllers/user_auth.controller";

const router = express.Router();

router.post("/", register);
router.get("/verify/:code", verifyEmail);
router.get("/token", requestToken);
router.post("/email-token", requestTokenEmail);

export default router;
