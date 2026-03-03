const mongoose = require("mongoose");

const ExpenseSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    category: {
      type: String,
      enum: [
        "Fertilizer",
        "Seeds",
        "Labor",
        "Irrigation",
        "Pesticide",
        "Machinery",
        "Other",
      ],
      required: true,
    },
    amount: { type: Number, required: true },
    expenseDate: { type: Date, required: true },

    farmId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Farm",
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    cropName: {
      type: String,
      required: false, // Optional, for tracking expense per crop
    },

    notes: String,
  },
  { timestamps: true }
);

module.exports = mongoose.model("Expense", ExpenseSchema);
