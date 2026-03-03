import { useParams, useNavigate } from "react-router-dom";
import { useState } from "react";
import { formatCropName } from "../utils/areaUtils";
import "./AddIncome.css";

const AddIncome = () => {
  const { farmId } = useParams();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    cropName: "",
    quantity: "",
    pricePerUnit: "",
    totalAmount: 0,
    soldDate: "",
    notes: "",
  });

  const [farmCrops, setFarmCrops] = useState([]);
  const [loadingCrops, setLoadingCrops] = useState(true);

  // Fetch crops for this farm
  useState(() => {
    if (farmId) {
      fetch(`http://localhost:5000/api/farm/details/${farmId}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            const crops = data.data.crops && data.data.crops.length > 0
              ? data.data.crops.map(c => c.name || c)
              : (data.data.cropName ? [data.data.cropName] : []);

            setFarmCrops(crops);
            if (crops.length > 0) {
              setForm((prev) => ({ ...prev, cropName: crops[0] }));
            }
          }
          setLoadingCrops(false);
        })
        .catch(() => setLoadingCrops(false));
    }
  }, [farmId]);

  const handleChange = (e) => {
    const updated = { ...form, [e.target.name]: e.target.value };

    // auto-calc total
    if (updated.quantity && updated.pricePerUnit) {
      updated.totalAmount =
        Number(updated.quantity) * Number(updated.pricePerUnit);
    }

    setForm(updated);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const payload = {
      ...form,
      farmId,
      userId: localStorage.getItem("userId"),
    };

    const res = await fetch("http://localhost:5000/api/income/add", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json();

    if (data.success) {
      navigate(`/farm/${farmId}/income`);
    }
  };


  return (
    <div className="add-income-container">
      <button className="back-btn" onClick={() => navigate(`/farm/${farmId}`)}>
        ⬅ Back to Farms
      </button>
      <h2>🌾 Add Harvest Income</h2>

      <form onSubmit={handleSubmit}>
        {!loadingCrops && farmCrops.length > 0 ? (
          <select
            name="cropName"
            value={form.cropName}
            onChange={handleChange}
            required
            style={{ width: "100%", padding: "10px", marginBottom: "15px", borderRadius: "5px", border: "1px solid #ccc" }}
          >
            {farmCrops.map((crop) => (
              <option key={crop} value={crop}>{formatCropName(crop)}</option>
            ))}
          </select>
        ) : (
          <input
            name="cropName"
            placeholder="Crop Name (Rice, Pepper, etc)"
            onChange={handleChange}
            required
            style={{ width: "100%", padding: "10px", marginBottom: "15px", borderRadius: "5px", border: "1px solid #ccc" }}
          />
        )}

        <input
          type="number"
          name="quantity"
          placeholder="Quantity (kg)"
          onChange={handleChange}
          required
        />

        <input
          type="number"
          name="pricePerUnit"
          placeholder="Price per unit (₹)"
          onChange={handleChange}
          required
        />

        <input
          type="date"
          name="soldDate"
          onChange={handleChange}
          required
        />

        <textarea
          name="notes"
          placeholder="Notes (optional)"
          onChange={handleChange}
        />

        <p><b>Total:</b> ₹ {form.totalAmount}</p>

        <button type="submit">Save Income</button>
      </form>
    </div>
  );
};

export default AddIncome;
