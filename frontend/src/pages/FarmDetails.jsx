import { useEffect, useState } from "react";
import ErrorBoundary from "../components/ErrorBoundary";
import { useParams, useNavigate } from "react-router-dom";
import { getPreferredUnit, acresToDisplay, shortLabel, formatCropName } from "../utils/areaUtils";
import UnitSelector from "../components/UnitSelector";
import axios from "axios";

import "./FarmDetails.css";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';

// =========================================================
// Auto-detect crop status based on today's date vs dates
// =========================================================
function getEffectiveStatus(crop) {
  if (crop.status === "Harvested" || crop.status === "Removed") return { status: crop.status, auto: false };
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const sown = crop.sownDate ? new Date(crop.sownDate) : null;
  const harvest = crop.expectedHarvestDate ? new Date(crop.expectedHarvestDate) : null;
  const removal = crop.removalDate ? new Date(crop.removalDate) : null;

  if (removal && today >= removal) return { status: "Removed", auto: true };
  if (harvest && today > harvest) return { status: "Harvested", auto: true };
  if (sown && today < sown) return { status: "Planned", auto: true };
  if (sown && harvest && today >= sown && today <= harvest) return { status: "Growing", auto: true };
  if (sown && !harvest && today >= sown) return { status: "Growing", auto: true };

  // Fall back to manually set status
  return { status: crop.status || "Growing", auto: false };
}

// ── CUSTOM TOOLTIP FOR PREMIUM UI ──
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const income = payload.find(p => p.dataKey === "income")?.value || 0;
    const expense = payload.find(p => p.dataKey === "expense")?.value || 0;
    const profit = income - expense;

    return (
      <div style={{
        background: "#1e293b",
        border: "1px solid #334155",
        padding: "16px",
        borderRadius: "12px",
        boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.2)",
        minWidth: "180px"
      }}>
        <p style={{ margin: "0 0 10px 0", fontWeight: "bold", fontSize: "1rem", color: "#f8fafc" }}>🌿 {formatCropName(label)}</p>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
          <span style={{ color: "#94a3b8", fontSize: "0.85rem" }}>Income:</span>
          <span style={{ color: "#22c55e", fontWeight: "600", fontSize: "0.85rem" }}>₹{income.toLocaleString()}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
          <span style={{ color: "#94a3b8", fontSize: "0.85rem" }}>Expense:</span>
          <span style={{ color: "#ef4444", fontWeight: "600", fontSize: "0.85rem" }}>₹{expense.toLocaleString()}</span>
        </div>
        <div style={{ height: "1px", background: "#334155", margin: "8px 0" }} />
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: "4px" }}>
          <span style={{ color: "#f1f5f9", fontSize: "0.9rem", fontWeight: "600" }}>Net Profit:</span>
          <span style={{ color: profit >= 0 ? "#4ade80" : "#f87171", fontWeight: "bold", fontSize: "0.95rem" }}>
            {profit >= 0 ? "+" : ""}₹{profit.toLocaleString()}
          </span>
        </div>
      </div>
    );
  }
  return null;
};

function FarmDetails() {

  const { farmId } = useParams();
  const navigate = useNavigate();

  const [farm, setFarm] = useState(null);
  const [fertilizers, setFertilizers] = useState([]);

  const [editingCropId, setEditingCropId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [unit, setUnit] = useState(getPreferredUnit());

  const [cropAnalytics, setCropAnalytics] = useState([]);
  const [analyticsYear, setAnalyticsYear] = useState(new Date().getFullYear());
  const [showTable, setShowTable] = useState(false);

  const API_KEY = import.meta.env.VITE_WEATHER_API_KEY;
  const [weather, setWeather] = useState(null);

  const [fertilizerName, setFertilizerName] = useState("");
  const [stage, setStage] = useState("");
  const [lastDate, setLastDate] = useState("");
  const [farmerInterval, setFarmerInterval] = useState("");

  const [recommendation, setRecommendation] = useState(null);
  const [loadingRec, setLoadingRec] = useState(false);
  const [applying, setApplying] = useState(false);

  const [uiMessage, setUiMessage] = useState("");
  const [uiType, setUiType] = useState("success");

  const [availableStages, setAvailableStages] = useState([]);

  const [selectedCrop, setSelectedCrop] = useState("");
  const [fertilizersList, setFertilizersList] = useState([]);

  // ================= LOAD STAGES =================
  useEffect(() => {

  if (!selectedCrop) return;

  fetch("http://localhost:5000/api/recommendation/stages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      crop: selectedCrop
    })
  })
  .then(res => res.json())
  .then(data => {

    if (data.stages) {
      setAvailableStages(data.stages);
      setStage("");
    }

  });

}, [selectedCrop]);

  useEffect(() => {

  if (!selectedCrop) {
    setFertilizersList([]);
    return;
  }

  fetch(`http://localhost:5000/api/recommendation/fertilizers/${selectedCrop}`)
    .then(res => res.json())
    .then(data => {

      if (data.fertilizers) {
        setFertilizersList(data.fertilizers);
      }

    })
    .catch(err => console.error("Fertilizer fetch error:", err));

}, [selectedCrop]);

  // ================= WEATHER =================
  useEffect(() => {

    const fetchWeather = async () => {

      if (!farm?.location) return;

      try {

        const response = await axios.get(
          `https://api.openweathermap.org/data/2.5/weather?q=${farm.location},IN&units=metric&appid=${API_KEY}`
        );

        setWeather(response.data);

      } catch (err) {
        console.error("Weather fetch error:", err);
      }

    };

    fetchWeather();

  }, [farm?.location, API_KEY]);

  // ================= FETCH FARM DATA =================
  useEffect(() => {

    fetch(`http://localhost:5000/api/farm/details/${farmId}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setFarm(data.data);
        }
      });

    fetch(`http://localhost:5000/api/analytics/farm/${farmId}/annual-crop?year=${analyticsYear}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setCropAnalytics(Array.isArray(data.data) ? data.data : []);
        }
      });

    fetch(`http://localhost:5000/api/fertilizer/farm/${farmId}`)
      .then(res => res.json())
      .then(data => {
        setFertilizers(Array.isArray(data) ? data : []);
      });

      fetch(`http://localhost:5000/api/farm/details/${farmId}`)
        .then(res => res.json())
        .then(data => {
          console.log("Farm data:", data);
          if (data.success) {
            setFarm(data.data);
          }
        });

  }, [farmId, analyticsYear]);

  // ================= CALCULATE RECOMMENDATION =================
  const calculateRecommendation = async () => {

    if (!fertilizerName || !stage || !lastDate) {
      setUiMessage("Please fill fertilizer name, stage and last date.");
      setUiType("error");
      return;
    }

    try {

      setLoadingRec(true);

      const res = await fetch(
        "http://localhost:5000/api/recommendation/next-date",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
         body: JSON.stringify({
            crop: selectedCrop,
            stage,
            fertilizer: fertilizerName.toLowerCase(),
            lastDate,
            farmerInterval: farmerInterval ? Number(farmerInterval) : undefined,
            district: farm.location
          })
        }
      );

      const data = await res.json();
      setRecommendation(data);

    } catch (err) {

      console.error(err);
      setUiMessage("Server error while calculating recommendation");

    } finally {

      setLoadingRec(false);

    }
  };

  // ================= APPLY RECOMMENDATION =================
  const applyRecommendation = async () => {

  if (!recommendation) return;

  try {

    setApplying(true);

    const res = await fetch(
      "http://localhost:5000/api/fertilizer/add",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },

        body: JSON.stringify({
          userId: farm.userId,                 // REQUIRED
          farmId: farm._id,
          fertilizerName,
          quantity: 1,
          unit: "kg",
          cropName: farm.cropName,
          appliedDate: new Date(),
          intervalDays: recommendation.usedInterval,
          notes: recommendation.message
        })
      }
    );

    const data = await res.json();

    if (!res.ok) {
      setUiType("error");
      setUiMessage(data.error || "Failed to apply recommendation");
      return;
    }

    setUiType("success");
    setUiMessage("Recommendation applied successfully");

    // refresh fertilizer history
    const historyRes = await fetch(
      `http://localhost:5000/api/fertilizer/farm/${farmId}`
    );

    const historyData = await historyRes.json();
    setFertilizers(historyData);

    setRecommendation(null);

  } catch (err) {

    console.error(err);
    setUiType("error");
    setUiMessage("Server error");

  }

  setApplying(false);
};

  if (!farm) return <p>Loading farm details...</p>;

  return (
    <div className="farm-details-container">
      <button className="back-btn" onClick={() => navigate("/dashboard")}>
        ⬅ Back to Dashboard
      </button>

      {weather && (
        <div className="weather-card">
          <div className="weather-header">
            <h3>🌤 Farm Weather</h3>
            <span className="weather-condition">
              {weather.weather[0].description}
            </span>
          </div>
          <div className="weather-main">
            <div className="temperature">
              {Math.round(weather.main.temp)}°C
            </div>
            <div className="weather-details">
              <p>💧 Humidity: {weather.main.humidity}%</p>
              <p>🌡 Feels Like: {Math.round(weather.main.feels_like)}°C</p>
            </div>
          </div>
        </div>
      )}

      {/* FARM HEADER */}
      <div className="farm-header card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2>{farm.farmName}</h2>
          <button
            onClick={() => navigate(`/farm/${farm._id}/edit`)}
            style={{ padding: "6px 14px", backgroundColor: "#1976d2", color: "white", border: "none", borderRadius: "5px", cursor: "pointer" }}
          >
            ✏️ Edit Farm
          </button>
        </div>
        <div className="farm-meta">
          <p><strong>Location:</strong> {farm.location}</p>
          <p><strong>Area:</strong> {acresToDisplay(farm.areaInAcres, unit).toFixed(2)} {shortLabel(unit)}</p>
          <p><strong>📅 Season:</strong> {(() => {
            const m = new Date().getMonth();
            if (m >= 5 && m <= 8) return "☔ Monsoon (Jun–Sep)";
            if (m >= 9 && m <= 10) return "🍂 Post-Monsoon (Oct–Nov)";
            if (m >= 11 || m <= 1) return "❄️ Winter (Dec–Feb)";
            return "☀️ Summer (Mar–May)";
          })()}</p>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "15px", marginBottom: "10px", borderBottom: "1px solid #ddd", paddingBottom: "5px" }}>
          <h4 style={{ margin: 0 }}>Active Crops</h4>
          <UnitSelector onChange={(u) => setUnit(u)} style={{ backgroundColor: "#f0f4f0", color: "#333", border: "1px solid #ccc" }} />
        </div>

        {/* ====== LAND USAGE BAR ====== */}
        {(() => {
          const today = new Date(); today.setHours(0, 0, 0, 0);
          const usedArea = (farm.crops || []).reduce((sum, c) => {
            if (!c.allocatedArea) return sum;
            if (c.status === "Harvested" || c.status === "Removed") return sum;

            const sown = c.sownDate ? new Date(c.sownDate) : null;
            const harvest = c.expectedHarvestDate ? new Date(c.expectedHarvestDate) : null;
            const removal = c.removalDate ? new Date(c.removalDate) : null;

            if (removal && today >= removal) return sum;

            // Only count as "currently using land" if today is within the crop's active period
            if (sown && harvest) {
              const isActive = today >= sown && today <= harvest;
              return isActive ? sum + c.allocatedArea : sum;
            }
            if (sown && !harvest) {
              const isActive = today >= sown;
              return isActive ? sum + c.allocatedArea : sum;
            }
            // If dates missing, count it (safe fallback)
            return sum + c.allocatedArea;
          }, 0);
          const total = farm.areaInAcres || 0;
          const available = Math.max(0, total - usedArea);
          const usedCapped = Math.min(usedArea, total); // don't show more than 100%
          const usedPct = total > 0 ? Math.min(100, (usedCapped / total) * 100) : 0;
          const barColor = usedPct >= 90 ? "#e53935" : usedPct >= 70 ? "#ff9800" : "#4CAF50";
          return (
            <div style={{ marginBottom: "15px", padding: "12px", backgroundColor: "#f0f4f0", borderRadius: "8px", color: "#333" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px", fontSize: "0.9rem" }}>
                <span><strong>🗺️ Land Usage (Today)</strong></span>
                <span style={{ color: available === 0 ? "#e53935" : "#333" }}>
                  <strong style={{ color: "#4CAF50" }}>{acresToDisplay(usedArea, unit).toFixed(2)} used</strong> / {acresToDisplay(total, unit).toFixed(2)} {shortLabel(unit)} &nbsp;|&nbsp;
                  <strong style={{ color: available === 0 ? "#e53935" : "#1976d2" }}>{acresToDisplay(available, unit).toFixed(2)} available</strong>
                </span>
              </div>
              <div style={{ height: "10px", backgroundColor: "#ddd", borderRadius: "5px", overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${usedPct}%`, backgroundColor: barColor, borderRadius: "5px", transition: "width 0.5s ease" }} />
              </div>
              {available === 0 && <p style={{ color: "#e53935", fontSize: "0.82rem", marginTop: "6px" }}>⚠️ No land available right now — harvest a crop first or add a crop for a future period.</p>}
            </div>
          );
        })()}

        <div style={{ display: "grid", gap: "10px" }}>
          {farm.crops && farm.crops.length > 0 ? farm.crops.map((crop, idx) => (
            <div key={crop._id || idx} style={{ padding: "10px", backgroundColor: "#f9f9f9", borderRadius: "5px", borderLeft: "4px solid #4CAF50", color: "#333" }}>

              {editingCropId === (crop._id || idx) ? (
                // ===== INLINE EDIT FORM =====
                <div className="crop-edit-form">
                  <div className="form-group">
                    <label className="form-label">Crop Name</label>
                    <input
                      className="form-input"
                      value={editForm.name}
                      onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                      placeholder="Enter crop name"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Season</label>
                    <select
                      className="form-select"
                      value={editForm.season}
                      onChange={(e) => setEditForm({ ...editForm, season: e.target.value })}
                    >
                      <option value="Monsoon">Monsoon</option>
                      <option value="Post-Monsoon">Post-Monsoon</option>
                      <option value="Summer">Summer</option>
                      <option value="Winter">Winter</option>
                      <option value="Perennial">Perennial (All-Year)</option>
                    </select>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Sown Date</label>
                      <input
                        type="date"
                        className="form-input"
                        value={editForm.sownDate ? editForm.sownDate.substring(0, 10) : ""}
                        onChange={(e) => setEditForm({ ...editForm, sownDate: e.target.value })}
                      />
                    </div>

                    {editForm.season !== "Perennial" && (
                      <div className="form-group">
                        <label className="form-label">Expected Harvest</label>
                        <input
                          type="date"
                          className="form-input"
                          value={
                            editForm.expectedHarvestDate
                              ? editForm.expectedHarvestDate.substring(0, 10)
                              : ""
                          }
                          onChange={(e) =>
                            setEditForm({ ...editForm, expectedHarvestDate: e.target.value })
                          }
                        />
                      </div>
                    )}
                  </div>

                  <div className="form-group">
                    <label className="form-label">Allocated Area ({shortLabel(unit)})</label>
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      className="form-input"
                      value={editForm.allocatedArea || ""}
                      onChange={(e) => setEditForm({ ...editForm, allocatedArea: e.target.value })}
                      placeholder={`e.g. 1.5 ${shortLabel(unit)}`}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Status</label>
                    <select
                      className="form-select"
                      value={editForm.status}
                      onChange={(e) => {
                        const newStatus = e.target.value;
                        if (newStatus !== "Harvested" && newStatus !== "Removed") {
                          setEditForm({ ...editForm, status: newStatus, removalDate: "" });
                        } else {
                          setEditForm({
                            ...editForm,
                            status: newStatus,
                            removalDate:
                              editForm.removalDate || new Date().toISOString().substring(0, 10),
                          });
                        }
                      }}
                    >
                      <option value="Growing">Growing</option>
                      <option value="Planned">Planned</option>
                      {editForm.season === "Perennial" ? (
                        <option value="Removed">Removed</option>
                      ) : (
                        <>
                          <option value="Harvested">Harvested</option>
                          <option value="Removed">Removed (Crop Failed/Destroyed)</option>
                        </>
                      )}
                    </select>
                  </div>

                  {(editForm.status === "Harvested" || editForm.status === "Removed") && (
                    <div className="form-group">
                      <label className="form-label">
                        {editForm.status === "Removed" ? "Date Removed" : "Date Harvested (Actual)"}
                      </label>
                      <input
                        type="date"
                        className="form-input"
                        value={editForm.removalDate ? editForm.removalDate.substring(0, 10) : ""}
                        onChange={(e) => setEditForm({ ...editForm, removalDate: e.target.value })}
                      />
                    </div>
                  )}

                  <div className="form-actions">
                    <button
                      className="save-btn"
                      onClick={async () => {
                        try {
                          const res = await fetch(
                            `http://localhost:5000/api/farm/${farm._id}/crop/${crop._id}`,
                            {
                              method: "PUT",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify(editForm),
                            }
                          );
                          const data = await res.json();
                          if (data.success) {
                            setFarm(data.data);
                            setEditingCropId(null);
                          } else {
                            alert(data.message || "Failed to save crop.");
                          }
                        } catch {
                          alert("An error occurred while saving the crop.");
                        }
                      }}
                    >
                      💾 Save
                    </button>
                    <button className="cancel-btn" onClick={() => setEditingCropId(null)}>
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                // ===== VIEW MODE =====
                <>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <strong style={{ color: "#222" }}>
                        {formatCropName(crop)}
                      </strong>
                      {crop.season && <span style={{ marginLeft: "10px", fontSize: "0.85rem", color: "#666" }}>({crop.season})</span>}
                    </div>
                    <div style={{ display: "flex", gap: "6px" }}>
                      <button onClick={() => navigate(`/farm/${farm._id}/add-expense?crop=${encodeURIComponent(crop.name)}`)}
                        style={{ padding: "3px 10px", backgroundColor: "#ff9800", color: "white", border: "none", borderRadius: "4px", cursor: "pointer", fontSize: "0.8rem", marginRight: "10px" }} title="Add Expense for this Crop">➕ Expense</button>
                      <button onClick={() => { setEditingCropId(crop._id || idx); setEditForm({ name: crop.name || "", season: crop.season || "", sownDate: crop.sownDate ? new Date(crop.sownDate).toISOString().substring(0, 10) : "", expectedHarvestDate: crop.expectedHarvestDate ? new Date(crop.expectedHarvestDate).toISOString().substring(0, 10) : "", status: crop.status || "Growing", allocatedArea: crop.allocatedArea || "", removalDate: crop.removalDate ? new Date(crop.removalDate).toISOString().substring(0, 10) : "" }); }}
                        style={{ padding: "3px 10px", backgroundColor: "#1976d2", color: "white", border: "none", borderRadius: "4px", cursor: "pointer", fontSize: "0.8rem" }}>✏️</button>
                      <button onClick={async () => {
                        if (!window.confirm(`Remove "${crop.name}" from this farm?`)) return;
                        const res = await fetch(`http://localhost:5000/api/farm/${farm._id}/crop/${crop._id}`, { method: "DELETE" });
                        const data = await res.json();
                        if (data.success) setFarm(data.data);
                      }} style={{ padding: "3px 10px", backgroundColor: "#e53935", color: "white", border: "none", borderRadius: "4px", cursor: "pointer", fontSize: "0.8rem" }}>🗑️</button>
                    </div>
                  </div>
                  <div style={{ marginTop: "5px", fontSize: "0.9rem", display: "flex", justifyContent: "space-between", color: "#444" }}>
                    <span style={{ color: "#444" }}>🌱 Sown: {crop.sownDate ? new Date(crop.sownDate).toLocaleDateString() : 'N/A'}</span>
                    <span style={{ color: "#444" }}>{crop.season === "Perennial" ? "🌴 Crop: Perennial" : `🌾 Harvest: ${crop.expectedHarvestDate ? new Date(crop.expectedHarvestDate).toLocaleDateString() : 'N/A'}`}</span>
                    {crop.allocatedArea > 0 && <span style={{ color: "#555" }}>🗺️ {acresToDisplay(crop.allocatedArea, unit).toFixed(2)} {shortLabel(unit)}</span>}
                    {(() => {
                      const { status, auto } = getEffectiveStatus(crop);
                      const color = status === "Harvested" ? "#ff9800" : status === "Planned" ? "#2196f3" : status === "Removed" ? "#9e9e9e" : "#4CAF50";
                      return (
                        <span style={{ fontWeight: "bold", color }} title={auto ? "Auto-detected from dates" : "Manually set"}>
                          Status: {status} {auto ? "🔄" : ""}
                        </span>
                      );
                    })()}
                  </div>
                </>
              )}
            </div>
          )) : <p>{farm.cropName}</p>}
        </div>
      </div>

      {/* FERTILIZER HISTORY */}
      <div className="card">
        <h3>🌱 Fertilizer History</h3>

        {fertilizers.length === 0 ? (
          <p className="empty-text">No fertilizer records found</p>
        ) : (
          fertilizers.map((f) => {
            const today = new Date();
            let status = "normal";

            if (!f.nextDueDate) status = "no-date";
            else {
              const dueDate = new Date(f.nextDueDate);
              if (dueDate < today) status = "overdue";
              else if (dueDate - today <= 3 * 24 * 60 * 60 * 1000)
                status = "due-soon";
            }

            return (
              <div key={f._id} className="fertilizer-card">
                <div className="fert-header">
                  <span className="fert-name">
                    {f.fertilizerName} – {f.quantity} {f.unit}
                  </span>
                  <span className={`status-badge ${status}`}>
                    {status === "overdue" && "🔴 Overdue"}
                    {status === "due-soon" && "🟡 Due Soon"}
                    {status === "normal" && "🟢 Normal"}
                    {status === "no-date" && "⚠️ No Schedule"}
                  </span>
                </div>

                <p>📅 Applied: {new Date(f.appliedDate).toDateString()}</p>

                {f.nextDueDate && (
                  <p>📅 Next Due: {new Date(f.nextDueDate).toDateString()}</p>
                )}

                {f.notes && <p className="notes">📝 {f.notes}</p>}
              </div>
            );
          })
        )}

        <button
          className="primary-btn"
          onClick={() => navigate(`/add-fertilizer?farmId=${farm._id}`)}
        >
          ➕ Add Fertilizer
        </button>
      </div>

      {/* EXPENSE & INCOME SECTION */}
      <div className="card analytics-card">
        <h3>💰 Financials</h3>
        <p>Manage expenses and income records for this farm.</p>
        <div className="btn-group">
          <button onClick={() => navigate(`/farm/${farm._id}/expenses`)}>
            View Expenses
          </button>
          <button onClick={() => navigate(`/farm/${farm._id}/add-expense`)}>
            ➕ Add Expense
          </button>
          <button onClick={() => navigate(`/farm/${farm._id}/income`)}>
            View Income
          </button>
          <button className="add-income-btn" onClick={() => navigate(`/farm/${farmId}/income/add`)}>
            + Add Income
          </button>
        </div>
      </div>

      {/* ANNUAL CROP ANALYTICS SECTION */}
      <div className="card crop-analytics-card" style={{ marginTop: "20px", width: "100%" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <div>
            <h3 style={{ margin: 0 }}>📊 Annual Crop Profitability ({analyticsYear})</h3>
            <p style={{ margin: "4px 0 0 0", fontSize: "0.85rem", color: "#64748b" }}>Income vs Expense comparison per crop</p>
          </div>
          <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
            {/* View Toggle */}
            <div className="fi-toggle-group" style={{ margin: 0 }}>
              <button
                className={`fi-toggle-btn ${!showTable ? "active" : ""}`}
                onClick={() => setShowTable(false)}
                style={{ padding: "6px 12px", fontSize: "0.8rem" }}
              >📈 Chart</button>
              <button
                className={`fi-toggle-btn ${showTable ? "active" : ""}`}
                onClick={() => setShowTable(true)}
                style={{ padding: "6px 12px", fontSize: "0.8rem" }}
              >📋 Table</button>
            </div>

            <select
              value={analyticsYear}
              onChange={(e) => setAnalyticsYear(Number(e.target.value))}
              className="fi-select"
              style={{ padding: "5px 10px", fontSize: "0.85rem" }}
            >
              {[0, 1, 2, 3, 4].map(offset => {
                const year = new Date().getFullYear() - offset;
                return <option key={year} value={year}>{year}</option>
              })}
            </select>
          </div>
        </div>

        {cropAnalytics.length === 0 ? (
          <div style={{ padding: "40px", textAlign: "center", color: "#64748b", background: "#0f172a", borderRadius: "12px", border: "1px dashed #334155" }}>
            <p style={{ margin: 0 }}>📭 No income or expenses recorded for <strong>{analyticsYear}</strong>.</p>
          </div>
        ) : showTable ? (
          <div className="fi-table-wrap" style={{ animation: "fiSlideDown 0.3s ease-out" }}>
            <table className="fi-table">
              <thead>
                <tr>
                  <th>Crop / Category</th>
                  <th style={{ color: "#4ade80" }}>Income (₹)</th>
                  <th style={{ color: "#f87171" }}>Expense (₹)</th>
                  <th>Net Profit (₹)</th>
                </tr>
              </thead>
              <tbody>
                {cropAnalytics.map((stat, idx) => (
                  <tr key={idx}>
                    <td><strong>{formatCropName(stat.cropName)}</strong></td>
                    <td className="fi-amount">₹{stat.income.toLocaleString()}</td>
                    <td style={{ color: "#f87171" }}>₹{stat.expense.toLocaleString()}</td>
                    <td style={{ color: stat.profit >= 0 ? "#4ade80" : "#f87171", fontWeight: "bold" }}>
                      {stat.profit >= 0 ? "+" : ""}₹{stat.profit.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ height: "350px", width: "100%", marginTop: "10px", animation: "fiSlideDown 0.3s ease-out" }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={cropAnalytics.map(s => ({ ...s, name: formatCropName(s.cropName) }))}
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                barGap={8}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis
                  dataKey="name"
                  stroke="#94a3b8"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  dy={10}
                />
                <YAxis
                  stroke="#94a3b8"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `₹${value}`}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: '#1e293b', opacity: 0.4 }} />
                <Legend
                  verticalAlign="top"
                  align="right"
                  wrapperStyle={{ paddingBottom: '20px', fontSize: '12px' }}
                />
                <Bar
                  dataKey="income"
                  name="Income"
                  fill="#22c55e"
                  radius={[4, 4, 0, 0]}
                  barSize={30}
                />
                <Bar
                  dataKey="expense"
                  name="Expense"
                  fill="#ef4444"
                  radius={[4, 4, 0, 0]}
                  barSize={30}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* FERTILIZER RECOMMENDATION */}
    <div className="card recommendation-card">

      <h3 className="section-title">📊 Fertilizer Recommendation</h3>

      <div className="rec-form">

        {/* SELECT CROP */}
        <select
          value={selectedCrop}
          onChange={(e) => setSelectedCrop(e.target.value)}
        >
          <option value="">Select Crop</option>

          {farm?.crops?.map((crop) => (
            <option key={crop._id} value={crop.name}>
              {crop.name.charAt(0).toUpperCase() + crop.name.slice(1)}
            </option>
          ))}

        </select>


        {/* SELECT STAGE */}
        <select
          value={stage}
          disabled={!selectedCrop}
          onChange={(e) => setStage(e.target.value)}
        >
          <option value="">Select Crop Stage</option>

          {availableStages.map((s) => (
            <option key={s} value={s}>
              {s.replace("_", " ").toUpperCase()}
            </option>
          ))}

        </select>


        {/* SELECT FERTILIZER */}
        <select
          value={fertilizerName}
          disabled={!stage}
          onChange={(e) => setFertilizerName(e.target.value)}
        >
          <option value="">Select Fertilizer</option>

          {fertilizersList.map((fert) => (
            <option key={fert} value={fert}>
              {fert.replace(/_/g, " ").toUpperCase()}
            </option>
          ))}

        </select>


        {/* LAST APPLICATION DATE */}
        <input
          type="date"
          value={lastDate}
          onChange={(e) => setLastDate(e.target.value)}
        />


        {/* OPTIONAL FARMER INTERVAL */}
        <input
          type="number"
          placeholder="Farmer Interval (optional)"
          value={farmerInterval}
          onChange={(e) => setFarmerInterval(e.target.value)}
        />

      </div>


      {/* CALCULATE BUTTON */}
      <button
        className="primary-btn full-width"
        onClick={calculateRecommendation}
      >
        {loadingRec ? "Calculating..." : "Calculate Next Fertilizer"}
      </button>


      {/* RESULT DISPLAY */}
      {recommendation && (

        <div className="recommendation-result">

          <div className="result-row">
            <span>📅 Next Date</span>
            <strong>{recommendation.nextDate}</strong>
          </div>

          <div className="result-row">
            <span>⏱ Final Interval Used</span>
            <strong>{recommendation.usedInterval} days</strong>
          </div>

          <hr style={{ margin: "10px 0", opacity: 0.2 }} />

          <p><strong>📊 Interval Breakdown</strong></p>

          <p>
            🌾 Crop Stage Interval: {recommendation.cropInterval} days
          </p>

          <p>
            🧪 Fertilizer Minimum Interval: {recommendation.fertilizerInterval} days
          </p>

          <p>
            🛡 Base Safe Interval: {recommendation.baseInterval} days
          </p>

          {recommendation.farmerInterval && (
            <p>
              👨‍🌾 Farmer Requested: {recommendation.farmerInterval} days
            </p>
          )}

          <p>
            📌 Decision: {recommendation.message}
          </p>

          <div className="result-row">
            <span>🌦 Weather</span>
            <strong>{recommendation.weatherStatus}</strong>
          </div>

          {/*{recommendation.weatherReason && (
            <p style={{ fontSize: "0.85rem", opacity: 0.8 }}>
              Reason: {recommendation.weatherReason}
            </p>
          )}*/}


          {/* APPLY RECOMMENDATION */}
          <button
            className="primary-btn"
            onClick={applyRecommendation}
            disabled={applying}
          >
            {applying ? "Applying..." : "✅ Apply Recommendation"}
          </button>

    </div>

  )}

</div>


{/* UI MESSAGE */}
{uiMessage && (
  <div className={`alert ${uiType}`}>
    {uiMessage}
  </div>
)}


{/* YIELD PREDICTION BUTTON */}
<button
  className="predict-btn"
  style={{ marginTop: "20px" }}
  onClick={() => navigate(`/farm/${farm._id}/yield`)}
>
  📈 Predict Yield
</button>

    </div>
  );
}

export default function FarmDetailsWrapper(props) {
  return (
    <ErrorBoundary>
      <FarmDetails {...props} />
    </ErrorBoundary>
  );
}