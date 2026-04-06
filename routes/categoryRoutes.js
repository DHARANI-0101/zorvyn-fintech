import express from "express";
import auth from "../middleware/auth.js";
import authorize from "../middleware/authorize.js";

import {
  createCategory,
  getCategories,
  updateCategory,
  deleteCategory
} from "../controllers/categoryController.js";

const router = express.Router();

router.post("/", auth, authorize(["ADMIN"]), createCategory);

router.get("/", auth, authorize(["ADMIN", "ANALYST"]), getCategories);

router.put("/:id", auth, authorize(["ADMIN"]), updateCategory);

router.delete("/:id", auth, authorize(["ADMIN"]), deleteCategory);

export default router;