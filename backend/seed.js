require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const Product = require("./models/Product");
const User = require("./models/User");

const products = [
  {
    name: "Pixel 9 Pro", category: "Smartphones", rating: 4.6, image: "📱",
    description: "Tensor G4, 50MP camera, 7 years of OS updates.",
    offers: [
      { platform: "Amazon", url: "https://www.amazon.in", price: 89999, mrp: 106999, deliveryDays: 1, paymentOffer: "10% instant discount on HDFC Credit Card", stock: "In stock" },
      { platform: "Flipkart", url: "https://www.flipkart.com", price: 87999, mrp: 106999, deliveryDays: 2, paymentOffer: "₹4,000 off on Flipkart Axis Card", stock: "In stock" },
      { platform: "Reliance Digital", url: "https://www.reliancedigital.in", price: 91499, mrp: 106999, deliveryDays: 3, paymentOffer: "No cost EMI up to 9 months", stock: "Limited stock" },
    ],
  },
  {
    name: "UltraBook 14 Slim", category: "Laptops", rating: 4.4, image: "💻",
    description: "13th Gen i7, 16GB RAM, 1TB SSD, 2.8K OLED.",
    offers: [
      { platform: "Amazon", url: "https://www.amazon.in", price: 71990, mrp: 89990, deliveryDays: 2, paymentOffer: "Bank discount 5% on ICICI Credit Card", stock: "In stock" },
      { platform: "Croma", url: "https://www.croma.com", price: 73500, mrp: 89990, deliveryDays: 0, paymentOffer: "Free 1Yr extended warranty, store pickup today", stock: "In stock" },
      { platform: "Flipkart", url: "https://www.flipkart.com", price: 70990, mrp: 89990, deliveryDays: 3, paymentOffer: "₹2,000 off + exchange up to ₹15,000", stock: "In stock" },
    ],
  },
];

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  await Product.deleteMany({});
  await Product.insertMany(products);

  await User.deleteMany({});
  const adminHash = await bcrypt.hash("demo123", 10);
  const userHash = await bcrypt.hash("demo123", 10);
  await User.create([
    { name: "Admin", email: "admin@relay.app", passwordHash: adminHash, role: "Admin" },
    { name: "Demo User", email: "user@relay.app", passwordHash: userHash, role: "User" },
  ]);

  console.log("Seeded products and demo accounts (admin@relay.app / user@relay.app, password demo123)");
  await mongoose.disconnect();
}

run().catch((err) => { console.error(err); process.exit(1); });
