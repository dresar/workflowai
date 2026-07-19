import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Sparkles, Wrench, ArrowRight, ArrowLeft, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

import { api } from "@/lib/api";

export const Route = createFileRoute("/app/tech-preferences")({
  component: TechPref,
});

const DROPDOWNS: Array<{ key: string; label: string; opts: string[] }> = [
  { key: "frontend", label: "Frontend", opts: ["React", "Next.js", "Vue", "Svelte", "Angular"] },
  { key: "backend", label: "Backend", opts: ["Node.js", "NestJS", "Django", "Laravel", "Go"] },
  { key: "database", label: "Database", opts: ["PostgreSQL", "MySQL", "MongoDB", "SQLite"] },
  { key: "deployment", label: "Deployment", opts: ["Vercel", "Netlify", "Cloudflare", "AWS", "Docker"] },
  { key: "auth", label: "Authentication", opts: ["Supabase Auth", "Clerk", "Auth0", "JWT"] },
  { key: "styling", label: "Styling", opts: ["Tailwind CSS", "shadcn/ui", "Chakra", "MUI"] },
  { key: "state", label: "State Management", opts: ["TanStack Query", "Zustand", "Redux", "Jotai"] },
  { key: "mobile", label: "Mobile Framework", opts: ["React Native", "Expo", "Flutter", "Ionic"] },
  { key: "desktop", label: "Desktop Framework", opts: ["Electron", "Tauri", "Wails"] },
  { key: "extras", label: "Lainnya", opts: ["Stripe", "OpenAI", "Sentry", "PostHog"] },
];

function StepIndicator() {
  const steps = ["Ide", "Teknologi", "Pertanyaan", "Canvas", "PRD", "Task", "Prompt"];
  const active = 1;
  return (
    <div className="mb-8 flex flex-wrap items-center gap-2 text-xs">
      {steps.map((s, i) => (
        <div key={s} className="flex items-center gap-2">
          <span
            className={cn(
              "flex h-6 items-center gap-1.5 rounded-full border px-2.5",
              i <= active
                ? "border-primary/40 bg-primary/10 text-primary"
                : "border-border text-muted-foreground",
            )}
          >
            {i < active && <Check size={10} />} {s}
          </span>
          {i < steps.length - 1 && <span className="text-muted-foreground">→</span>}
        </div>
      ))}
    </div>
  );
}

function TechPref() {
  const navigate = useNavigate();
  const [choice, setChoice] = useState<"auto" | "manual" | null>(null);
  const [selections, setSelections] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  async function handleNext() {
    if (!choice) return;
    const projectId = typeof window !== "undefined" ? localStorage.getItem("active_project_id") : null;
    if (!projectId) return;

    setLoading(true);
    try {
      await api.projects.update(projectId, { techSelectionMode: choice });
      if (choice === "manual") {
        const technologies = Object.entries(selections).map(([category, technologyName]) => ({
          category,
          technologyName,
          isAiSelected: false,
        }));
        if (technologies.length > 0) {
          await api.projects.saveTechnologies(projectId, { technologies });
        }
      }
      navigate({ to: "/app/questions" });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      <StepIndicator />
      <div className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight">Preferensi Teknologi</h1>
        <p className="mt-2 text-muted-foreground">
          Pilih bagaimana teknologi project Anda ditentukan.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {[
          {
            key: "auto" as const,
            title: "Biarkan AI Memilih",
            desc: "AI akan menganalisis kebutuhan dan memilih stack teknologi yang paling cocok.",
            icon: Sparkles,
          },
          {
            key: "manual" as const,
            title: "Pilih Sendiri",
            desc: "Kendalikan penuh pilihan Frontend, Backend, Database, dan lainnya.",
            icon: Wrench,
          },
        ].map(({ key, title, desc, icon: Icon }) => (
          <button
            key={key}
            disabled={loading}
            onClick={() => setChoice(key)}
            className={cn(
              "card-premium group text-left transition hover:border-primary/40",
              choice === key && "border-primary ring-2 ring-primary/30",
            )}
          >
            <div className="p-6">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Icon size={20} />
              </div>
              <div className="mt-4 text-lg font-semibold">{title}</div>
              <div className="mt-1.5 text-sm text-muted-foreground">{desc}</div>
            </div>
          </button>
        ))}
      </div>

      {choice === "manual" && (
        <div className="mt-8 card-premium p-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {DROPDOWNS.map((d) => (
              <div key={d.key} className="space-y-1.5">
                <Label>{d.label}</Label>
                <Select
                  value={selections[d.key] || ""}
                  onValueChange={(val) => setSelections((prev) => ({ ...prev, [d.key]: val }))}
                  disabled={loading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={`Pilih ${d.label.toLowerCase()}`} />
                  </SelectTrigger>
                  <SelectContent>
                    {d.opts.map((o) => (
                      <SelectItem key={o} value={o}>
                        {o}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-8 flex items-center justify-between">
        <Button variant="ghost" asChild disabled={loading}>
          <Link to="/app">
            <ArrowLeft className="mr-2 h-4 w-4" /> Kembali
          </Link>
        </Button>
        <Button
          onClick={handleNext}
          disabled={!choice || loading}
        >
          {loading ? "Menyimpan..." : "Lanjut"} <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
