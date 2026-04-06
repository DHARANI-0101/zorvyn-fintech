import db from "../config/db.js";
import bcrypt from "bcrypt";

export const createUser = async (req, res) => {
  try {
    let { name, email, password, role_id } = req.body;

    if (!name || !email || !password || !role_id) {
      return res.status(400).json({ message: "All fields are required" });
    }

    name = name.trim();
    email = email.trim().toLowerCase();

    if (!name) {
      return res.status(400).json({ message: "Name cannot be empty" });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: "Invalid email format" });
    }

    if (password.length < 6) {
      return res.status(400).json({
        message: "Password must be at least 6 characters"
      });
    }

    const roleCheck = await db.query(
      `SELECT id FROM roles WHERE id=$1`,
      [role_id]
    );

    if (!roleCheck.rows.length) {
      return res.status(400).json({ message: "Invalid role" });
    }

    await db.query("BEGIN");

    const existingUser = await db.query(
      `SELECT id FROM users WHERE email=$1`,
      [email]
    );

    if (existingUser.rows.length) {
      await db.query("ROLLBACK");
      return res.status(400).json({
        message: "Email already exists"
      });
    }

    const hash = await bcrypt.hash(password, 10);

    
    const result = await db.query(
      `INSERT INTO users (name,email,password,role_id,status)
       VALUES ($1,$2,$3,$4,'active')
       RETURNING id, name, email, role_id, status, created_at`,
      [name, email, hash, role_id]
    );

    const userId = result.rows[0].id;

    await db.query(
      `INSERT INTO balances (user_id, current_balance)
       VALUES ($1, 0)
       ON CONFLICT (user_id) DO NOTHING`,
      [userId]
    );

    await db.query("COMMIT");

    res.status(201).json({
      message: "User created successfully",
      data: result.rows[0]
    });

  } catch (err) {
    await db.query("ROLLBACK");

    console.log("REAL ERROR:", err);

    res.status(500).json({
      message: "Failed to create user",
      error: err.message
    });
  }
};


export const getUsers = async (req, res) => {
  try {
    const result = await db.query(`
      SELECT 
        u.id,
        u.name,
        u.email,
        u.status,
        r.name AS role,
        u.created_at
      FROM users u
      JOIN roles r ON u.role_id = r.id
      ORDER BY u.created_at DESC
    `);

    res.status(200).json({
      count: result.rows.length,
      data: result.rows
    });

  } catch (err) {
    res.status(500).json({
      message: "Failed to fetch users",
      error: err.message
    });
  }
};

export const getUserById = async (req, res) => {
  const { id } = req.params;

  try {
    const result = await db.query(
      `SELECT 
        u.id,
        u.name,
        u.email,
        u.status,
        r.name AS role,
        u.created_at
       FROM users u
       JOIN roles r ON u.role_id = r.id
       WHERE u.id=$1`,
      [id]
    );

    if (!result.rows.length) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json(result.rows[0]);

  } catch (err) {
    res.status(500).json({
      message: "Failed to fetch user",
      error: err.message
    });
  }
};

export const updateUser = async (req, res) => {
  const { id } = req.params;
  let { name, role_id } = req.body;

  try {
    if (!name && !role_id) {
      return res.status(400).json({
        message: "Provide at least one field to update"
      });
    }

    const fields = [];
    const values = [];
    let index = 1;

    if (name) {
      name = name.trim();
      if (!name) {
        return res.status(400).json({ message: "Invalid name" });
      }
      fields.push(`name=$${index++}`);
      values.push(name);
    }

    if (role_id) {
      const roleCheck = await db.query(
        `SELECT id FROM roles WHERE id=$1`,
        [role_id]
      );

      if (!roleCheck.rows.length) {
        return res.status(400).json({ message: "Invalid role" });
      }

      fields.push(`role_id=$${index++}`);
      values.push(role_id);
    }

    values.push(id);

    const result = await db.query(
      `UPDATE users
       SET ${fields.join(", ")}
       WHERE id=$${index}
       RETURNING id,name,email,role_id,status`,
      values
    );

    if (!result.rows.length) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({
      message: "User updated successfully",
      data: result.rows[0]
    });

  } catch (err) {
    res.status(500).json({
      message: "Failed to update user",
      error: err.message
    });
  }
};

export const updateUserStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  try {
    
    if (!status) {
      return res.status(400).json({ message: "Status is required" });
    }

    if (!["active", "inactive"].includes(status)) {
      return res.status(400).json({
        message: "Status must be 'active' or 'inactive'"
      });
    }

  
    if (req.user.id == id) {
      return res.status(400).json({
        message: "You cannot change your own status"
      });
    }

    const result = await db.query(
      `UPDATE users
       SET status=$1
       WHERE id=$2
       RETURNING id,name,email,status`,
      [status, id]
    );

    if (!result.rows.length) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({
      message: "User status updated",
      data: result.rows[0]
    });

  } catch (err) {
    res.status(500).json({
      message: "Failed to update status",
      error: err.message
    });
  }
};