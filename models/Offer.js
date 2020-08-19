const mongoose = require("mongoose");

const Offer = mongoose.model("Offer", {
  created: Date,
  title: String,
  description: String,
  price: Number,
  size: String,
  picture: Object,
  category: String,
  brand: String,
  condition: String,
  creator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
});

module.exports = Offer;
