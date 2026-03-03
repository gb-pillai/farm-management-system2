import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { getPreferredUnit, displayToAcres, acresToDisplay, shortLabel } from "../utils/areaUtils";
import UnitSelector from "../components/UnitSelector";
import "./FarmForm.css";

function FarmForm() {
  const [farmName, setFarmName] = useState("");
  const [location, setLocation] = useState("");
  const [crops, setCrops] = useState([{ name: "", season: "", sownDate: "", expectedHarvestDate: "", allocatedArea: "", status: "Growing", removalDate: "" }]);
  const [areaInAcres, setAreaInAcres] = useState("");
  const [season, setSeason] = useState("");

  const [message, setMessage] = useState("");
  const [unit, setUnit] = useState(getPreferredUnit());
  const navigate = useNavigate();

  // Compute live land usage across all crops (using temporal overlap)
  const computeLandUsage = () => {
    const total = parseFloat(areaInAcres) || 0;
    if (total === 0) return { total: 0, used: 0, available: 0, warnings: [] };

    const warnings = [];
    const today = new Date(); today.setHours(0, 0, 0, 0);

    // Only count crops that are NOT already harvested (today <= expectedHarvestDate)
    const activeCrops = crops.filter(c => {
      if (!c.expectedHarvestDate && !c.removalDate) return true; // no date = assume active
      const endDate = c.removalDate ? new Date(c.removalDate) : new Date(c.expectedHarvestDate);
      return today <= endDate;
    });

    const totalAllocated = activeCrops.reduce((sum, c) => sum + (parseFloat(c.allocatedArea) || 0), 0);

    // Check for time-overlapping active crops that exceed farm area
    for (let i = 0; i < activeCrops.length; i++) {
      const ci = activeCrops[i];
      const ciStart = ci.sownDate ? new Date(ci.sownDate) : null;
      const ciEnd = ci.removalDate ? new Date(ci.removalDate) : (ci.expectedHarvestDate ? new Date(ci.expectedHarvestDate) : null);
      if (!ciStart || !ciEnd || !ci.allocatedArea) continue;

      let overlapTotal = parseFloat(ci.allocatedArea) || 0;
      for (let j = 0; j < activeCrops.length; j++) {
        if (i === j) continue;
        const cj = activeCrops[j];
        const cjStart = cj.sownDate ? new Date(cj.sownDate) : null;
        const cjEnd = cj.removalDate ? new Date(cj.removalDate) : (cj.expectedHarvestDate ? new Date(cj.expectedHarvestDate) : null);
        if (!cjStart || !cjEnd || !cj.allocatedArea) continue;

        if (ciStart <= cjEnd && ciEnd >= cjStart) {
          overlapTotal += parseFloat(cj.allocatedArea) || 0;
        }
      }
      if (overlapTotal > total) {
        warnings.push(`⚠️ Crops overlapping during ${ciStart.toLocaleDateString()} – ${ciEnd.toLocaleDateString()} use ${overlapTotal.toFixed(1)} ac (farm has only ${total} ac)`);
      }
    }

    const uniqueWarnings = [...new Set(warnings)];
    return { total, used: totalAllocated, available: Math.max(0, total - totalAllocated), warnings: uniqueWarnings };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const userId = localStorage.getItem("userId");

    if (!userId) {
      setMessage("User not logged in");
      return;
    }

    // Validate land allocation before submitting
    const { warnings } = computeLandUsage();
    if (warnings.length > 0) {
      if (!window.confirm("There are land overlap warnings:\n\n" + warnings.join("\n") + "\n\nProceed anyway?")) {
        return;
      }
    }

    try {
      const currentMonth = new Date().getMonth();
      let calculatedSeason = "Summer";
      if (currentMonth >= 5 && currentMonth <= 8) calculatedSeason = "Monsoon";
      else if (currentMonth >= 9 && currentMonth <= 10) calculatedSeason = "Post-Monsoon";
      else if (currentMonth >= 11 || currentMonth <= 1) calculatedSeason = "Winter";

      const response = await fetch("http://localhost:5000/api/farm", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          userId,
          farmName,
          location,
          crops: crops.map(c => ({ ...c, allocatedArea: displayToAcres(c.allocatedArea, unit) })),
          areaInAcres: displayToAcres(areaInAcres, unit),
          season: calculatedSeason
        })
      });

      const data = await response.json();

      if (data.success) {
        setMessage("Farm added successfully");
        setFarmName("");
        setLocation("");
        setCrops([{ name: "", season: "", sownDate: "", expectedHarvestDate: "", allocatedArea: "", status: "Growing", removalDate: "" }]);
        setAreaInAcres("");
        setSeason("");
      } else {
        setMessage(data.message || "Failed to add farm");
      }
    } catch {
      setMessage("Server error");
    }
  };

  const { total, used, available, warnings } = computeLandUsage();

  return (
    <div className="farm-form-container">
      <button className="back-btn" onClick={() => navigate("/dashboard")}>
        ⬅ Back to Dashboard
      </button>

      <h2>🌾 Add Farm Details</h2>

      <form className="farm-form" onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Farm Name (e.g. My Paddy Field)"
          value={farmName}
          onChange={(e) => setFarmName(e.target.value)}
          required
        />

        <select
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          required
        >
          <option value="">Select District</option>
          <option value="Thiruvananthapuram">Thiruvananthapuram</option>
          <option value="Kollam">Kollam</option>
          <option value="Pathanamthitta">Pathanamthitta</option>
          <option value="Alappuzha">Alappuzha</option>
          <option value="Kottayam">Kottayam</option>
          <option value="Idukki">Idukki</option>
          <option value="Ernakulam">Ernakulam</option>
          <option value="Thrissur">Thrissur</option>
          <option value="Palakkad">Palakkad</option>
          <option value="Malappuram">Malappuram</option>
          <option value="Kozhikode">Kozhikode</option>
          <option value="Wayanad">Wayanad</option>
          <option value="Kannur">Kannur</option>
          <option value="Kasaragod">Kasaragod</option>
        </select>

        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <input
            type="number"
            placeholder={`Total Area (${shortLabel(unit)})`}
            value={areaInAcres}
            onChange={(e) => setAreaInAcres(e.target.value)}
            required
            style={{ flex: 1 }}
          />
          <UnitSelector onChange={(u) => setUnit(u)} />
        </div>



        {/* ====== LIVE LAND USAGE SUMMARY ====== */}
        {areaInAcres && (
          <div style={{ padding: "12px 14px", backgroundColor: "#1b2a1b", borderRadius: "8px", marginBottom: "10px", fontSize: "0.9rem", color: "#eee" }}>
            <div style={{ marginBottom: "6px" }}>
              🗺️ <strong>Farm Area:</strong> {total} {shortLabel(unit)} &nbsp;|&nbsp;
              <strong style={{ color: "#aaa" }}>Allocated: {used.toFixed(2)} {shortLabel(unit)}</strong> &nbsp;|&nbsp;
              <strong style={{ color: available === 0 ? "#e53935" : available < 1 ? "#ff9800" : "#4CAF50" }}>
                Remaining: {available.toFixed(2)} {shortLabel(unit)}
              </strong>
            </div>
            <div style={{ height: "8px", backgroundColor: "#333", borderRadius: "4px", overflow: "hidden" }}>
              <div style={{
                height: "100%",
                width: `${total > 0 ? Math.min(100, (used / total) * 100) : 0}%`,
                backgroundColor: used > total ? "#e53935" : used / total >= 0.7 ? "#ff9800" : "#4CAF50",
                borderRadius: "4px",
                transition: "width 0.3s ease"
              }} />
            </div>
            {warnings.map((w, i) => (
              <p key={i} style={{ color: "#ff9800", fontSize: "0.8rem", marginTop: "6px", marginBottom: 0 }}>{w}</p>
            ))}
          </div>
        )}

        {/* ====== CROP INPUTS ====== */}
        {crops.map((crop, index) => (
          <div key={index} className="crop-input-group" style={{
            display: "flex", flexDirection: "column", gap: "10px",
            marginBottom: "15px", padding: "15px", border: "1px solid #ddd",
            borderRadius: "8px", backgroundColor: "#f9f9f9"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h4 style={{ color: "#222" }}>Crop {index + 1}</h4>
              {crops.length > 1 && (
                <button
                  type="button"
                  className="remove-crop-btn"
                  onClick={() => {
                    const newCrops = crops.filter((_, i) => i !== index);
                    setCrops(newCrops);
                  }}
                  style={{ padding: "5px 10px", backgroundColor: "#ff4d4d", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}
                >
                  ✖ Remove
                </button>
              )}
            </div>

            <input
              type="text"
              placeholder={`Crop Name (e.g. Paddy)`}
              value={crop.name}
              onChange={(e) => {
                const newCrops = [...crops];
                newCrops[index].name = e.target.value;
                setCrops(newCrops);
              }}
              required
              style={{ marginBottom: 0 }}
            />

            <select
              value={crop.season}
              onChange={(e) => {
                const newCrops = [...crops];
                newCrops[index].season = e.target.value;
                setCrops(newCrops);
              }}
              required
              style={{ padding: "10px", borderRadius: "4px", border: "1px solid #ccc" }}
            >
              <option value="">Select Season for this Crop</option>
              <option value="Monsoon">Monsoon</option>
              <option value="Post-Monsoon">Post-Monsoon</option>
              <option value="Summer">Summer</option>
              <option value="Winter">Winter</option>
              <option value="Perennial">Perennial (All-Year)</option>
            </select>

            <div style={{ display: "flex", gap: "10px" }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: "0.85rem", color: "#555" }}>Sown Date</label>
                <input
                  type="date"
                  value={crop.sownDate}
                  onChange={(e) => {
                    const newCrops = [...crops];
                    newCrops[index].sownDate = e.target.value;
                    setCrops(newCrops);
                  }}
                  required
                  style={{ width: "100%", marginBottom: 0 }}
                />
              </div>
              <div style={{ flex: 1 }}>
                {crop.season !== "Perennial" ? (
                  <>
                    <label style={{ fontSize: "0.85rem", color: "#555" }}>Expected Harvest</label>
                    <input
                      type="date"
                      value={crop.expectedHarvestDate}
                      onChange={(e) => {
                        const newCrops = [...crops];
                        newCrops[index].expectedHarvestDate = e.target.value;
                        setCrops(newCrops);
                      }}
                      required
                      style={{ width: "100%", marginBottom: 0 }}
                    />
                  </>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
                    <label style={{ fontSize: "0.85rem", color: "#555", display: "block", marginBottom: "4px" }}>Removed Date (Optional)</label>
                    <input
                      type="date"
                      value={crop.removalDate || ""}
                      onChange={(e) => {
                        const newCrops = [...crops];
                        newCrops[index].removalDate = e.target.value;
                        newCrops[index].status = e.target.value ? "Removed" : "Growing";
                        setCrops(newCrops);
                      }}
                      style={{ width: "100%", marginBottom: 0 }}
                    />
                    {!crop.removalDate && <em style={{ fontSize: "0.75rem", color: "#888", marginTop: "4px" }}>Leave blank if still growing</em>}
                  </div>
                )}
              </div>
            </div>

            {/* Allocated Area for this crop */}
            <div>
              <label style={{ fontSize: "0.85rem", color: "#555" }}>🗺️ Allocated Area ({shortLabel(unit)})</label>
              <input
                type="number"
                min="0"
                step="0.1"
                placeholder={`How many ${shortLabel(unit)} for this crop?`}
                value={crop.allocatedArea}
                onChange={(e) => {
                  const newCrops = [...crops];
                  newCrops[index].allocatedArea = e.target.value;
                  setCrops(newCrops);
                }}
                style={{ width: "100%", marginBottom: 0 }}
              />
            </div>
          </div>
        ))}
        <button
          type="button"
          className="add-crop-btn"
          onClick={() => setCrops([...crops, { name: "", season: "", sownDate: "", expectedHarvestDate: "", allocatedArea: "", status: "Growing", removalDate: "" }])}
          style={{ marginBottom: "15px", padding: "8px 15px", backgroundColor: "#4CAF50", color: "white", border: "none", borderRadius: "4px", cursor: "pointer", fontSize: "0.9rem" }}
        >
          ➕ Add Another Crop
        </button>



        <button type="submit">🌾 Add Farm</button>
      </form>

      {message && (
        <p
          className={`form-message ${message.toLowerCase().includes("success")
            ? "success"
            : "error"
            }`}
        >
          {message}
        </p>
      )}
    </div>
  );

}

export default FarmForm;
