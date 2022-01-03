import express from "express";

const router = express.Router();

// Media storage with express static (Should only handle GET and HEAD request methods)
router.use("/", express.static("media", { redirect: false }));

export default router;
