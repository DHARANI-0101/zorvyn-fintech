import express from "express";
import auth from "../middleware/auth.js";
import authorize from "../middleware/authorize.js";

import {
  createTransaction,
  getTransactions,
  updateTransaction,
  patchTransaction,
  deleteTransaction
} from "../controllers/transactionController.js";

const router = express.Router();

router.post("/", auth, authorize(["ADMIN"]), createTransaction);

router.get("/", auth, authorize(["ADMIN", "ANALYST"]), getTransactions);

router.put("/:id", auth, authorize(["ADMIN"]), updateTransaction);

router.patch("/:id", auth, authorize(["ADMIN"]), patchTransaction);

router.delete("/:id", auth, authorize(["ADMIN"]), deleteTransaction);

export default router;