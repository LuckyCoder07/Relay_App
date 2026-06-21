const express = require("express");
const Product = require("../models/Product");
const { requireAuth, requireRole } = require("../middleware/auth");

const router = express.Router();

const FASHION_CATS = ["mens-shirts", "mens-shoes", "mens-watches", "tops", "womens-bags", "womens-dresses", "womens-jewellery", "womens-shoes", "womens-watches", "sunglasses"];
const BEAUTY_CATS = ["beauty", "skin-care", "fragrances"];

const OFFER_TEXTS = {
  Amazon: ["10% instant discount on HDFC Credit Card", "5% cashback on Amazon Pay UPI", "No cost EMI up to 9 months", "Bank discount 5% on ICICI Credit Card"],
  Flipkart: ["₹2,000 off on Flipkart Axis Card", "Flipkart UPI 5% cashback", "No cost EMI up to 6 months", "Exchange bonus up to ₹5,000"],
  Myntra: ["Extra 10% off on Myntra Insider", "Extra 15% off for new users", "Flat 20% off on app orders"],
  Croma: ["Free installation, store pickup today", "Bank discount 10% on Axis Card", "Free 1 year extended warranty"],
  "Reliance Digital": ["No cost EMI up to 6 months", "Extra ₹500 off on exchange", "Bundle discount with accessories"],
  Nykaa: ["Buy 2 Get 1 Free on skincare", "Nykaa Prime 10% extra off", "Free gift on orders above ₹999"],
};

function hashStr(s) { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return Math.abs(h); }
function seededRand(seed) { const x = Math.sin(seed) * 10000; return x - Math.floor(x); }

const titleCase = (s) => (s || "").replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

function buildOffers(id, category, priceUSD, discountPct, stock) {
  const inrBase = Math.round((priceUSD * 83) / 10) * 10;
  const mrp = Math.round((inrBase * (1 + (discountPct || 8) / 100)) / 10) * 10;
  let platforms = ["Amazon", "Flipkart"];
  if (FASHION_CATS.includes(category)) platforms.push("Myntra");
  else if (BEAUTY_CATS.includes(category)) platforms.push("Nykaa");
  else platforms.push(hashStr(id) % 2 === 0 ? "Croma" : "Reliance Digital");

  return platforms.map((plat) => {
    const seed = hashStr(id + plat);
    const variance = (seededRand(seed) - 0.5) * 0.12;
    const price = Math.max(49, Math.round((inrBase * (1 + variance)) / 10) * 10);
    const delivery = Math.floor(seededRand(seed * 2 + 1) * 4);
    const pool = OFFER_TEXTS[plat];
    const offer = pool[Math.floor(seededRand(seed * 3 + 2) * pool.length)];
    const stockLabel = stock > 5 ? "In stock" : stock > 0 ? "Limited stock" : "Out of stock";
    return { platform: plat, url: "#", price, mrp, deliveryDays: delivery, paymentOffer: offer, stock: stockLabel };
  });
}

function transformProduct(p) {
  const id = "api-" + p.id;
  return {
    dummyId: id,
    name: p.title,
    category: p.category,
    description: (p.description || "").slice(0, 150),
    rating: p.rating || 4.0,
    image: (p.images && p.images[0]) || p.thumbnail || "",
    brand: p.brand || "",
    sku: p.sku || "",
    weight: p.weight || 0,
    dimensions: p.dimensions || { width: 0, height: 0, depth: 0 },
    warranty: p.warrantyInformation || "",
    shipping: p.shippingInformation || "",
    returnPolicy: p.returnPolicy || "",
    minOrderQty: p.minimumOrderQuantity || 1,
    offers: buildOffers(id, p.category, p.price, p.discountPercentage, p.stock ?? 10),
  };
}

// ---- AI verdict scoring: weighs discount, delivery speed, payment match, stock ----
function scoreOffer(offer, preferredPayment) {
  const discountPct = offer.mrp > 0 ? (offer.mrp - offer.price) / offer.mrp : 0;
  const deliveryScore = 1 - Math.min(offer.deliveryDays, 5) / 5;
  const paymentMatch =
    preferredPayment && offer.paymentOffer.toLowerCase().includes(preferredPayment.split(" ")[0].toLowerCase()) ? 1 : 0;
  const stockScore = offer.stock === "In stock" ? 1 : offer.stock === "Limited stock" ? 0.5 : 0;
  return discountPct * 0.45 + deliveryScore * 0.2 + paymentMatch * 0.25 + stockScore * 0.1;
}

function withVerdict(product, preferredPayment) {
  const pObj = product.toObject ? product.toObject() : product;
  const ranked = [...pObj.offers]
    .map((o) => ({ ...o, score: scoreOffer(o, preferredPayment) }))
    .sort((a, b) => b.score - a.score);
  return { ...pObj, ranked, bestOffer: ranked[0] || null };
}

// Helper to upsert external products to our DB so we can reference their ObjectId in orders/chats
async function syncProducts(externalProducts) {
  const savedProducts = [];
  for (const p of externalProducts) {
    const transformed = transformProduct(p);
    // Upsert based on dummyId
    const saved = await Product.findOneAndUpdate(
      { dummyId: transformed.dummyId },
      { $set: transformed },
      { new: true, upsert: true }
    );
    savedProducts.push(saved);
  }
  return savedProducts;
}

router.get("/categories", async (req, res) => {
  try {
    const r = await fetch("https://dummyjson.com/products/categories");
    if (!r.ok) throw new Error("Request failed");
    const data = await r.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch categories" });
  }
});

// GET /api/products?search=&category=&payment=
router.get("/", async (req, res) => {
  const { search, category, payment } = req.query;
  
  try {
    let url = "https://dummyjson.com/products?limit=30";
    if (search) {
      url = `https://dummyjson.com/products/search?q=${encodeURIComponent(search)}&limit=30`;
    } else if (category && category !== "All") {
      url = `https://dummyjson.com/products/category/${encodeURIComponent(category)}`;
    }
    
    const r = await fetch(url);
    if (!r.ok) throw new Error("Failed to fetch from dummyjson");
    const data = await r.json();
    
    // Sync the fetched live products to our DB
    const products = await syncProducts(data.products || []);
    res.json(products.map((p) => withVerdict(p, payment || "")));
  } catch (err) {
    // Fallback to what we have in DB
    const filter = {};
    if (category && category !== "All") filter.category = category;
    if (search) filter.$text = { $search: search };
    const products = await Product.find(filter).sort({ createdAt: -1 });
    res.json(products.map((p) => withVerdict(p, payment || "")));
  }
});

router.get("/:id", async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) return res.status(404).json({ error: "Product not found" });
  res.json(withVerdict(product, req.query.payment || ""));
});

// Admin-only management
router.post("/", requireAuth, requireRole("Admin"), async (req, res) => {
  const product = await Product.create(req.body);
  res.status(201).json(product);
});

router.put("/:id", requireAuth, requireRole("Admin"), async (req, res) => {
  const product = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!product) return res.status(404).json({ error: "Product not found" });
  res.json(product);
});

router.delete("/:id", requireAuth, requireRole("Admin"), async (req, res) => {
  await Product.findByIdAndDelete(req.params.id);
  res.status(204).end();
});

module.exports = router;
