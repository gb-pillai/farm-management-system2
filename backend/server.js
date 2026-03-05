const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const cors = require("cors");

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Connected"))
  .catch(err => console.error(err));

// Auth routes
app.use("/api/auth", require("./routes/auth"));

// Farm routes
app.use("/api/farm", require("./routes/farm"));

// Fertilizer routes
app.use("/api/fertilizer", require("./routes/fertilizerRoutes"));

// Recommendation routes
app.use("/api/recommendation", require("./routes/recommendation"));

// Expense routes
app.use("/api/expenses", require("./routes/expense"));

// Analytics routes
app.use("/api/analytics", require("./routes/analytics"));

// Income routes
app.use("/api/income", require("./routes/income"));


app.use("/api/weather", require("./routes/weather"));

app.use("/api/yield", require("./routes/yield"));

require("./jobs/weatherScheduler");
// Test route
app.get("/", (req, res) => {
  res.send("Backend running");
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () =>
  console.log(`Server running on port ${PORT}`)
);
