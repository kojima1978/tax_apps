"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

const COLORS = ["#64786e", "#87928c", "#a0a8a4", "#b6bcb9", "#cbd0cd", "#dfe2e0"];

export function AllocationChart({ data }: { data: { name: string; value: number }[] }) {
  return (
    <div className="chart-wrap" aria-label="資産配分ドーナツグラフ">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" innerRadius={66} outerRadius={96} paddingAngle={2} stroke="none">
            {data.map((item, index) => <Cell key={item.name} fill={COLORS[index % COLORS.length]} />)}
          </Pie>
          <Tooltip formatter={(value) => `${Math.round(Number(value) / 10000).toLocaleString("ja-JP")}万円`} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
