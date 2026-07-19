import { createFileRoute } from "@tanstack/react-router";
import { Filter, Download, CheckCircle2, XCircle, AlertTriangle, Info } from "lucide-react";
import { AdminPage } from "@/components/admin-page";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/admin/logs")({
  component: LogsPage,
});

const LOGS = [
  { t: "10:42:18", level: "info", user: "rafi@app.com", provider: "Gemini", msg: "PRD generated for project 'Marketplace UMKM'" },
  { t: "10:41:02", level: "success", user: "sari@app.com", provider: "Groq", msg: "Prompt generated successfully" },
  { t: "10:39:47", level: "warn", user: "admin@app.com", provider: "OpenAI", msg: "Rate limit reached, switching to Gemini" },
  { t: "10:37:12", level: "error", user: "budi@app.com", provider: "Claude", msg: "Timeout after 30s" },
  { t: "10:35:00", level: "info", user: "rafi@app.com", provider: "Gemini", msg: "Task breakdown created" },
  { t: "10:33:22", level: "success", user: "sari@app.com", provider: "DeepSeek", msg: "PRD generated" },
  { t: "10:30:15", level: "info", user: "admin@app.com", provider: "-", msg: "API Key rotation triggered" },
  { t: "10:28:00", level: "success", user: "budi@app.com", provider: "Groq", msg: "Login successful" },
];

const ICONS = {
  info: <Info size={14} className="text-chart-2" />,
  success: <CheckCircle2 size={14} className="text-primary" />,
  warn: <AlertTriangle size={14} className="text-chart-4" />,
  error: <XCircle size={14} className="text-destructive" />,
};

function LogsPage() {
  return (
    <AdminPage
      title="Log Aktivitas"
      subtitle="Rekam jejak seluruh aktivitas sistem"
      actions={
        <Button variant="outline">
          <Download className="mr-2 h-4 w-4" /> Export CSV
        </Button>
      }
    >
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <Input type="date" className="w-auto" />
        <Select>
          <SelectTrigger className="w-40"><SelectValue placeholder="Provider" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Provider</SelectItem>
            <SelectItem value="gemini">Gemini</SelectItem>
            <SelectItem value="groq">Groq</SelectItem>
          </SelectContent>
        </Select>
        <Select>
          <SelectTrigger className="w-40"><SelectValue placeholder="Level" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Level</SelectItem>
            <SelectItem value="info">Info</SelectItem>
            <SelectItem value="warn">Warning</SelectItem>
            <SelectItem value="error">Error</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm"><Filter className="mr-2 h-4 w-4" /> Filter</Button>
      </div>

      <div className="card-premium p-6">
        <div className="space-y-3">
          {LOGS.map((l, i) => (
            <div key={i} className="flex items-start gap-4 border-l-2 border-border pl-4">
              <div className="mt-0.5">{ICONS[l.level as keyof typeof ICONS]}</div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="font-medium">{l.msg}</span>
                  <Badge variant="secondary" className="text-[10px]">{l.provider}</Badge>
                </div>
                <div className="mt-0.5 text-xs text-muted-foreground">
                  {l.user} · {l.t}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AdminPage>
  );
}
