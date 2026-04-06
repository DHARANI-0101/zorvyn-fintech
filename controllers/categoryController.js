import db from "../config/db.js";

export const createCategory = async (req, res) => {

  try {
    let { name, type } = req.body;

    if (!name || !type) {
      return res.status(400).json({
        message: "Name and type are required"
      });
    }

    name = name.trim();

    if (!name) {
      return res.status(400).json({
        message: "Category name cannot be empty"
      });
    }

    if (!["income", "expense"].includes(type)) {
      return res.status(400).json({
        message: "Type must be 'income' or 'expense'"
      });
    }


    const existing = await db.query(
      `SELECT id FROM categories 
       WHERE LOWER(name)=LOWER($1) AND is_deleted=false`,
      [name]
    );

    if (existing.rows.length) {
      return res.status(400).json({
        message: "Category already exists"
      });
    }

    const result = await db.query(
      `INSERT INTO categories (name, type, created_by)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [name, type, req.user.id]
    );

    res.status(201).json({
      message: "Category created",
      data: result.rows[0]
    });

  } catch (err) {
    res.status(500).json({
      message: "Failed to create category",
      error: err.message
    });
  }
};


export const getCategories = async (req, res) => {
  try {
    const result = await db.query(
      `SELECT * FROM categories 
       WHERE is_deleted=false
       ORDER BY created_at DESC`
    );

    res.json({
      count: result.rows.length,
      data: result.rows
    });

  } catch (err) {
    res.status(500).json({
      message: "Failed to fetch categories",
      error: err.message
    });
  }
};


export const updateCategory = async (req, res) => {
  const { id } = req.params;
  let { name, type } = req.body;

  try {
    if (!name && !type) {
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
        return res.status(400).json({
          message: "Invalid name"
        });
      }

      const existing = await db.query(
        `SELECT id FROM categories 
         WHERE LOWER(name)=LOWER($1) AND id != $2 AND is_deleted=false`,
        [name, id]
      );

      if (existing.rows.length) {
        return res.status(400).json({
          message: "Category already exists"
        });
      }

      fields.push(`name=$${index++}`);
      values.push(name);
    }

    if (type) {
      if (!["income", "expense"].includes(type)) {
        return res.status(400).json({
          message: "Invalid type"
        });
      }

      fields.push(`type=$${index++}`);
      values.push(type);
    }

    values.push(id);

    const result = await db.query(
      `UPDATE categories
       SET ${fields.join(", ")}
       WHERE id=$${index} AND is_deleted=false
       RETURNING *`,
      values
    );

    if (!result.rows.length) {
      return res.status(404).json({
        message: "Category not found or already deleted"
      });
    }

    res.json({
      message: "Category updated",
      data: result.rows[0]
    });

  } catch (err) {
    res.status(500).json({
      message: "Failed to update category",
      error: err.message
    });
  }
};


export const deleteCategory = async (req, res) => {
  const { id } = req.params;

  try {
    const result = await db.query(
      `UPDATE categories
       SET is_deleted=true
       WHERE id=$1 AND is_deleted=false
       RETURNING *`,
      [id]
    );

    if (!result.rows.length) {
      return res.status(404).json({
        message: "Category not found or already deleted"
      });
    }

    res.json({
      message: "Category deleted successfully",
      data: result.rows[0]
    });

  } catch (err) {
    res.status(500).json({
      message: "Failed to delete category",
      error: err.message
    });
  }
};