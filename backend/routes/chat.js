const express = require("express");
const Product = require("../models/Product");
const User = require("../models/User");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

const PAYMENT_METHODS = [
  "HDFC Credit Card", "ICICI Credit Card", "SBI Credit Card", "Axis Credit Card",
  "Amazon Pay UPI", "Flipkart UPI", "Any UPI", "Cash on Delivery",
];

router.post("/message", requireAuth, async (req, res) => {
  const { text } = req.body;
  const lower = (text || "").toLowerCase();
  const user = await User.findById(req.user.id);

  const matchedMethod = PAYMENT_METHODS.find((m) => lower.includes(m.toLowerCase().split(" ")[0]));
  if (lower.includes("remember") || (lower.includes("payment") && matchedMethod)) {
    if (matchedMethod) {
      user.preferredPayment = matchedMethod;
      await user.save();
      return res.json({ reply: `Got it — I'll prioritize offers matching ${matchedMethod} in every verdict from now on.` });
    }
    return res.json({ reply: "Which payment method should I remember? Try: " + PAYMENT_METHODS.slice(0, 4).join(", ") });
  }

  const products = await Product.find();
  const found = products.find((p) => lower.includes(p.name.toLowerCase().split(" ")[0]));
  if (found) {
    const best = [...found.offers].sort((a, b) => a.price - b.price)[0];
    const cheapest = [...found.offers].sort((a, b) => a.price - b.price)[0];
    return res.json({
      reply: `For ${found.name}, my pick is ${cheapest.platform} at ₹${cheapest.price} (${cheapest.paymentOffer}). Open the product page for the full comparison.`,
    });
  }

  res.json({ reply: "I can compare prices, delivery, and offers across stores — name a product, or tell me your preferred payment method." });
});

module.exports = router;
