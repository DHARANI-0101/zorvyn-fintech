import express from "express";
import auth from "../middleware/auth.js";
import authorize from "../middleware/authorize.js";
import { getDashboard } from "../controllers/dashboardController.js";

const router = express.Router();

router.get("/", auth, authorize(["ADMIN", "ANALYST", "VIEWER"]), getDashboard);

export default router;