import db from "../config/db.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const result = await db.query(
      `SELECT u.*, r.name AS role
       FROM users u
       JOIN roles r ON u.role_id = r.id
       WHERE u.email=$1`,
      [email]
    );

    if (!result.rows.length) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const user = result.rows[0];

  
    if (user.status !== "active") {
      return res.status(403).json({ message: "User inactive" });
    }

  
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

  
    const token = jwt.sign(
      {
        id: user.id,
        role: user.role   
      },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

  
    res.json({
      message: "Login successful",
      token
    });

  } catch (err) {
    res.status(500).json({
      message: "Login failed",
      error: err.message
    });
  }
};