import { AREA_UNITS, getPreferredUnit, setPreferredUnit } from "../utils/areaUtils";
import { useState } from "react";

/**
 * Small dropdown component – switches the global area unit.
 * Usage: <UnitSelector onChange={() => forceRerender()} />
 */
export default function UnitSelector({ onChange, style }) {
    const [unit, setUnit] = useState(getPreferredUnit());

    const handleChange = (e) => {
        const newUnit = e.target.value;
        setPreferredUnit(newUnit);
        setUnit(newUnit);
        if (onChange) onChange(newUnit);
    };

    return (
        <select
            value={unit}
            onChange={handleChange}
            title="Change area unit"
            style={{
                padding: "4px 8px",
                borderRadius: "4px",
                border: "1px solid #555",
                backgroundColor: "#2a2a2a",
                color: "#4CAF50",
                fontSize: "0.8rem",
                cursor: "pointer",
                fontWeight: "bold",
                ...style
            }}
        >
            {AREA_UNITS.map(u => (
                <option key={u.key} value={u.key}>{u.label}</option>
            ))}
        </select>
    );
}
