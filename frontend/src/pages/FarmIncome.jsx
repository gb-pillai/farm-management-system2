import { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { formatCropName } from "../utils/areaUtils";
import axios from "axios";
import "./FarmIncome.css";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

function FarmIncome() {
  const { farmId } = useParams();
  const navigate = useNavigate();

  const [allIncome, setAllIncome] = useState([]);
  const [allExpenses, setAllExpenses] = useState([]);
  const [loading, setLoading] = useState(true);

  // ── Filter state ──────────────────────────────────────────────
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedMonth, setSelectedMonth] = useState("all");
  const [viewMode, setViewMode] = useState("monthly"); // "monthly" | "annual"

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [incomeRes, expenseRes] = await Promise.all([
          axios.get(`http://localhost:5000/api/income/farm/${farmId}`),
          axios.get(`http://localhost:5000/api/expenses/farm/${farmId}`),
        ]);
        setAllIncome(Array.isArray(incomeRes.data) ? incomeRes.data : []);
        setAllExpenses(Array.isArray(expenseRes.data) ? expenseRes.data : []);
      } catch (error) {
        console.error("Error fetching income data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [farmId]);

  // ── Available years ───────────────────────────────────────────
  const availableYears = useMemo(() => {
    const years = new Set([
      ...allIncome.map(i => new Date(i.soldDate).getFullYear()),
      ...allExpenses.map(e => new Date(e.expenseDate).getFullYear()),
      currentYear,
    ]);
    return [...years].sort((a, b) => b - a);
  }, [allIncome, allExpenses, currentYear]);

  // ── Filtered income ───────────────────────────────────────────
  const income = useMemo(() => allIncome.filter(i => {
    const d = new Date(i.soldDate);
    if (d.getFullYear() !== selectedYear) return false;
    if (selectedMonth !== "all" && d.getMonth() !== Number(selectedMonth)) return false;
    return true;
  }), [allIncome, selectedYear, selectedMonth]);

  // ── Filtered expenses (same period for profit calc) ───────────
  const expenses = useMemo(() => allExpenses.filter(e => {
    const d = new Date(e.expenseDate);
    if (d.getFullYear() !== selectedYear) return false;
    if (selectedMonth !== "all" && d.getMonth() !== Number(selectedMonth)) return false;
    return true;
  }), [allExpenses, selectedYear, selectedMonth]);

  // ── Totals ────────────────────────────────────────────────────
  const totalIncome = income.reduce((s, i) => s + Number(i.totalAmount || 0), 0);
  const totalExpense = expenses.reduce((s, e) => s + Number(e.amount || 0), 0);
  const netProfit = totalIncome - totalExpense;

  // ── Annual monthly breakdown ──────────────────────────────────
  const monthlyBreakdown = useMemo(() => {
    if (viewMode !== "annual") return [];
    const map = Array.from({ length: 12 }, (_, i) => ({
      month: MONTHS[i], income: 0, expense: 0, count: 0
    }));
    allIncome
      .filter(i => new Date(i.soldDate).getFullYear() === selectedYear)
      .forEach(i => { const m = new Date(i.soldDate).getMonth(); map[m].income += Number(i.totalAmount || 0); map[m].count++; });
    allExpenses
      .filter(e => new Date(e.expenseDate).getFullYear() === selectedYear)
      .forEach(e => { const m = new Date(e.expenseDate).getMonth(); map[m].expense += Number(e.amount || 0); });
    return map;
  }, [allIncome, allExpenses, selectedYear, viewMode]);

  // ── Group income by crop ──────────────────────────────────────
  const grouped = useMemo(() => income.reduce((acc, item) => {
    const crop = item.cropName || "Other";
    if (!acc[crop]) acc[crop] = [];
    acc[crop].push(item);
    return acc;
  }, {}), [income]);

  const periodLabel = selectedMonth === "all"
    ? `Year ${selectedYear}`
    : `${MONTHS[Number(selectedMonth)]} ${selectedYear}`;

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this income record?")) return;
    await axios.delete(`http://localhost:5000/api/income/${id}`);
    setAllIncome(prev => prev.filter(i => i._id !== id));
  };

  return (
    <div className="fi-container">
      <button className="fi-back-btn" onClick={() => navigate(`/farm/${farmId}`)}>
        ⬅ Back to Farm
      </button>

      {/* ── Header ── */}
      <div className="fi-header">
        <div>
          <h1 className="fi-title">📈 Farm Income Overview</h1>
          <p className="fi-subtitle">Viewing: <strong style={{ color: "#22c55e" }}>{periodLabel}</strong></p>
        </div>
        <button className="fi-add-btn" onClick={() => navigate(`/farm/${farmId}/income/add`)}>
          ➕ Add Income
        </button>
      </div>

      {/* ── Filter Bar ── */}
      <div className="fi-filter-bar">
        <div className="fi-toggle-group">
          <button className={`fi-toggle-btn ${viewMode === "monthly" ? "active" : ""}`} onClick={() => setViewMode("monthly")}>
            📋 Detailed
          </button>
          <button className={`fi-toggle-btn ${viewMode === "annual" ? "active" : ""}`} onClick={() => { setViewMode("annual"); setSelectedMonth("all"); }}>
            📅 Annual Overview
          </button>
        </div>

        <div className="fi-filter-group">
          <label className="fi-filter-label">Year</label>
          <select className="fi-select" value={selectedYear} onChange={e => setSelectedYear(Number(e.target.value))}>
            {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>

        {viewMode === "monthly" && (
          <div className="fi-filter-group">
            <label className="fi-filter-label">Month</label>
            <select className="fi-select" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)}>
              <option value="all">All Months</option>
              {MONTHS.map((m, i) => <option key={i} value={i}>{m}</option>)}
            </select>
          </div>
        )}
      </div>

      {/* ── Summary Bar ── */}
      <div className="fi-summary-bar">
        <div className="fi-summary-item">
          <span className="fi-summary-label">Total Income</span>
          <span className="fi-summary-value green">₹ {totalIncome.toLocaleString()}</span>
        </div>
        <div className="fi-summary-item">
          <span className="fi-summary-label">Total Expenses</span>
          <span className="fi-summary-value red">₹ {totalExpense.toLocaleString()}</span>
        </div>
        <div className="fi-summary-item">
          <span className="fi-summary-label">Net Profit</span>
          <span className={`fi-summary-value ${netProfit >= 0 ? "green" : "red"}`}>
            {netProfit >= 0 ? "+" : ""}₹ {netProfit.toLocaleString()}
          </span>
        </div>
        <div className="fi-summary-item">
          <span className="fi-summary-label">Crops with Sales</span>
          <span className="fi-summary-value">{Object.keys(grouped).length}</span>
        </div>
      </div>

      {/* ── Annual Monthly Grid ── */}
      {viewMode === "annual" && (
        <div className="fi-chart-card">
          <h3 className="fi-section-title">📅 Monthly Income vs Expense — {selectedYear}</h3>
          <div className="fi-month-grid">
            {monthlyBreakdown.map((m, i) => {
              const profit = m.income - m.expense;
              const hasData = m.income > 0 || m.expense > 0;
              return (
                <div
                  key={i}
                  className={`fi-month-cell ${hasData ? "has-data" : ""} ${profit < 0 ? "loss" : profit > 0 ? "profit" : ""}`}
                  onClick={() => { if (hasData) { setViewMode("monthly"); setSelectedMonth(i); } }}
                  title={hasData ? `Click to view ${m.month} details` : ""}
                >
                  <span className="fi-month-name">{m.month.slice(0, 3)}</span>
                  {m.income > 0 && <span className="fi-month-income">↑ ₹{m.income.toLocaleString()}</span>}
                  {m.expense > 0 && <span className="fi-month-expense">↓ ₹{m.expense.toLocaleString()}</span>}
                  {hasData && (
                    <span className={`fi-month-profit ${profit >= 0 ? "pos" : "neg"}`}>
                      {profit >= 0 ? "+" : ""}₹{profit.toLocaleString()}
                    </span>
                  )}
                  {!hasData && <span className="fi-month-empty">—</span>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Income Records Table ── */}
      {loading ? (
        <p className="fi-empty">Loading...</p>
      ) : income.length === 0 ? (
        <div className="fi-empty-card">
          <p>📭 No income recorded for <strong>{periodLabel}</strong>.</p>
          <button className="fi-add-btn" onClick={() => navigate(`/farm/${farmId}/income/add`)}>➕ Add Income</button>
        </div>
      ) : viewMode === "monthly" ? (
        <div className="fi-crop-list">
          {Object.entries(grouped)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([cropName, records]) => {
              const cropTotal = records.reduce((s, r) => s + Number(r.totalAmount || 0), 0);
              // Expenses for this crop in this period
              const cropExpense = expenses
                .filter(e => e.cropName === cropName)
                .reduce((s, e) => s + Number(e.amount || 0), 0);
              const cropProfit = cropTotal - cropExpense;
              return (
                <div key={cropName} className="fi-crop-card">
                  <div className="fi-crop-header">
                    <span className="fi-crop-name">🌱 {formatCropName(cropName)}</span>
                    <div className="fi-crop-stats">
                      <span className="fi-crop-income">Income: ₹ {cropTotal.toLocaleString()}</span>
                      {cropExpense > 0 && <span className="fi-crop-expense">Exp: ₹ {cropExpense.toLocaleString()}</span>}
                      <span className={`fi-crop-profit ${cropProfit >= 0 ? "pos" : "neg"}`}>
                        {cropProfit >= 0 ? "+" : ""}₹ {cropProfit.toLocaleString()}
                      </span>
                    </div>
                  </div>
                  <div className="fi-table-wrap">
                    <table className="fi-table">
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Qty</th>
                          <th>Price/Unit</th>
                          <th>Total (₹)</th>
                          <th>Notes</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {records.map(item => (
                          <tr key={item._id}>
                            <td>{new Date(item.soldDate).toLocaleDateString("en-IN")}</td>
                            <td>{item.quantity} {item.unit || "kg"}</td>
                            <td>₹ {Number(item.pricePerUnit).toLocaleString()}</td>
                            <td className="fi-amount">₹ {Number(item.totalAmount).toLocaleString()}</td>
                            <td className="fi-notes">{item.notes || "—"}</td>
                            <td className="fi-actions">
                              <button className="fi-edit-btn" onClick={() => navigate(`/income/edit/${item._id}`)} title="Edit">✏️</button>
                              <button className="fi-delete-btn" onClick={() => handleDelete(item._id)} title="Delete">🗑️</button>
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
}

export default FarmIncome;
