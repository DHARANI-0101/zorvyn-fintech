export const validateTransaction = ({
  amount,
  type,
  category_id,
  transaction_date
}) => {

  if (amount === undefined || !type || !category_id || !transaction_date) {
    return "Amount, type, category_id and transaction_date are required";
  }


  if (typeof amount !== "number" || isNaN(amount)) {
    return "Amount must be a valid number";
  }

  if (amount <= 0) {
    return "Amount must be greater than 0";
  }


  if (!["income", "expense"].includes(type)) {
    return "Type must be either 'income' or 'expense'";
  }


  if (!Number.isInteger(category_id)) {
    return "category_id must be a valid integer";
  }

 
  const date = new Date(transaction_date);
  if (isNaN(date.getTime())) {
    return "Invalid transaction_date";
  }

  return null;
};