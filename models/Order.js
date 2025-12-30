const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // Optional (guest checkout)
    fullName: { type: String, required: true },
    address: { type: String, required: true },
    phone: { type: String, required: true },
    postalCode: String,
    province: String,
    dob: Date,
    items: [
      {
        productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
        name: String,
        price: Number,
        quantity: Number,
        image: String
      }
    ],
    total: { type: Number, required: true },
    status: { 
      type: String, 
      enum: ["Pending", "Confirmed", "Shipped", "Delivered", "Cancelled"], 
      default: "Pending" 
    },
    paymentMethod: { type: String, default: "COD" } // Cash on Delivery
  },
  { timestamps: true }
);

module.exports = mongoose.model("Order", orderSchema);
