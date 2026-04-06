import db from "../config/db.js";

export const getDashboard = async (req, res) => {
  try {
    const role = req.user.role?.toUpperCase();
    const user_id = req.user.id;

    let filter = "";
    let values = [];

    
    if (role === "ADMIN" || role === "ANALYST" || role === "VIEWER") {
      // Full access → no filter
      filter = "";
      values = [];
    } else {
      
      filter = "AND user_id = $1";
      values = [user_id];
    }

    
    const incomeResult = await db.query(
      `SELECT COALESCE(SUM(amount),0) AS total 
       FROM transactions 
       WHERE type='income' AND is_deleted=false ${filter}`,
      values
    );

    
    const expenseResult = await db.query(
      `SELECT COALESCE(SUM(amount),0) AS total 
       FROM transactions 
       WHERE type='expense' AND is_deleted=false ${filter}`,
      values
    );

    const totalIncome = Number(incomeResult.rows[0].total);
    const totalExpense = Number(expenseResult.rows[0].total);
    const netBalance = totalIncome - totalExpense;

    let response = {
      role,
      totalIncome,
      totalExpense,
      netBalance
    };

  
    if (role === "ADMIN" || role === "ANALYST") {

      const categoryResult = await db.query(
        `SELECT 
           c.name AS category,
           SUM(t.amount)::numeric AS total
         FROM transactions t
         JOIN categories c ON t.category_id = c.id
         WHERE t.is_deleted=false 
           AND c.is_deleted=false ${filter}
         GROUP BY c.name`,
        values
      );

      const monthlyResult = await db.query(
        `SELECT 
           DATE_TRUNC('month', transaction_date) AS month,
           SUM(CASE WHEN type='income' THEN amount ELSE 0 END) AS income,
           SUM(CASE WHEN type='expense' THEN amount ELSE 0 END) AS expense
         FROM transactions
         WHERE is_deleted=false ${filter}
         GROUP BY month
         ORDER BY month`,
        values
      );

      const weeklyResult = await db.query(
        `SELECT 
           DATE_TRUNC('week', transaction_date) AS week,
           SUM(CASE WHEN type='income' THEN amount ELSE 0 END) AS income,
           SUM(CASE WHEN type='expense' THEN amount ELSE 0 END) AS expense
         FROM transactions
         WHERE is_deleted=false ${filter}
         GROUP BY week
         ORDER BY week`,
        values
      );

      const recentResult = await db.query(
        `SELECT 
           t.id,
           t.amount,
           t.type,
           t.note,
           t.transaction_date,
           c.name AS category
         FROM transactions t
         JOIN categories c ON t.category_id = c.id
         WHERE t.is_deleted=false 
           AND c.is_deleted=false ${filter}
         ORDER BY t.created_at DESC
         LIMIT 5`,
        values
      );

      response.categoryWise = categoryResult.rows;
      response.monthlyTrends = monthlyResult.rows;
      response.weeklyTrends = weeklyResult.rows;
      response.recentActivity = recentResult.rows;
    }

    res.status(200).json(response);

  } catch (err) {
    res.status(500).json({
      message: "Dashboard error",
      error: err.message
    });
  }
};