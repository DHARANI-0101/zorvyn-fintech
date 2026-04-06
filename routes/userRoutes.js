import express from "express";
import auth from "../middleware/auth.js";
import authorize from "../middleware/authorize.js";
import { getUserById } from "../controllers/userController.js";

import {
  createUser,
  getUsers,
  updateUser,
  updateUserStatus
} from "../controllers/userController.js";

const router = express.Router();

router.post("/", auth, authorize(["ADMIN"]), createUser);

router.get("/", auth, authorize(["ADMIN", "ANALYST"]), getUsers);

router.put("/:id", auth, authorize(["ADMIN"]), updateUser);

router.get("/:id", auth, authorize(["ADMIN"]), getUserById);

router.patch("/:id/status", auth, authorize(["ADMIN"]), updateUserStatus);

export default router;