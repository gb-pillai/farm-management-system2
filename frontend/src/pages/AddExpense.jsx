import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import { formatCropName } from "../utils/areaUtils";
import "./AddExpense.css";

const AddExpense = () => {
  const { farmId: routeFarmId, id } = useParams(); // id = expenseId (edit)
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const initialCrop = queryParams.get("crop") || "";

  const isEdit = Boolean(id);
  const navigate = useNavigate();

  const [form, setForm] = useState({
    title: "",
    category: "Fertilizer",
    amount: "",
    expenseDate: "",
    notes: "",
    farmId: routeFarmId || "",
    cropName: initialCrop, // ✅ Default to query param
    isCalculated: false,
    rate: "",
    units: "",
    unitName: "acres"
  });

  const [crops, setCrops] = useState([]);

  // ✅ FETCH EXPENSE IN EDIT MODE
  useEffect(() => {
    if (isEdit) {
      fetch(`http://localhost:5000/api/expenses/${id}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            setForm({
              title: data.expense.title,
              category: data.expense.category,
              amount: data.expense.amount,
              expenseDate: data.expense.expenseDate,
              notes: data.expense.notes || "",
              farmId: data.expense.farmId, // 🔥 IMPORTANT
              cropName: data.expense.cropName || "",
              isCalculated: data.expense.calculationDetails?.isCalculated || false,
              rate: data.expense.calculationDetails?.rate || "",
              units: data.expense.calculationDetails?.units || "",
              unitName: data.expense.calculationDetails?.unitName || "acres",
            });
          }
        });
    }

    // Fetch farm details to get available crops
    const fetchCrops = async () => {
      const targetFarmId = routeFarmId || form.farmId;
      if (!targetFarmId) return;
      try {
        const res = await fetch(`http://localhost:5000/api/farm/details/${targetFarmId}`);
        const data = await res.json();
        if (data.success && data.data && data.data.crops) {
          setCrops(data.data.crops);
          // Auto-select first crop if none is selected and it's not edit mode
          if (!isEdit && !form.cropName && !initialCrop && data.data.crops.length > 0) {
            setForm(prev => ({ ...prev, cropName: data.data.crops[0].name }));
          }
        }
      } catch (err) {
        console.error("Failed to load farm crops", err);
      }
    };

    fetchCrops();
  }, [id, isEdit, routeFarmId]);

  const getCategoryDefaults = (category) => {
    switch (category) {
      case "Labor":
        return { rateLabel: "Wage per Laborer/Area (₹)", unitLabel: "No. of Laborers / Area", unitOptions: ["laborers", "shifts", "cents", "acres"] };
      case "Seeds":
        return { rateLabel: "Price per kg/packet (₹)", unitLabel: "Weight/Packets", unitOptions: ["kg", "g", "packets"] };
      case "Irrigation":
        return { rateLabel: "Cost per hr/acre (₹)", unitLabel: "Hours/Area", unitOptions: ["hours", "acres", "cents"] };
      case "Fertilizer":
        return { rateLabel: "Price per bag/kg (₹)", unitLabel: "Amount", unitOptions: ["bags", "kg", "liters"] };
      case "Pesticide":
        return { rateLabel: "Price per L/kg (₹)", unitLabel: "Amount", unitOptions: ["liters", "ml", "kg"] };
      case "Machinery":
        return { rateLabel: "Rental per hr/day (₹)", unitLabel: "Duration", unitOptions: ["hours", "days"] };
      default:
        return { rateLabel: "Rate (₹)", unitLabel: "Units", unitOptions: ["items", "kg", "acres", "liters"] };
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const newVal = type === "checkbox" ? checked : value;

    setForm(prev => {
      const nextForm = { ...prev, [name]: newVal };
      if (name === "category") {
        const defaults = getCategoryDefaults(newVal);
        if (!defaults.unitOptions.includes(nextForm.unitName)) {
          nextForm.unitName = defaults.unitOptions[0];
        }
      }

      if (nextForm.isCalculated && (name === "rate" || name === "units" || name === "isCalculated")) {
        const rate = parseFloat(nextForm.rate) || 0;
        const units = parseFloat(nextForm.units) || 0;
        nextForm.amount = (rate * units).toFixed(2);
      }
      return nextForm;
    });
  };

  // ✅ ADD / EDIT SUBMIT
  const handleSubmit = async (e) => {
    e.preventDefault();

    const url = isEdit
      ? `http://localhost:5000/api/expenses/${id}`
      : "http://localhost:5000/api/expenses/add";

    const method = isEdit ? "PUT" : "POST";

    const payload = {
      title: form.title,
      category: form.category,
      amount: form.amount,
      expenseDate: form.expenseDate,
      notes: form.notes,
      farmId: form.farmId,
      cropName: form.cropName || undefined,
      userId: localStorage.getItem("userId"),
      calculationDetails: form.isCalculated ? {
        isCalculated: true,
        rate: Number(form.rate),
        units: Number(form.units),
        unitName: form.unitName
      } : { isCalculated: false }
    };

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json();

    if (data.success) {
      navigate(`/farm/${form.farmId}/expenses`);
    }
  };

  return (
    <div className="add-expense-container">
      <button
        className="back-btn"
        onClick={() => navigate(`/farm/${form.farmId}/expenses`)}
      >
        ⬅ Back to Farm
      </button>

      <h2>{isEdit ? "✏️ Edit Expense" : "➕ Add Expense"}</h2>

      <form className="add-expense-form" onSubmit={handleSubmit}>
        <input
          name="title"
          placeholder="Expense Title"
          value={form.title}
          onChange={handleChange}
          required
        />

        <select
          name="category"
          value={form.category}
          onChange={handleChange}
        >
          <option>Fertilizer</option>
          <option>Labor</option>
          <option>Seeds</option>
          <option>Irrigation</option>
          <option>Machinery</option>
          <option>Other</option>
        </select>

        <select
          name="cropName"
          value={form.cropName}
          onChange={handleChange}
          required
        >
          <option value="" disabled>Select Crop</option>
          {crops.map((crop, idx) => (
            <option key={idx} value={crop.name}>{formatCropName(crop.name)}</option>
          ))}
        </select>

        <div style={{ display: "flex", alignItems: "center", gap: "10px", margin: "10px 0", color: "#ddd" }}>
          <input
            type="checkbox"
            name="isCalculated"
            id="isCalculated"
            checked={form.isCalculated}
            onChange={handleChange}
            style={{ width: "auto", margin: 0 }}
          />
          <label htmlFor="isCalculated">Calculate Amount (Rate × Units)</label>
        </div>

        {form.isCalculated && (() => {
          const { rateLabel, unitLabel, unitOptions } = getCategoryDefaults(form.category);
          return (
            <div style={{ display: "flex", gap: "10px", marginBottom: "10px" }}>
              <input
                type="number"
                name="rate"
                placeholder={rateLabel}
                value={form.rate}
                onChange={handleChange}
                min="0"
                step="0.01"
                required
                style={{ flex: 1, padding: "10px" }}
              />
              <input
                type="number"
                name="units"
                placeholder={unitLabel}
                value={form.units}
                onChange={handleChange}
                min="0"
                step="0.01"
                required
                style={{ flex: 1, padding: "10px" }}
              />
              <select
                name="unitName"
                value={form.unitName}
                onChange={handleChange}
                style={{ flex: 1, padding: "10px", textTransform: "capitalize" }}
              >
                {unitOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            </div>
          );
        })()}

        <input
          type="number"
          name="amount"
          placeholder="Total Amount (₹)"
          value={form.amount}
          onChange={handleChange}
          required
          readOnly={form.isCalculated}
          style={form.isCalculated ? { backgroundColor: "#333", color: "#aaa" } : {}}
        />

        <input
          type="date"
          name="expenseDate"
          value={form.expenseDate}
          onChange={handleChange}
          required
        />

        <textarea
          name="notes"
          placeholder="Notes (optional)"
          value={form.notes}
          onChange={handleChange}
        />

        <button type="submit">
          {isEdit ? "Update Expense" : "Save Expense"}
        </button>
      </form>
    </div>
  );
};

export default AddExpense;
