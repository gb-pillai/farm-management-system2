const express = require("express");
const router = express.Router();

const fertilizers = require("../data/fertilizers");
const getNextDate = require("../utils/dateCalc");
const decideInterval = require("../utils/intervalDecision");
const fertilizerSafety = require("../data/fertilizerSafety");
//const { getForecast, isWeatherSuitable } = require("../utils/weatherCheck");

router.post("/next-date", async (req, res) => {
  try {
    const { crop, stage, fertilizer, lastDate, farmerInterval } = req.body;

    if (!fertilizers[crop] || !fertilizers[crop][stage]) {
      return res.status(400).json({ message: "Invalid crop or stage" });
    }

    const cropInterval = fertilizers[crop][stage].interval;

    const fertilizerSafety = require("../data/fertilizerSafety");
    const fertInterval =
      fertilizerSafety[fertilizer]?.minInterval || 0;

    const baseInterval = Math.max(cropInterval, fertInterval);

    const decision = decideInterval(baseInterval, farmerInterval);

    const nextDate = getNextDate(
      lastDate,
      decision.finalDays
    );

    res.json({
      crop,
      stage,
      fertilizer,
      cropInterval,
      fertilizerInterval: fertInterval,
      baseInterval,  // 🔥 ADD THIS LINE
      farmerInterval: farmerInterval || null,
      usedInterval: decision.finalDays,
      nextDate,
      weatherStatus: "Suitable",
      weatherReason: "Weather assumed good",
      message: decision.message
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: "Recommendation calculation failed"
    });
  }
});

router.post("/stages", (req, res) => {
  const crop = req.body.crop?.toLowerCase(); // 🔥 force lowercase

  if (!crop || !fertilizers[crop]) {
    return res.status(400).json({ message: "Invalid crop" });
  }

  const stages = Object.keys(fertilizers[crop]);
  res.json({ stages });
});

const { spawn } = require("child_process");
const path = require("path");

router.post("/fertilizer", (req, res) => {
  const { n, p, k, temperature, humidity, moisture, soilType, crop, stage } = req.body;

  // Validate inputs
  if (n === undefined || !p || !k || !temperature || !humidity || !moisture || !soilType || !crop || !stage) {
    return res.status(400).json({ success: false, message: "Missing required ML features" });
  }

  const scriptPath = path.join(__dirname, "../ml/predict_fertilizer.py");

  // Arguments order: n, p, k, temp, hum, moist, soil, crop, stage
  const args = [scriptPath, n, p, k, temperature, humidity, moisture, soilType, crop, stage];

  const pythonProcess = spawn("python", args);

  let prediction = "";
  let errorMsg = "";

  pythonProcess.stdout.on("data", (data) => {
    prediction += data.toString();
  });

  pythonProcess.stderr.on("data", (data) => {
    errorMsg += data.toString();
  });

  pythonProcess.on("close", (code) => {
    if (code !== 0 || errorMsg.includes("ERROR:")) {
      console.error("ML Prediction Error:", errorMsg);
      return res.status(500).json({ success: false, message: "Failed to generate recommendation" });
    }
    res.json({ success: true, recommendation: prediction.trim() });
  });
});

module.exports = router;
