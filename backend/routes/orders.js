const express = require("express");
const Order = require("../models/Order");
const Product = require("../models/Product");
const { requireAuth, requireRole } = require("../middleware/auth");

const router = express.Router();

// Log a "redirect to original site to pay" event — this is how Relay tracks orders
// without ever touching the user's payment details.
router.post("/redirect", requireAuth, async (req, res) => {
  const { productId, platform } = req.body;
  const product = await Product.findById(productId);
  if (!product) return res.status(404).json({ error: "Product not found" });
  const offer = product.offers.find((o) => o.platform === platform);
  if (!offer) return res.status(404).json({ error: "Offer not found for that platform" });

  const order = await Order.create({
    user: req.user.id,
    product: product._id,
    productName: product.name,
    platform: offer.platform,
    price: offer.price,
    redirectUrl: offer.url,
    status: "Redirected",
  });
  res.status(201).json(order);
});

router.get("/mine", requireAuth, async (req, res) => {
  const orders = await Order.find({ user: req.user.id }).sort({ createdAt: -1 });
  res.json(orders);
});

router.get("/", requireAuth, requireRole("Admin"), async (req, res) => {
  const orders = await Order.find().populate("user", "name email").sort({ createdAt: -1 });
  res.json(orders);
});

router.patch("/:id/status", requireAuth, requireRole("Admin"), async (req, res) => {
  const { status } = req.body;
  const order = await Order.findByIdAndUpdate(req.params.id, { status }, { new: true });
  if (!order) return res.status(404).json({ error: "Order not found" });
  res.json(order);
});

module.exports = router;
