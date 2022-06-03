import express from "express";
import fileUpload from "express-fileupload";
import { requireAuthentication } from "../Middleware/auth/auth";
import { deleteMedia, getAllMedia, getMediaMeta, linkMedia, unlinkMedia, uploadImage } from "../Controllers/media.controller";
import eventRouter from "./event.routes";
import disciplineRouter from "./discipline.routes";
import roleSchemaRouter from "./role_schema.routes";

const router = express.Router();

// Media storage with express static (Should only handle GET and HEAD request methods)
router.use("/", express.static("/app/media", { redirect: false }));

router.post("/", requireAuthentication, fileUpload(), uploadImage);

router.get("/", requireAuthentication, getAllMedia); // Reading all files should be a senstive operation

router.get("/:pid/meta", getMediaMeta);

router.delete("/:pid", requireAuthentication, deleteMedia);

eventRouter.post<"/:pid/media", { pid: string }>(
    "/:pid/media", requireAuthentication, linkMedia
);

eventRouter.delete<"/:pid/media/:mediaPid", { pid: string, mediaPid: string }>(
  "/:pid/media/:mediaPid", requireAuthentication, unlinkMedia
);

disciplineRouter.post<"/:pid/media", { pid: string }>(
    "/:pid/media", requireAuthentication, linkMedia
);

disciplineRouter.delete<"/:pid/media/:mediaPid", { pid: string, mediaPid: string }>(
  "/:pid/media/:mediaPid", requireAuthentication, unlinkMedia
);

roleSchemaRouter.post<"/:pid/media", { pid: string }>(
    "/:pid/media", requireAuthentication, linkMedia
);

roleSchemaRouter.delete<"/:pid/media/:mediaPid", { pid: string, mediaPid: string }>(
  "/:pid/media/:mediaPid", requireAuthentication, unlinkMedia
);

export default router;
