const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    productName: { type: String, required: true },
    platform: { type: String, required: true },
    price: { type: Number, required: true },
    redirectUrl: { type: String, required: true },
    status: {
      type: String,
      enum: ["Redirected", "Confirmed", "Shipped", "Delivered", "Cancelled"],
      default: "Redirected",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Order", orderSchema);
