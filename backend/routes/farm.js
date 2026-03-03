const express = require("express");
const router = express.Router();
const Farm = require("../models/Farm");

/*
  Phase-2 Farm Routes
  ------------------
  - Add farm data (MongoDB)
  - View farms of a user
*/

// -------------------- ADD FARM --------------------
router.post("/", async (req, res) => {
  try {
    const {
      userId,
      farmName,
      location,
      areaInAcres,
      cropName, // legacy frontend
      crops,    // new frontend
      season,
      yieldAmount,
      profit
    } = req.body;

    // Convert legacy cropName to crops array if crops isn't provided
    let finalCrops = crops || (cropName ? [cropName] : []);

    // Ensure backwards compatibility by converting strings to objects
    finalCrops = finalCrops.map(crop => {
      if (typeof crop === "string") {
        return {
          name: crop,
          season: season || "Unknown",
          status: "Growing"
        };
      }
      return crop;
    });

    if (!userId || !farmName || !location || !areaInAcres || finalCrops.length === 0 || !season) {
      return res.status(400).json({
        success: false,
        message: `Required farm details missing. Provided: userId=${!!userId}, farmName=${!!farmName}, location=${!!location}, areaInAcres=${!!areaInAcres}, cropsLength=${finalCrops.length}, season=${!!season}`
      });
    }

    const newFarm = new Farm({
      userId,
      farmName,
      location,
      areaInAcres,
      crops: finalCrops,
      season,
      yieldAmount,
      profit
    });

    await newFarm.save();

    res.status(201).json({
      success: true,
      message: "Farm added successfully",
      data: newFarm
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
});

// -------------------- GET FARMS BY USER --------------------
router.get("/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    const farms = await Farm.find({ userId });

    res.json({
      success: true,
      data: farms
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
});

// -------------------- GET FARM BY ID --------------------
router.get("/details/:farmId", async (req, res) => {
  try {
    const { farmId } = req.params;

    const farm = await Farm.findById(farmId);

    if (!farm) {
      return res.status(404).json({
        success: false,
        message: "Farm not found"
      });
    }

    res.json({
      success: true,
      data: farm
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
});

// GET single farm
router.get("/:id", async (req, res) => {
  try {
    const farm = await Farm.findById(req.params.id);

    if (!farm) {
      return res.status(404).json({ error: "Farm not found" });
    }

    res.json(farm);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});



// -------------------- ADD CROP TO EXISTING FARM --------------------
router.post("/:farmId/crop", async (req, res) => {
  try {
    const { farmId } = req.params;
    const { name, season, sownDate, expectedHarvestDate, status, allocatedArea, removalDate } = req.body;

    if (!name || !season) {
      return res.status(400).json({ success: false, message: "Crop name and season are required" });
    }

    const farm = await Farm.findById(farmId);
    if (!farm) return res.status(404).json({ success: false, message: "Farm not found" });

    // ─────────────────────────────────────────────────────────────
    // BYPASS: If the new crop is already "Removed"/"Harvested" with
    // a past removal date, it is a historical record — no land is
    // needed today, so skip the availability check entirely.
    // ─────────────────────────────────────────────────────────────
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const isHistoricalRecord =
      (status === "Removed" || status === "Harvested") &&
      removalDate &&
      new Date(removalDate) < today;

    if (!isHistoricalRecord) {
      // Calculate land used by crops whose date range OVERLAPS with the new crop's dates
      const newStart = sownDate ? new Date(sownDate) : null;
      const newEnd = removalDate
        ? new Date(removalDate)
        : (expectedHarvestDate ? new Date(expectedHarvestDate) : null);

      const usedArea = farm.crops.reduce((sum, existing) => {
        if (!existing.allocatedArea) return sum;

        const exStart = existing.sownDate ? new Date(existing.sownDate) : null;
        let exEnd = existing.expectedHarvestDate ? new Date(existing.expectedHarvestDate) : null;

        // Use removalDate as end for Removed/Harvested crops
        if (existing.removalDate &&
          (existing.status === "Removed" || existing.status === "Harvested")) {
          exEnd = new Date(existing.removalDate);
        }

        // Default behaviour if there are missing dates
        if (!newStart && !newEnd) return sum + existing.allocatedArea;
        if (!exStart && !exEnd) return sum + existing.allocatedArea;

        // Calculate intersection
        const overlapStart = !newStart ? exStart : (!exStart ? newStart : new Date(Math.max(newStart, exStart)));
        const overlapEnd = !newEnd ? exEnd : (!exEnd ? newEnd : new Date(Math.min(newEnd, exEnd)));

        const overlaps = !overlapEnd || overlapStart <= overlapEnd;
        return overlaps ? sum + existing.allocatedArea : sum;
      }, 0);

      const availableArea = farm.areaInAcres - usedArea;
      const requestedArea = parseFloat(allocatedArea) || 0;

      if (requestedArea > availableArea) {
        return res.status(400).json({
          success: false,
          message: `Not enough land during ${newStart ? newStart.toLocaleDateString() : '?'} – ${newEnd ? newEnd.toLocaleDateString() : '?'}! Available: ${availableArea.toFixed(2)} acres, Requested: ${requestedArea} acres`
        });
      }
    }

    farm.crops.push({ name, season, sownDate, expectedHarvestDate, removalDate: removalDate || undefined, allocatedArea: parseFloat(allocatedArea) || 0, status: status || "Growing" });
    await farm.save();

    res.json({ success: true, message: "Crop added", data: farm });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
});


// -------------------- UPDATE FARM --------------------
router.put("/:farmId", async (req, res) => {
  try {
    const { farmId } = req.params;
    const { farmName, location, areaInAcres, season } = req.body;

    const farm = await Farm.findById(farmId);
    if (!farm) return res.status(404).json({ success: false, message: "Farm not found" });

    if (farmName) farm.farmName = farmName;
    if (location) farm.location = location;
    if (areaInAcres) farm.areaInAcres = areaInAcres;
    if (season) farm.season = season;

    await farm.save();
    res.json({ success: true, message: "Farm updated", data: farm });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
});

// -------------------- UPDATE CROP IN FARM --------------------
router.put("/:farmId/crop/:cropId", async (req, res) => {
  try {
    const { farmId, cropId } = req.params;
    const { name, season, sownDate, expectedHarvestDate, status, allocatedArea, removalDate } = req.body;

    const farm = await Farm.findById(farmId);
    if (!farm) return res.status(404).json({ success: false, message: "Farm not found" });

    const crop = farm.crops.id(cropId);
    if (!crop) return res.status(404).json({ success: false, message: "Crop not found" });

    if (name) crop.name = name;
    if (season) crop.season = season;
    if (sownDate) crop.sownDate = sownDate;
    if (expectedHarvestDate) crop.expectedHarvestDate = expectedHarvestDate;
    if (status) crop.status = status;
    if (allocatedArea !== undefined) crop.allocatedArea = parseFloat(allocatedArea) || 0;

    // Explicitly set or clear removal date when missing if its not actively Growing or Planned.
    if (removalDate) crop.removalDate = removalDate;
    else if (status === "Growing" || status === "Planned") crop.removalDate = undefined;

    await farm.save();
    res.json({ success: true, message: "Crop updated", data: farm });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
});

// -------------------- DELETE FARM --------------------
router.delete("/:farmId", async (req, res) => {
  try {
    const { farmId } = req.params;
    const farm = await Farm.findByIdAndDelete(farmId);
    if (!farm) return res.status(404).json({ success: false, message: "Farm not found" });
    res.json({ success: true, message: "Farm deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
});

// -------------------- DELETE CROP FROM FARM --------------------
router.delete("/:farmId/crop/:cropId", async (req, res) => {
  try {
    const { farmId, cropId } = req.params;

    const farm = await Farm.findById(farmId);
    if (!farm) return res.status(404).json({ success: false, message: "Farm not found" });

    farm.crops = farm.crops.filter(c => c._id.toString() !== cropId);
    await farm.save();

    res.json({ success: true, message: "Crop removed", data: farm });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
});

module.exports = router;
