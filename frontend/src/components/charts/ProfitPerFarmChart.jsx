import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine, Cell } from "recharts";

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const profit = payload[0].value;
    return (
      <div style={{
        background: "#1e293b",
        border: "1px solid #334155",
        padding: "10px 14px",
        borderRadius: "8px",
        boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.2)",
      }}>
        <p style={{ margin: 0, fontSize: "0.85rem", color: "#94a3b8", textTransform: "uppercase" }}>{label}</p>
        <p style={{
          margin: "4px 0 0 0",
          fontSize: "1.1rem",
          fontWeight: "bold",
          color: profit >= 0 ? "#4ade80" : "#f87171"
        }}>
          {profit >= 0 ? "+" : ""}₹{profit.toLocaleString()}
        </p>
      </div>
    );
  }
  return null;
};

export default function ProfitPerFarmChart({ data }) {
  if (!data || !data.length) {
    return (
      <div style={{ height: "260px", display: "flex", alignItems: "center", justifyContent: "center", color: "#64748b" }}>
        No profit data for this year
      </div>
    );
  }

  return (
    <div style={{ height: "260px", width: "100%" }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 10, right: 10, left: 10, bottom: 20 }}
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" />
          <XAxis
            dataKey="farmName"
            axisLine={false}
            tickLine={false}
            tick={{ fill: "#94a3b8", fontSize: 12 }}
            dy={10}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fill: "#94a3b8", fontSize: 12 }}
            tickFormatter={(value) => `₹${value / 1000}k`}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: '#ffffff0a' }} />
          <ReferenceLine y={0} stroke="#475569" />
          <Bar dataKey="profit" radius={[4, 4, 0, 0]}>
            {data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={entry.profit >= 0 ? "#22c55e" : "#ef4444"}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
