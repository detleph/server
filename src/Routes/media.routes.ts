import express from "express";
import fileUpload from "express-fileupload";
import { requireAuthentication } from "../Middleware/auth/auth";
import { uploadImage } from "../Controllers/media.controller";

const router = express.Router();

router.post("/", requireAuthentication, fileUpload(), uploadImage);

// Media storage with express static (Should only handle GET and HEAD request methods)
router.use("/", express.static("media", { redirect: false }));

export default router;
