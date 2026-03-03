import { useEffect, useState } from "react";
import { getPreferredUnit, acresToDisplay, shortLabel, formatCropName } from "../utils/areaUtils";
import { useNavigate } from "react-router-dom";
import FertilizerStatusChart from "../components/charts/FertilizerStatusChart";
import ProfitPerFarmChart from "../components/charts/ProfitPerFarmChart";
import FarmUsageChart from "../components/charts/FarmUsageChart";
import ExpensePie from "../components/charts/ExpensePie";
import "./Dashboard.css";

function Dashboard() {
  const [farms, setFarms] = useState([]);
  const [profitData, setProfitData] = useState([]);
  const [expenseCategoryData, setExpenseCategoryData] = useState([]);
  const [farmUsageData, setFarmUsageData] = useState([]);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const [summary, setSummary] = useState({
    totalFarms: 0,
    totalFertilizers: 0,
    overdue: 0,
    dueSoon: 0,
  });

  const navigate = useNavigate();

  // ==============================
  // FETCH FARMS + FERTILIZER SUMMARY
  // ==============================
  useEffect(() => {
    const userId = localStorage.getItem("userId");

    if (!userId) {
      navigate("/");
      return;
    }

    fetch(`http://localhost:5000/api/farm/${userId}`)
      .then((res) => res.json())
      .then(async (data) => {
        if (!data.success) return;

        setFarms(data.data);

        let totalFertilizers = 0;
        let overdue = 0;
        let dueSoon = 0;
        const today = new Date();

        const usageArray = [];

        for (const farm of data.data) {
          const res = await fetch(
            `http://localhost:5000/api/fertilizer/farm/${farm._id}`
          );
          const fertilizers = await res.json();

          totalFertilizers += fertilizers.length;

          usageArray.push({
            farm: farm.farmName,
            count: fertilizers.length,
          });

          fertilizers.forEach((f) => {
            if (!f.nextDueDate) return;

            const due = new Date(f.nextDueDate);

            if (due < today) overdue++;
            else if (due - today <= 3 * 24 * 60 * 60 * 1000) dueSoon++;
          });
        }

        setFarmUsageData(usageArray);

        setSummary({
          totalFarms: data.data.length,
          totalFertilizers,
          overdue,
          dueSoon,
        });
      })
      .catch((err) => console.error(err));
  }, [navigate]);

  // ==============================
  // FETCH PROFIT DATA (ALL FARMS)
  // ==============================
  useEffect(() => {
    const userId = localStorage.getItem("userId");
    if (!userId) return;

    fetch(`http://localhost:5000/api/analytics/dashboard/profit/${userId}?year=${selectedYear}`)
      .then((res) => res.json())
      .then((result) => {
        if (result.success) {
          setProfitData(result.data);
        }
      })
      .catch((err) => console.error(err));
  }, [selectedYear]);

  // ==============================
  // FETCH EXPENSE CATEGORY DATA (ALL FARMS)
  // ==============================
  useEffect(() => {
    const userId = localStorage.getItem("userId");
    if (!userId) return;

    fetch(`http://localhost:5000/api/analytics/dashboard/expenses/${userId}?year=${selectedYear}`)
      .then((res) => res.json())
      .then((result) => {
        if (result.success) {
          setExpenseCategoryData(result.data);
        }
      })
      .catch((err) => console.error(err));
  }, [selectedYear]);

  const username = localStorage.getItem("username") || "Farmer";

  return (
    <div className="dashboard-container">
      {/* HEADER */}
      <div className="dashboard-header">
        <h1>🌾 {username}'s Dashboard</h1>
        <p className="subtitle">
          Overview of your farms, expenses & fertilizers
        </p>
      </div>

      {/* SUMMARY CARDS */}
      <div className="summary-grid">
        <div className="summary-card">
          <span className="icon">📁</span>
          <div>
            <p className="label">Farms</p>
            <h2>{summary.totalFarms}</h2>
          </div>
        </div>

        <div className="summary-card">
          <span className="icon">🌱</span>
          <div>
            <p className="label">Fertilizers</p>
            <h2>{summary.totalFertilizers}</h2>
          </div>
        </div>

        <div className="summary-card danger">
          <span className="icon">🔴</span>
          <div>
            <p className="label">Overdue</p>
            <h2>{summary.overdue}</h2>
          </div>
        </div>

        <div className="summary-card warning">
          <span className="icon">🟡</span>
          <div>
            <p className="label">Due Soon</p>
            <h2>{summary.dueSoon}</h2>
          </div>
        </div>
      </div>

      {/* ANALYTICS */}
      <section className="analytics-section">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <h2 className="section-title" style={{ margin: 0 }}>📊 Analytics Overview</h2>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ fontSize: "0.85rem", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>Analysis Year:</span>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              style={{
                background: "#1e293b",
                color: "#f1f5f9",
                border: "1px solid #334155",
                borderRadius: "6px",
                padding: "4px 10px",
                fontSize: "0.9rem",
                cursor: "pointer",
                outline: "none"
              }}
            >
              {[2024, 2025, 2026].map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="charts-grid">
          <div className="chart-card">
            <h3>Fertilizer Status</h3>
            <FertilizerStatusChart summary={summary} />
          </div>

          <div
            className="chart-card clickable"
            onClick={() => navigate("/expenses")}
          >
            <h3>Expense Breakdown</h3>
            <ExpensePie data={expenseCategoryData} />
            <p className="hint">Click to view detailed expenses</p>
          </div>

          <div className="chart-card">
            <h3>Profit Per Farm</h3>
            <ProfitPerFarmChart data={profitData} />
          </div>

          <div className="chart-card">
            <h3>Fertilizer Usage</h3>
            <FarmUsageChart data={farmUsageData} />
          </div>
        </div>
      </section>

      {/* FARMS */}
      <section className="farms-section">
        <h2 className="section-title">🌾 Your Farms</h2>

        {farms.length === 0 ? (
          <p className="no-data">No farm data available</p>
        ) : (
          <div className="farm-grid">
            {farms.map((farm) => (
              <div key={farm._id} style={{ position: "relative" }}>
                {/* Clickable farm card */}
                <div
                  className="farm-card"
                  onClick={() => navigate(`/farm/${farm._id}`)}
                >
                  <h4>{farm.farmName}</h4>
                  <p style={{ fontSize: "0.8rem", color: "#8fbc8f", margin: "2px 0 6px" }}>📍 {farm.location}</p>
                  <p>{farm.crops && farm.crops.length > 0
                    ? farm.crops.map(c => formatCropName(c)).join(", ")
                    : formatCropName(farm.cropName)}</p>
                  <span className="view-link">View →</span>
                </div>

                {/* Delete button placed outside clickable card to avoid event conflicts */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (window.confirm(`Delete farm "${farm.farmName}"? This cannot be undone.`)) {
                      fetch(`http://localhost:5000/api/farm/${farm._id}`, { method: "DELETE" })
                        .then(res => res.json())
                        .then(data => {
                          if (data.success) setFarms(prev => prev.filter(f => f._id !== farm._id));
                          else alert("Failed to delete farm");
                        })
                        .catch(() => alert("Server error while deleting"));
                    }
                  }}
                  style={{
                    position: "absolute",
                    bottom: "14px",
                    right: "14px",
                    padding: "4px 12px",
                    backgroundColor: "#e53935",
                    color: "white",
                    border: "none",
                    borderRadius: "5px",
                    cursor: "pointer",
                    fontSize: "0.78rem",
                    fontWeight: "600",
                    zIndex: 10
                  }}
                >
                  🗑️ Delete
                </button>
              </div>
            ))}
          </div>
        )}

        <button
          className="primary-btn add-farm-btn"
          onClick={() => navigate("/add-farm")}
        >
          ➕ Add New Farm
        </button>
      </section>
    </div>
  );
}

export default Dashboard;