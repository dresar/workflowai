import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { getUser } from "@/lib/auth";

export const Route = createFileRoute("/")({
  component: IndexPage,
});

function IndexPage() {
  const navigate = useNavigate();

  useEffect(() => {
    const u = getUser();
    if (u?.role === "admin") {
      navigate({ to: "/admin" });
    } else if (u?.role === "user") {
      navigate({ to: "/app" });
    } else {
      navigate({ to: "/login" });
    }
  }, [navigate]);

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-[#09090b] text-[#fafafa]">
      <div className="animate-pulse text-zinc-500 text-sm font-medium tracking-wide">
        Redirecting...
      </div>
    </div>
  );
}
