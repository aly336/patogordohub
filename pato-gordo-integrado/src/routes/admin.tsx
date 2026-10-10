import { createFileRoute } from "@tanstack/react-router";
import { AuthGate } from "@/components/admin/Auth";
import { Dashboard } from "@/components/admin/Dashboard";
export const Route = createFileRoute("/admin")({
  ssr: false,
  head: () => ({
    meta: [{ title: "Painel | Pato Gordo" }, { name: "robots", content: "noindex,nofollow" }],
  }),
  component: () => (
    <AuthGate>
      <Dashboard />
    </AuthGate>
  ),
});
