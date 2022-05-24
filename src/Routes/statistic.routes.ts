import Express from "express";
import { requireAuthentication } from "../Middleware/auth/auth";
import { getAllVisits } from "../Controllers/statistic";

const router = Express.Router();


router.get("/", requireAuthentication, getAllVisits);

export default router;