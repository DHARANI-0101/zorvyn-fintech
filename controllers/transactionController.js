import db from "../config/db.js";
import { validateTransaction } from "../utils/validate.js";


export const getTransactions = async (req, res) => {
  const role = req.user.role?.toUpperCase();
  const user_id = req.user.id;
  const { type, category_id, startDate, endDate } = req.query;

  try {
    if (type && !["income", "expense"].includes(type)) {
      return res.status(400).json({
        message: "Invalid transaction type"
      });
    }

    let query = `
      SELECT 
        t.id,
        t.amount,
        t.type,
        t.note,
        t.transaction_date,
        c.name AS category
      FROM transactions t
      JOIN categories c ON t.category_id = c.id
      WHERE t.is_deleted=false
      AND c.is_deleted=false
    `;

    let values = [];

    // 🔥 ROLE FIX
    if (role !== "ADMIN" && role !== "ANALYST") {
      query += ` AND t.user_id=$1`;
      values.push(user_id);
    }

    if (type) {
      values.push(type);
      query += ` AND t.type=$${values.length}`;
    }

    if (category_id) {
      values.push(category_id);
      query += ` AND t.category_id=$${values.length}`;
    }

    if (startDate && endDate) {
      values.push(startDate, endDate);
      query += ` AND t.transaction_date BETWEEN $${values.length - 1} AND $${values.length}`;
    }

    query += ` ORDER BY t.transaction_date DESC`;

    const result = await db.query(query, values);

    res.status(200).json({
      count: result.rows.length,
      data: result.rows
    });

  } catch (err) {
    res.status(500).json({
      message: "Failed to fetch transactions",
      error: err.message
    });
  }
};

export const createTransaction = async (req, res) => {
  const error = validateTransaction(req.body);
  if (error) return res.status(400).json({ message: error });

  const { amount, type, category_id, note, transaction_date } = req.body;
  const user_id = req.user.id;

  try {
    await db.query("BEGIN");

    const balanceResult = await db.query(
      `SELECT current_balance 
       FROM balances 
       WHERE user_id=$1 
       FOR UPDATE`,
      [user_id]
    );

    if (!balanceResult.rows.length) {
      await db.query("ROLLBACK");
      return res.status(404).json({ message: "Balance not found" });
    }

    let currentBalance = Number(balanceResult.rows[0].current_balance);

    const categoryCheck = await db.query(
      `SELECT id FROM categories 
       WHERE id=$1 AND is_deleted=false`,
      [category_id]
    );

    if (!categoryCheck.rows.length) {
      await db.query("ROLLBACK");
      return res.status(400).json({ message: "Invalid category" });
    }

    if (type === "expense" && amount > currentBalance) {
      await db.query("ROLLBACK");
      return res.status(400).json({
        message: "Insufficient balance"
      });
    }

    const tx = await db.query(
      `INSERT INTO transactions 
       (user_id, amount, type, category_id, note, transaction_date)
       VALUES ($1,$2,$3,$4,$5,$6)
       RETURNING *`,
      [user_id, amount, type, category_id, note, transaction_date]
    );

    currentBalance =
      type === "income"
        ? currentBalance + Number(amount)
        : currentBalance - Number(amount);

    await db.query(
      `UPDATE balances SET current_balance=$1 WHERE user_id=$2`,
      [currentBalance, user_id]
    );

    await db.query("COMMIT");

    res.status(201).json({
      message: "Transaction created",
      data: tx.rows[0],
      balance: currentBalance
    });

  } catch (err) {
    await db.query("ROLLBACK");
    res.status(500).json({
      message: "Failed to create transaction",
      error: err.message
    });
  }
};


export const updateTransaction = async (req, res) => {
  const { id } = req.params;
  const user_id = req.user.id;

  const error = validateTransaction(req.body);
  if (error) return res.status(400).json({ message: error });

  const { amount, type, category_id, note, transaction_date } = req.body;

  try {
    await db.query("BEGIN");

    const balanceResult = await db.query(
      `SELECT current_balance FROM balances WHERE user_id=$1 FOR UPDATE`,
      [user_id]
    );

    if (!balanceResult.rows.length) {
      await db.query("ROLLBACK");
      return res.status(404).json({ message: "Balance not found" });
    }

    let currentBalance = Number(balanceResult.rows[0].current_balance);

    
    const oldTxResult = await db.query(
      `SELECT amount, type FROM transactions 
       WHERE id=$1 AND user_id=$2 AND is_deleted=false`,
      [id, user_id]
    );

    if (!oldTxResult.rows.length) {
      await db.query("ROLLBACK");
      return res.status(404).json({ message: "Transaction not found" });
    }

    const oldTx = oldTxResult.rows[0];

    const categoryCheck = await db.query(
      `SELECT id FROM categories 
       WHERE id=$1 AND is_deleted=false`,
      [category_id]
    );

    if (!categoryCheck.rows.length) {
      await db.query("ROLLBACK");
      return res.status(400).json({ message: "Invalid category" });
    }

    currentBalance =
      oldTx.type === "income"
        ? currentBalance - Number(oldTx.amount)
        : currentBalance + Number(oldTx.amount);

    currentBalance =
      type === "income"
        ? currentBalance + Number(amount)
        : currentBalance - Number(amount);

    if (currentBalance < 0) {
      await db.query("ROLLBACK");
      return res.status(400).json({
        message: "Insufficient balance"
      });
    }

    const updated = await db.query(
      `UPDATE transactions
       SET amount=$1, type=$2, category_id=$3, note=$4, transaction_date=$5
       WHERE id=$6 AND user_id=$7
       RETURNING *`,
      [amount, type, category_id, note, transaction_date, id, user_id]
    );

    await db.query(
      `UPDATE balances SET current_balance=$1 WHERE user_id=$2`,
      [currentBalance, user_id]
    );

    await db.query("COMMIT");

    res.json({
      message: "Transaction updated",
      data: updated.rows[0],
      balance: currentBalance
    });

  } catch (err) {
    await db.query("ROLLBACK");
    res.status(500).json({
      message: "Failed to update transaction",
      error: err.message
    });
  }
};


export const deleteTransaction = async (req, res) => {
  const { id } = req.params;
  const user_id = req.user.id;

  try {
    await db.query("BEGIN");

    const balanceResult = await db.query(
      `SELECT current_balance FROM balances WHERE user_id=$1 FOR UPDATE`,
      [user_id]
    );

    if (!balanceResult.rows.length) {
      await db.query("ROLLBACK");
      return res.status(404).json({ message: "Balance not found" });
    }

    let currentBalance = Number(balanceResult.rows[0].current_balance);

    const oldTxResult = await db.query(
      `SELECT amount, type FROM transactions 
       WHERE id=$1 AND user_id=$2 AND is_deleted=false`,
      [id, user_id]
    );

    if (!oldTxResult.rows.length) {
      await db.query("ROLLBACK");
      return res.status(404).json({ message: "Transaction not found" });
    }

    const oldTx = oldTxResult.rows[0];

    currentBalance =
      oldTx.type === "income"
        ? currentBalance - Number(oldTx.amount)
        : currentBalance + Number(oldTx.amount);

    await db.query(
      `UPDATE transactions SET is_deleted=true WHERE id=$1 AND user_id=$2`,
      [id, user_id]
    );

    await db.query(
      `UPDATE balances SET current_balance=$1 WHERE user_id=$2`,
      [currentBalance, user_id]
    );

    await db.query("COMMIT");

    res.json({
      message: "Transaction deleted",
      balance: currentBalance
    });

  } catch (err) {
    await db.query("ROLLBACK");
    res.status(500).json({
      message: "Failed to delete transaction",
      error: err.message
    });
  }
};

export const patchTransaction = async (req, res) => {
  const { id } = req.params;
  const user_id = req.user.id;

  try {
    await db.query("BEGIN");

    if (Object.keys(req.body).length === 0) {
      await db.query("ROLLBACK");
      return res.status(400).json({ message: "No fields provided" });
    }

    if (req.body.type && !["income", "expense"].includes(req.body.type)) {
      await db.query("ROLLBACK");
      return res.status(400).json({ message: "Invalid type" });
    }

    if (req.body.amount !== undefined) {
      if (typeof req.body.amount !== "number" || isNaN(req.body.amount)) {
        await db.query("ROLLBACK");
        return res.status(400).json({ message: "Amount must be a valid number" });
      }
      if (req.body.amount <= 0) {
        await db.query("ROLLBACK");
        return res.status(400).json({ message: "Amount must be greater than 0" });
      }
    }

    if (req.body.category_id !== undefined) {
      if (!Number.isInteger(req.body.category_id) || req.body.category_id <= 0) {
        await db.query("ROLLBACK");
        return res.status(400).json({ message: "category_id must be a positive integer" });
      }
    }

    if (req.body.transaction_date !== undefined) {
      const date = new Date(req.body.transaction_date);
      if (isNaN(date.getTime())) {
        await db.query("ROLLBACK");
        return res.status(400).json({ message: "Invalid transaction_date" });
      }
    }

  
    const balanceResult = await db.query(
      `SELECT current_balance FROM balances WHERE user_id=$1 FOR UPDATE`,
      [user_id]
    );

    if (!balanceResult.rows.length) {
      await db.query("ROLLBACK");
      return res.status(404).json({ message: "Balance not found" });
    }

    let currentBalance = Number(balanceResult.rows[0].current_balance);


    const oldTxResult = await db.query(
      `SELECT * FROM transactions WHERE id=$1 AND user_id=$2 AND is_deleted=false`,
      [id, user_id]
    );

    if (!oldTxResult.rows.length) {
      await db.query("ROLLBACK");
      return res.status(404).json({ message: "Transaction not found" });
    }

    const oldTx = oldTxResult.rows[0];

    const newTx = {
      amount: req.body.amount ?? Number(oldTx.amount),
      type: req.body.type ?? oldTx.type,
      category_id: req.body.category_id ?? oldTx.category_id,
      note: req.body.note ?? oldTx.note,
      transaction_date: req.body.transaction_date ?? oldTx.transaction_date
    };

    const categoryCheck = await db.query(
      `SELECT id FROM categories WHERE id=$1 AND is_deleted=false`,
      [newTx.category_id]
    );

    if (!categoryCheck.rows.length) {
      await db.query("ROLLBACK");
      return res.status(400).json({ message: "Invalid category" });
    }

    currentBalance =
      oldTx.type === "income"
        ? currentBalance - Number(oldTx.amount)
        : currentBalance + Number(oldTx.amount);

    currentBalance =
      newTx.type === "income"
        ? currentBalance + Number(newTx.amount)
        : currentBalance - Number(newTx.amount);

    if (currentBalance < 0) {
      await db.query("ROLLBACK");
      return res.status(400).json({ message: "Insufficient balance" });
    }

    const updated = await db.query(
      `UPDATE transactions
       SET amount=$1, type=$2, category_id=$3, note=$4, transaction_date=$5
       WHERE id=$6 AND user_id=$7
       RETURNING *`,
      [
        newTx.amount,
        newTx.type,
        newTx.category_id,
        newTx.note,
        newTx.transaction_date,
        id,
        user_id
      ]
    );

    await db.query(`UPDATE balances SET current_balance=$1 WHERE user_id=$2`, [
      currentBalance,
      user_id
    ]);

    await db.query("COMMIT");

    res.json({
      message: "Transaction patched",
      data: updated.rows[0],
      balance: currentBalance
    });

  } catch (err) {
    await db.query("ROLLBACK");
    res.status(500).json({ message: "Failed to patch transaction", error: err.message });
  }
};