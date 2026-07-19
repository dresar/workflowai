import { createFileRoute } from "@tanstack/react-router";
import { Activity, Clock, Zap, CheckCircle2 } from "lucide-react";
import { AdminPage } from "@/components/admin-page";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export const Route = createFileRoute("/admin/monitoring")({
  component: MonitoringPage,
});

const AREA = Array.from({ length: 24 }).map((_, i) => ({
  h: `${i}:00`,
  req: Math.round(200 + Math.random() * 600),
  latency: Math.round(180 + Math.random() * 200),
}));

const BAR = ["Gemini", "Groq", "Claude", "DeepSeek", "OpenAI", "OpenRouter"].map((n) => ({
  name: n,
  value: Math.round(500 + Math.random() * 3000),
}));

const PIE = [
  { name: "Gemini", value: 42 },
  { name: "Groq", value: 28 },
  { name: "Claude", value: 18 },
  { name: "Lainnya", value: 12 },
];
const COLORS = ["var(--color-chart-1)", "var(--color-chart-2)", "var(--color-chart-3)", "var(--color-chart-4)"];

function MonitoringPage() {
  return (
    <AdminPage title="Monitoring" subtitle="Pemantauan real-time penggunaan sistem">
      <div className="mb-6 grid gap-4 md:grid-cols-4">
        {[
          { icon: Zap, label: "Request / menit", value: "342" },
          { icon: Clock, label: "Avg Latency", value: "284ms" },
          { icon: CheckCircle2, label: "Success Rate", value: "99.4%" },
          { icon: Activity, label: "Uptime", value: "99.98%" },
        ].map((s) => (
          <div key={s.label} className="card-premium p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <s.icon size={16} />
              </div>
              <div>
                <div className="text-xl font-semibold">{s.value}</div>
                <div className="text-xs text-muted-foreground">{s.label}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="card-premium p-6 lg:col-span-2">
          <h3 className="mb-4 text-base font-semibold">Request & Latency (24 jam)</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={AREA}>
                <defs>
                  <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-chart-1)" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="var(--color-chart-1)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" opacity={0.4} />
                <XAxis dataKey="h" stroke="var(--color-muted-foreground)" fontSize={10} />
                <YAxis stroke="var(--color-muted-foreground)" fontSize={10} />
                <Tooltip contentStyle={{ backgroundColor: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 8, fontSize: 12 }} />
                <Area type="monotone" dataKey="req" stroke="var(--color-chart-1)" fill="url(#g1)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card-premium p-6">
          <h3 className="mb-4 text-base font-semibold">Distribusi Provider</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={PIE} innerRadius={60} outerRadius={90} paddingAngle={4} dataKey="value">
                  {PIE.map((_, i) => (
                    <Cell key={i} fill={COLORS[i]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 8, fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card-premium p-6 lg:col-span-3">
          <h3 className="mb-4 text-base font-semibold">Request per Provider</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={BAR}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" opacity={0.4} />
                <XAxis dataKey="name" stroke="var(--color-muted-foreground)" fontSize={11} />
                <YAxis stroke="var(--color-muted-foreground)" fontSize={11} />
                <Tooltip contentStyle={{ backgroundColor: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="value" fill="var(--color-chart-1)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </AdminPage>
  );
}
