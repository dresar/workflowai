import { createFileRoute } from "@tanstack/react-router";
import { Eye, Pencil, ShoppingCart, Building2, Users, Store, FileText, MessageSquare, Briefcase, LayoutDashboard, User, BookOpen, GraduationCap, Hospital } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { AdminPage } from "@/components/admin-page";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/admin/templates")({
  component: TemplatesPage,
});

const TEMPLATES: Array<{ name: string; cat: string; icon: LucideIcon; features: number; grad: string }> = [
  { name: "Marketplace", cat: "E-Commerce", icon: ShoppingCart, features: 24, grad: "from-primary/30 to-chart-2/20" },
  { name: "ERP", cat: "Enterprise", icon: Building2, features: 42, grad: "from-chart-3/30 to-primary/20" },
  { name: "CRM", cat: "Enterprise", icon: Users, features: 28, grad: "from-chart-2/30 to-chart-4/20" },
  { name: "POS", cat: "Retail", icon: Store, features: 18, grad: "from-chart-4/30 to-primary/20" },
  { name: "Landing Page", cat: "Marketing", icon: FileText, features: 8, grad: "from-primary/30 to-chart-5/20" },
  { name: "AI Chat", cat: "AI", icon: MessageSquare, features: 14, grad: "from-chart-3/30 to-chart-2/20" },
  { name: "Company Profile", cat: "Marketing", icon: Briefcase, features: 10, grad: "from-chart-2/30 to-primary/20" },
  { name: "Dashboard Admin", cat: "SaaS", icon: LayoutDashboard, features: 22, grad: "from-primary/30 to-chart-3/20" },
  { name: "Portfolio", cat: "Personal", icon: User, features: 6, grad: "from-chart-5/30 to-chart-4/20" },
  { name: "Blog", cat: "Content", icon: BookOpen, features: 12, grad: "from-chart-4/30 to-chart-2/20" },
  { name: "Sekolah", cat: "Education", icon: GraduationCap, features: 30, grad: "from-chart-2/30 to-primary/20" },
  { name: "Rumah Sakit", cat: "Health", icon: Hospital, features: 34, grad: "from-chart-3/30 to-chart-5/20" },
];

function TemplatesPage() {
  return (
    <AdminPage title="Template Project" subtitle="Koleksi template siap pakai untuk pengguna">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {TEMPLATES.map((t) => (
          <div key={t.name} className="card-premium overflow-hidden">
            <div className={`relative flex h-32 items-center justify-center bg-gradient-to-br ${t.grad}`}>
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-background/40 text-foreground backdrop-blur">
                <t.icon size={24} />
              </div>
            </div>
            <div className="p-4">
              <div className="flex items-center justify-between">
                <div className="font-semibold">{t.name}</div>
                <Badge variant="secondary" className="text-[10px]">{t.cat}</Badge>
              </div>
              <div className="mt-1 text-xs text-muted-foreground">{t.features} fitur</div>
              <div className="mt-4 flex gap-2">
                <Button size="sm" variant="outline" className="flex-1">
                  <Eye className="mr-2 h-3.5 w-3.5" /> Preview
                </Button>
                <Button size="sm" variant="outline" className="flex-1">
                  <Pencil className="mr-2 h-3.5 w-3.5" /> Edit
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </AdminPage>
  );
}
