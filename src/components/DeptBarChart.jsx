import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { useNavigate } from "react-router-dom";

export default function DeptBarChart({ departments }) {
  const navigate = useNavigate();
  const data = departments.map(d => ({
    ...d,
    label: d.dept.length > 20 ? d.dept.slice(0, 19) + "…" : d.dept,
  }));

  return (
    <ResponsiveContainer width="100%" height={Math.max(240, data.length * 30)}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 30, left: 4, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border)" />
        <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} unit="%" />
        <YAxis type="category" dataKey="label" width={160} tick={{ fontSize: 12 }} />
        <Tooltip
          formatter={(v) => [`${v}%`, "Late rate"]}
          labelFormatter={(_, p) => p?.[0]?.payload?.dept}
        />
        <Bar
          dataKey="latePct"
          radius={[0, 4, 4, 0]}
          cursor="pointer"
          onClick={(d) => navigate(`/department/${encodeURIComponent(d.dept)}`)}
        >
          {data.map((d, i) => (
            <Cell key={i} fill={d.latePct >= 60 ? "#D85A30" : d.latePct >= 35 ? "#EF9F27" : "#1D9E75"} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
