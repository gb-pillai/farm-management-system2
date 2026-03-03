import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { formatCropName } from "../../utils/areaUtils";

const COLORS = [
  '#22c55e', // Green
  '#eab308', // Yellow
  '#ef4444', // Red
  '#3b82f6', // Blue
  '#a855f7', // Purple
  '#f97316'  // Orange
];

const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const { name, value } = payload[0];
    return (
      <div style={{
        background: "#1e293b",
        border: "1px solid #334155",
        padding: "10px 14px",
        borderRadius: "8px",
        boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.2)",
      }}>
        <p style={{ margin: 0, fontSize: "0.85rem", color: "#94a3b8", textTransform: "uppercase" }}>{name}</p>
        <p style={{ margin: "4px 0 0 0", fontSize: "1.1rem", fontWeight: "bold", color: "#f1f5f9" }}>₹{value.toLocaleString()}</p>
      </div>
    );
  }
  return null;
};

export default function ExpensePie({ data = [] }) {
  if (!data.length) {
    return (
      <div style={{ height: "300px", display: "flex", alignItems: "center", justifyContent: "center", color: "#64748b" }}>
        No expense data for this year
      </div>
    );
  }

  // Pre-format names for the chart
  const chartData = data.map(d => ({
    name: d._id,
    value: d.totalAmount
  }));

  return (
    <div style={{ width: "100%", height: "300px" }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chartData}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={65}
            outerRadius={90}
            paddingAngle={5}
            stroke="none"
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend
            verticalAlign="bottom"
            height={36}
            iconType="circle"
            formatter={(value) => <span style={{ color: "#94a3b8", fontSize: "0.85rem" }}>{value}</span>}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
