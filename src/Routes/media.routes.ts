import express from "express";
import fileUpload from "express-fileupload";
import { requireAuthentication } from "../Middleware/auth/auth";
import { deleteMedia, getAllMedia, uploadImage } from "../Controllers/media.controller";

const router = express.Router();

// Media storage with express static (Should only handle GET and HEAD request methods)
router.use("/", express.static("/app/media", { redirect: false }));

router.post("/", requireAuthentication, fileUpload(), uploadImage);

router.get("/", requireAuthentication, getAllMedia); // Reading all files should be a senstive operation

router.delete("/:pid", requireAuthentication, deleteMedia);

export default router;
