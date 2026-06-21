const mongoose = require("mongoose");

const offerSchema = new mongoose.Schema(
  {
    platform: { type: String, required: true }, // Amazon, Flipkart, Myntra, Croma, Reliance Digital, Nykaa...
    url: { type: String, required: true },        // external product/store URL to redirect to
    price: { type: Number, required: true },
    mrp: { type: Number, required: true },
    deliveryDays: { type: Number, default: 2 },
    paymentOffer: { type: String, default: "" },   // e.g. "10% off on HDFC Credit Card"
    stock: { type: String, enum: ["In stock", "Limited stock", "Out of stock"], default: "In stock" },
  },
  { _id: false }
);

const productSchema = new mongoose.Schema(
  {
    dummyId: { type: String, unique: true, sparse: true },
    name: { type: String, required: true, trim: true },
    category: { type: String, required: true, index: true },
    description: { type: String, default: "" },
    image: { type: String, default: "" }, // image URL or emoji placeholder
    rating: { type: Number, default: 4.0, min: 0, max: 5 },
    brand: { type: String, default: "" },
    sku: { type: String, default: "" },
    weight: { type: Number, default: 0 },
    dimensions: { 
      width: { type: Number, default: 0 }, 
      height: { type: Number, default: 0 }, 
      depth: { type: Number, default: 0 } 
    },
    warranty: { type: String, default: "" },
    shipping: { type: String, default: "" },
    returnPolicy: { type: String, default: "" },
    minOrderQty: { type: Number, default: 1 },
    offers: { type: [offerSchema], default: [] },
  },
  { timestamps: true }
);

productSchema.index({ name: "text", category: "text" });

module.exports = mongoose.model("Product", productSchema);
