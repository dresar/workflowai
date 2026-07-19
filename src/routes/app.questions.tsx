import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, SkipForward, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
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

export const Route = createFileRoute("/app/questions")({
  component: QuestionsPage,
});

type QType = "textarea" | "chips" | "radio" | "checkbox" | "select" | "switch";
interface Q {
  id: string;
  question: string;
  type: QType;
  options?: string[];
  desc?: string;
}

const FALLBACK_QUESTIONS: Q[] = [
  { id: "fallback-1", question: "Siapa target utama pengguna aplikasi Anda?", type: "textarea" },
  {
    id: "fallback-2",
    question: "Apa tujuan utama aplikasi?",
    type: "chips",
    options: ["Penjualan", "Manajemen", "Edukasi", "Komunitas", "Produktivitas", "Hiburan"],
  },
  {
    id: "fallback-3",
    question: "Fitur wajib yang harus ada?",
    type: "checkbox",
    options: ["Chat", "Notifikasi", "Pembayaran", "Upload File", "Multi-bahasa", "Export PDF"],
  },
  {
    id: "fallback-4",
    question: "Apakah aplikasi memerlukan login pengguna?",
    type: "radio",
    options: ["Ya", "Tidak", "Opsional"],
  },
  { id: "fallback-5", question: "Apakah membutuhkan dashboard admin?", type: "switch" },
  { id: "fallback-6", question: "Apakah ada transaksi pembayaran?", type: "switch" },
  { id: "fallback-7", question: "Apakah pengguna perlu mengunggah file?", type: "switch" },
  {
    id: "fallback-8",
    question: "Level integrasi AI yang diinginkan?",
    type: "select",
    options: ["Tidak ada", "Ringan (chat)", "Sedang (recommender)", "Penuh (agent)"],
  },
  { id: "fallback-9", question: "Apakah membutuhkan notifikasi real-time?", type: "switch" },
  { id: "fallback-10", question: "Catatan tambahan tentang project", type: "textarea" },
];

function QuestionsPage() {
  const navigate = useNavigate();
  const [questions, setQuestions] = useState<Q[]>([]);
  const [idx, setIdx] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingQuestions, setLoadingQuestions] = useState(true);

  const [textareaAnswers, setTextareaAnswers] = useState<Record<string, string>>({});
  const [chipSelections, setChipSelections] = useState<Record<string, Set<string>>>({});
  const [checkboxSelections, setCheckboxSelections] = useState<Record<string, Set<string>>>({});
  const [singleSelections, setSingleSelections] = useState<Record<string, string>>({});
  const [switchStates, setSwitchStates] = useState<Record<string, boolean>>({});

  useEffect(() => {
    async function loadQuestions() {
      setLoadingQuestions(true);
      try {
        const projectId = typeof window !== "undefined" ? localStorage.getItem("active_project_id") : undefined;
        const fetched = await api.interview.questions(projectId || undefined);
        if (fetched && fetched.length > 0) {
          const mapped = fetched.map((item: any) => ({
            id: item.id,
            question: item.question,
            type: item.type as QType,
            options: item.options || undefined,
            desc: item.description || undefined,
          }));
          setQuestions(mapped);
        } else {
          setQuestions(FALLBACK_QUESTIONS);
        }
      } catch (err) {
        console.error(err);
        setQuestions(FALLBACK_QUESTIONS);
      } finally {
        setLoadingQuestions(false);
      }
    }
    loadQuestions();
  }, []);

  const q = questions[idx];
  const progress = questions.length > 0 ? ((idx + 1) / questions.length) * 100 : 0;

  async function handleNext() {
    if (idx === questions.length - 1) {
      await submitAnswers();
    } else {
      setIdx((i) => i + 1);
    }
  }

  function back() {
    if (idx > 0) setIdx((i) => i - 1);
  }

  async function submitAnswers() {
    const projectId = typeof window !== "undefined" ? localStorage.getItem("active_project_id") : null;
    if (!projectId) return;

    setLoading(true);
    try {
      const payloadAnswers = questions.map((question) => {
        let answer: any = "";
        if (question.type === "textarea") {
          answer = textareaAnswers[question.id] || "";
        } else if (question.type === "chips") {
          answer = Array.from(chipSelections[question.id] || []);
        } else if (question.type === "checkbox") {
          answer = Array.from(checkboxSelections[question.id] || []);
        } else if (question.type === "radio" || question.type === "select") {
          answer = singleSelections[question.id] || "";
        } else if (question.type === "switch") {
          answer = switchStates[question.id] ?? false;
        }
        return {
          questionId: question.id,
          question: question.question,
          answer,
        };
      });

      if (payloadAnswers.length > 0) {
        await api.projects.saveAnswers(projectId, { answers: payloadAnswers });
      }
      navigate({ to: "/app/canvas" });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  if (loadingQuestions) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-12 flex flex-col items-center justify-center min-h-[60vh]">
        <div className="card-premium p-10 flex flex-col items-center gap-6 w-full text-center">
          {/* Animated AI icon */}
          <div className="relative flex items-center justify-center w-20 h-20">
            <span className="absolute inline-flex h-full w-full rounded-full bg-primary/20 animate-ping" />
            <span className="relative flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 border border-primary/30">
              <Sparkles className="h-7 w-7 text-primary animate-pulse" />
            </span>
          </div>

          <div>
            <h2 className="text-xl font-semibold mb-2">Menyiapkan Pertanyaan</h2>
            <p className="text-sm text-muted-foreground max-w-xs">
              AI sedang membuat pertanyaan yang dipersonalisasi untuk project Anda. Mohon tunggu sebentar…
            </p>
          </div>

          {/* Animated loading dots */}
          <div className="flex items-center gap-2">
            {[0, 1, 2, 3].map((i) => (
              <span
                key={i}
                className="inline-block w-2 h-2 rounded-full bg-primary"
                style={{
                  animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite`,
                }}
              />
            ))}
          </div>

          {/* Skeleton placeholders */}
          <div className="w-full space-y-3 mt-2">
            {[80, 60, 72].map((w, i) => (
              <div
                key={i}
                className="h-3 rounded-full bg-muted animate-pulse"
                style={{ width: `${w}%`, margin: "0 auto" }}
              />
            ))}
          </div>
        </div>

        <style>{`
          @keyframes bounce {
            0%, 80%, 100% { transform: translateY(0); opacity: 0.4; }
            40% { transform: translateY(-8px); opacity: 1; }
          }
        `}</style>
      </div>
    );
  }

  if (!q) return null;

  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      <div className="mb-8">
        <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {idx + 1} dari {questions.length} Pertanyaan
          </span>
          <span>{Math.round(progress)}%</span>
        </div>
        <Progress value={progress} className="h-1.5" />
      </div>

      <div className="card-premium p-8">
        <h2 className="text-xl font-semibold mb-3">{q.question}</h2>
        {q.desc && (
          <div className="mt-3 flex items-start gap-2 rounded-lg bg-emerald-500/10 p-3 text-xs text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <span className="font-semibold shrink-0">💡 Rekomendasi:</span>
            <span>{q.desc}</span>
          </div>
        )}

        <div className="mt-6">
          {q.type === "textarea" && (
            <Textarea
              placeholder="Tulis jawaban Anda di sini..."
              className="min-h-[140px]"
              value={textareaAnswers[q.id] || ""}
              onChange={(e) => setTextareaAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))}
              disabled={loading}
            />
          )}
          {q.type === "chips" && (
            <div className="flex flex-wrap gap-2">
              {q.options?.map((o) => {
                const sel = chipSelections[q.id]?.has(o);
                return (
                  <button
                    key={o}
                    type="button"
                    disabled={loading}
                    onClick={() =>
                      setChipSelections((prev) => {
                        const s = new Set(prev[q.id] ?? []);
                        if (s.has(o)) s.delete(o);
                        else s.add(o);
                        return { ...prev, [q.id]: s };
                      })
                    }
                    className={cn(
                      "rounded-full border px-3.5 py-1.5 text-sm transition",
                      sel
                        ? "border-primary/40 bg-primary/15 text-primary"
                        : "border-border text-muted-foreground hover:border-primary/30 hover:text-foreground",
                    )}
                  >
                    {o}
                  </button>
                );
              })}
            </div>
          )}
          {q.type === "checkbox" && (
            <div className="grid grid-cols-2 gap-3">
              {q.options?.map((o) => {
                const checked = checkboxSelections[q.id]?.has(o) ?? false;
                return (
                  <label key={o} className="flex items-center gap-2 rounded-md border border-border p-3 text-sm cursor-pointer">
                    <Checkbox
                      checked={checked}
                      disabled={loading}
                      onCheckedChange={(val) => {
                        setCheckboxSelections((prev) => {
                          const s = new Set(prev[q.id] ?? []);
                          if (val) s.add(o);
                          else s.delete(o);
                          return { ...prev, [q.id]: s };
                        });
                      }}
                    /> {o}
                  </label>
                );
              })}
            </div>
          )}
          {q.type === "radio" && (
            <RadioGroup
              className="space-y-2"
              value={singleSelections[q.id] || ""}
              onValueChange={(val) => setSingleSelections((prev) => ({ ...prev, [q.id]: val }))}
              disabled={loading}
            >
              {q.options?.map((o) => (
                <label key={o} className="flex items-center gap-3 rounded-md border border-border p-3 text-sm cursor-pointer">
                  <RadioGroupItem value={o} id={o} />
                  <span>{o}</span>
                </label>
              ))}
            </RadioGroup>
          )}
          {q.type === "select" && (
            <Select
              value={singleSelections[q.id] || ""}
              onValueChange={(val) => setSingleSelections((prev) => ({ ...prev, [q.id]: val }))}
              disabled={loading}
            >
              <SelectTrigger>
                <SelectValue placeholder="Pilih salah satu..." />
              </SelectTrigger>
              <SelectContent>
                {q.options?.map((o) => (
                  <SelectItem key={o} value={o}>
                    {o}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {q.type === "switch" && (
            <div className="flex items-center justify-between rounded-md border border-border p-4">
              <Label>Aktifkan</Label>
              <Switch
                checked={switchStates[q.id] ?? false}
                onCheckedChange={(val) => setSwitchStates((prev) => ({ ...prev, [q.id]: val }))}
                disabled={loading}
              />
            </div>
          )}
        </div>
      </div>

      <div className="mt-6 flex items-center justify-between">
        <Button variant="ghost" onClick={back} disabled={idx === 0 || loading}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Kembali
        </Button>
        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={handleNext} disabled={loading}>
            <SkipForward className="mr-2 h-4 w-4" /> Lewati
          </Button>
          <Button onClick={handleNext} disabled={loading}>
            {idx === questions.length - 1 ? (loading ? "Menyimpan..." : "Selesai") : "Lanjut"}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
