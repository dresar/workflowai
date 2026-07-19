import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowRight, Sparkles, Languages, Cpu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { api } from "@/lib/api";

export const Route = createFileRoute("/app/")({
  component: WorkflowHome,
});

function WorkflowHome() {
  const navigate = useNavigate();
  const [idea, setIdea] = useState("");
  const provider = "collaborative";
  const [lang, setLang] = useState("id");
  const [loading, setLoading] = useState(false);

  async function handleStart() {
    setLoading(true);
    try {
      const project = await api.projects.create({
        name: `Project ${new Date().toLocaleDateString()}`,
        idea,
        language: lang === "id" ? "id" : "en",
        preferredAiTarget: "Cursor",
        techSelectionMode: "manual",
      });
      if (typeof window !== "undefined") {
        localStorage.setItem("active_project_id", project.id);
        localStorage.setItem("active_provider", provider);
      }
      navigate({ to: "/app/tech-preferences" });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center px-6 py-16">
      <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground">
        <Sparkles size={12} className="text-primary" /> Powered by AI Workflow
      </div>
      <h1 className="text-center text-4xl font-semibold tracking-tight text-gradient sm:text-5xl">
        Mau bikin aplikasi apa hari ini?
      </h1>
      <p className="mt-4 max-w-xl text-center text-muted-foreground">
        Jelaskan ide Anda. AI akan membantu menyusun PRD, task implementasi, hingga prompt siap
        pakai untuk AI Coding favorit Anda.
      </p>

      <div className="mt-10 w-full">
        <div className="card-premium p-2">
          <Textarea
            value={idea}
            onChange={(e) => setIdea(e.target.value)}
            placeholder="Contoh: Saya ingin membangun marketplace UMKM lokal dengan fitur pesan-antar, pembayaran, dan dashboard penjual…"
            className="min-h-[140px] resize-none border-0 bg-transparent text-base focus-visible:ring-0"
            disabled={loading}
          />
          <div className="flex flex-wrap items-center gap-2 border-t border-border px-2 py-2">
            <Select value={lang} onValueChange={setLang} disabled={loading}>
              <SelectTrigger className="h-9 w-auto gap-2 border-border/60 bg-transparent">
                <Languages size={14} className="opacity-60" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="id">Indonesia</SelectItem>
                <SelectItem value="en">English</SelectItem>
              </SelectContent>
            </Select>

            <div className="ml-auto">
              <Button
                onClick={handleStart}
                disabled={!idea.trim() || loading}
              >
                {loading ? "Menyiapkan..." : "Mulai Perencanaan"} <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {["Marketplace", "SaaS Dashboard", "AI Chat", "Company Profile"].map((s) => (
            <button
              key={s}
              onClick={() => setIdea(`Saya ingin membangun ${s.toLowerCase()} yang…`)}
              className="rounded-lg border border-border bg-card/50 px-3 py-2 text-xs text-muted-foreground transition hover:border-primary/40 hover:text-foreground"
            >
              {s}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
