const mongoose = require("mongoose");

const FarmSchema = new mongoose.Schema(
  {
    // Link farm to the farmer (user)
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    // Basic farm details
    farmName: {
      type: String,
      required: true,
      trim: true
    },

    location: {
      type: String,
      required: true
    },

    // Land size in acres
    areaInAcres: {
      type: Number,
      required: true,
      min: 0
    },

    // Detailed Crop Lifecycle
    crops: [
      {
        name: { type: String, required: true },
        season: { type: String, required: true },
        sownDate: { type: Date },
        expectedHarvestDate: { type: Date },
        allocatedArea: { type: Number, min: 0, default: 0 },
        removalDate: { type: Date },
        status: {
          type: String,
          enum: ["Growing", "Harvested", "Planned", "Removed"],
          default: "Growing"
        }
      }
    ],

    // Simple seasons for Kerala farmers
    season: {
      type: String,
      enum: ["Monsoon", "Post-Monsoon", "Summer"],
      required: true
    },

    // Production & income details
    yieldAmount: {
      type: Number,
      min: 0
    },

    profit: {
      type: Number
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("Farm", FarmSchema);
