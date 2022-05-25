import Express from "express";
import { requireAuthentication } from "../Middleware/auth/auth";
import { getAllVisits, visitLogger } from "../Controllers/statistic";

const router = Express.Router();


router.get("/", requireAuthentication, getAllVisits);

router.post("/", requireAuthentication, visitLogger);

export default router;