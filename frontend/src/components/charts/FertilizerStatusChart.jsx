import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";

const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const { name, value } = payload[0];
    const color = name === "Normal" ? "#22c55e" : name === "Due Soon" ? "#eab308" : "#ef4444";
    return (
      <div style={{
        background: "#1e293b",
        border: `1px solid ${color}44`,
        padding: "10px 14px",
        borderRadius: "8px",
        boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.2)",
      }}>
        <p style={{ margin: 0, fontSize: "0.85rem", color: "#94a3b8", textTransform: "uppercase" }}>{name}</p>
        <p style={{ margin: "4px 0 0 0", fontSize: "1.1rem", fontWeight: "bold", color: "#f1f5f9" }}>{value} Schedules</p>
      </div>
    );
  }
  return null;
};

export default function FertilizerStatusChart({ summary }) {
  if (!summary) return <div style={{ height: "260px", display: "flex", alignItems: "center", justifyContent: "center", color: "#64748b" }}>Loading chart...</div>;

  const normal = Math.max(0, summary.totalFertilizers - summary.dueSoon - summary.overdue);

  const data = [
    { name: "Normal", value: normal, color: "#22c55e" },
    { name: "Due Soon", value: summary.dueSoon, color: "#eab308" },
    { name: "Overdue", value: summary.overdue, color: "#ef4444" }
  ].filter(item => item.value > 0);

  return (
    <div style={{ height: "260px", width: "100%" }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={85}
            paddingAngle={5}
            stroke="none"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend
            verticalAlign="bottom"
            height={36}
            iconType="circle"
            formatter={(value) => <span style={{ color: "#94a3b8", fontSize: "0.80rem" }}>{value}</span>}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
