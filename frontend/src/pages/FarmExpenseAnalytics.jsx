import { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { formatCropName } from "../utils/areaUtils";
import "./FarmExpenseAnalytics.css";
import CategoryExpenseBarChart from "../components/charts/CategoryExpenseBarChart";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const categoryColors = {
  Labor: "#f59e0b",
  Fertilizer: "#22c55e",
  Seeds: "#3b82f6",
  Pesticide: "#ef4444",
  Irrigation: "#06b6d4",
  Equipment: "#8b5cf6",
  Transport: "#f97316",
  Other: "#94a3b8",
};

const FarmExpenseAnalytics = () => {
  const { farmId } = useParams();
  const [allExpenses, setAllExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // ── Filter state ──────────────────────────────────────────────
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedMonth, setSelectedMonth] = useState("all"); // "all" | 0-11
  const [viewMode, setViewMode] = useState("monthly"); // "monthly" | "annual"

  // ── Available years from data ─────────────────────────────────
  const availableYears = useMemo(() => {
    const years = new Set(
      allExpenses.map(e => new Date(e.expenseDate).getFullYear())
    );
    // Always include current year
    years.add(currentYear);
    return [...years].sort((a, b) => b - a);
  }, [allExpenses, currentYear]);

  useEffect(() => {
    fetch(`http://localhost:5000/api/expenses/farm/${farmId}`)
      .then(res => res.json())
      .then(data => {
        setAllExpenses(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [farmId]);

  // ── Filter expenses based on selected period ──────────────────
  const expenses = useMemo(() => {
    return allExpenses.filter(exp => {
      const d = new Date(exp.expenseDate);
      if (d.getFullYear() !== selectedYear) return false;
      if (selectedMonth !== "all" && d.getMonth() !== Number(selectedMonth)) return false;
      return true;
    });
  }, [allExpenses, selectedYear, selectedMonth]);

  // ── Category data for chart (filtered) ───────────────────────
  const categoryData = useMemo(() => {
    const map = {};
    expenses.forEach(exp => {
      const cat = exp.category || "Other";
      map[cat] = (map[cat] || 0) + Number(exp.amount || 0);
    });
    return Object.entries(map).map(([category, total]) => ({ category, total }));
  }, [expenses]);

  // ── Monthly breakdown for "annual" view ──────────────────────
  const monthlyBreakdown = useMemo(() => {
    if (viewMode !== "annual") return [];
    const map = Array.from({ length: 12 }, (_, i) => ({ month: MONTHS[i], total: 0, count: 0 }));
    allExpenses
      .filter(e => new Date(e.expenseDate).getFullYear() === selectedYear)
      .forEach(e => {
        const m = new Date(e.expenseDate).getMonth();
        map[m].total += Number(e.amount || 0);
        map[m].count += 1;
      });
    return map;
  }, [allExpenses, selectedYear, viewMode]);

  const totalExpense = expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this expense?")) return;
    await fetch(`http://localhost:5000/api/expenses/${id}`, { method: "DELETE" });
    setAllExpenses(prev => prev.filter(e => e._id !== id));
  };

  // Group filtered expenses by crop
  const grouped = useMemo(() => {
    return expenses.reduce((acc, exp) => {
      const crop = exp.cropName || "Farm Wide";
      if (!acc[crop]) acc[crop] = [];
      acc[crop].push(exp);
      return acc;
    }, {});
  }, [expenses]);

  const periodLabel = selectedMonth === "all"
    ? `Year ${selectedYear}`
    : `${MONTHS[Number(selectedMonth)]} ${selectedYear}`;

  return (
    <div className="fea-container">
      <button className="fea-back-btn" onClick={() => navigate(`/farm/${farmId}`)}>
        ⬅ Back to Farm
      </button>

      {/* ── Header ── */}
      <div className="fea-header">
        <div>
          <h1 className="fea-title">💰 Farm Expense Analytics</h1>
          <p className="fea-subtitle">Viewing: <strong style={{ color: "#22c55e" }}>{periodLabel}</strong></p>
        </div>
        <button className="fea-add-btn" onClick={() => navigate(`/farm/${farmId}/add-expense`)}>
          ➕ Add Expense
        </button>
      </div>

      {/* ── Filter Bar ── */}
      <div className="fea-filter-bar">
        {/* View Mode Toggle */}
        <div className="fea-toggle-group">
          <button
            className={`fea-toggle-btn ${viewMode === "monthly" ? "active" : ""}`}
            onClick={() => setViewMode("monthly")}
          >📋 Detailed</button>
          <button
            className={`fea-toggle-btn ${viewMode === "annual" ? "active" : ""}`}
            onClick={() => { setViewMode("annual"); setSelectedMonth("all"); }}
          >📅 Annual Overview</button>
        </div>

        {/* Year Selector */}
        <div className="fea-filter-group">
          <label className="fea-filter-label">Year</label>
          <select
            className="fea-select"
            value={selectedYear}
            onChange={e => setSelectedYear(Number(e.target.value))}
          >
            {availableYears.map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>

        {/* Month Selector (only in Detailed mode) */}
        {viewMode === "monthly" && (
          <div className="fea-filter-group">
            <label className="fea-filter-label">Month</label>
            <select
              className="fea-select"
              value={selectedMonth}
              onChange={e => setSelectedMonth(e.target.value)}
            >
              <option value="all">All Months</option>
              {MONTHS.map((m, i) => (
                <option key={i} value={i}>{m}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* ── Summary Bar ── */}
      <div className="fea-summary-bar">
        <div className="fea-summary-item">
          <span className="fea-summary-label">Total Expenses</span>
          <span className="fea-summary-value red">₹ {totalExpense.toLocaleString()}</span>
        </div>
        <div className="fea-summary-item">
          <span className="fea-summary-label">Crops Tracked</span>
          <span className="fea-summary-value">{Object.keys(grouped).length}</span>
        </div>
        <div className="fea-summary-item">
          <span className="fea-summary-label">Total Entries</span>
          <span className="fea-summary-value">{expenses.length}</span>
        </div>
        <div className="fea-summary-item">
          <span className="fea-summary-label">Avg per Entry</span>
          <span className="fea-summary-value">
            {expenses.length > 0 ? `₹ ${Math.round(totalExpense / expenses.length).toLocaleString()}` : "—"}
          </span>
        </div>
      </div>

      {/* ── Annual Monthly Breakdown View ── */}
      {viewMode === "annual" && (
        <div className="fea-chart-card" style={{ marginBottom: "24px" }}>
          <h3 className="fea-section-title">📅 Monthly Expense Breakdown — {selectedYear}</h3>
          <div className="fea-month-grid">
            {monthlyBreakdown.map((m, i) => (
              <div
                key={i}
                className={`fea-month-cell ${m.total > 0 ? "has-data" : ""}`}
                onClick={() => { if (m.total > 0) { setViewMode("monthly"); setSelectedMonth(i); } }}
                title={m.total > 0 ? `Click to view ${m.month} details` : ""}
              >
                <span className="fea-month-name">{m.month.slice(0, 3)}</span>
                <span className="fea-month-total">
                  {m.total > 0 ? `₹ ${m.total.toLocaleString()}` : "—"}
                </span>
                {m.count > 0 && <span className="fea-month-count">{m.count} entry{m.count > 1 ? "s" : ""}</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Category Chart ── */}
      {categoryData.length > 0 && (
        <div className="fea-chart-card">
          <h3 className="fea-section-title">📊 Category-wise Breakdown — {periodLabel}</h3>
          <CategoryExpenseBarChart data={categoryData} />
        </div>
      )}

      {/* ── Crop-wise Tables ── */}
      {loading ? (
        <p className="fea-empty">Loading...</p>
      ) : expenses.length === 0 ? (
        <div className="fea-empty-card">
          <p>📭 No expenses recorded for <strong>{periodLabel}</strong>.</p>
          <button className="fea-add-btn" onClick={() => navigate(`/farm/${farmId}/add-expense`)}>
            ➕ Add Expense
          </button>
        </div>
      ) : viewMode === "monthly" ? (
        <div className="fea-crop-list">
          {Object.entries(grouped)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([cropName, cropExpenses]) => {
              const cropTotal = cropExpenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
              return (
                <div key={cropName} className="fea-crop-card">
                  <div className="fea-crop-header">
                    <span className="fea-crop-name">🌱 {formatCropName(cropName)}</span>
                    <span className="fea-crop-total">Total: ₹ {cropTotal.toLocaleString()}</span>
                  </div>
                  <div className="fea-table-wrap">
                    <table className="fea-table">
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Title</th>
                          <th>Category</th>
                          <th>Amount (₹)</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {cropExpenses.map(exp => (
                          <tr key={exp._id}>
                            <td>{new Date(exp.expenseDate).toLocaleDateString("en-IN")}</td>
                            <td>{exp.title}</td>
                            <td>
                              <span
                                className="fea-badge"
                                style={{
                                  backgroundColor: (categoryColors[exp.category] || "#94a3b8") + "22",
                                  color: categoryColors[exp.category] || "#94a3b8",
                                  borderColor: categoryColors[exp.category] || "#94a3b8",
                                }}
                              >
                                {exp.category}
                              </span>
                            </td>
                            <td className="fea-amount">₹ {Number(exp.amount).toLocaleString()}</td>
                            <td className="fea-actions">
                              <button className="fea-edit-btn" onClick={() => navigate(`/expenses/edit/${exp._id}`)} title="Edit">✏️</button>
                              <button className="fea-delete-btn" onClick={() => handleDelete(exp._id)} title="Delete">🗑️</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
        </div>
      ) : null}
    </div>
  );
};

export default FarmExpenseAnalytics;
