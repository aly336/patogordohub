import { createFileRoute } from "@tanstack/react-router";
import { RecoverPassword } from "@/components/admin/Auth";
export const Route = createFileRoute("/admin_/recuperar")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Recuperar senha | Pato Gordo" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: RecoverPassword,
});
