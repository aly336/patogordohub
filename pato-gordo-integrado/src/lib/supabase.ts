import { createClient, type SupabaseClient } from "@supabase/supabase-js";
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;
export const configured =
  !!url && !!key && !url.includes("YOUR_PROJECT") && !key.includes("YOUR_PUBLIC");
let client: SupabaseClient | undefined;
export function db() {
  if (!configured) throw new Error("Supabase não configurado.");
  if (!client)
    client = createClient(url!, key!, {
      auth: {
        persistSession: typeof window !== "undefined",
        autoRefreshToken: typeof window !== "undefined",
        detectSessionInUrl: typeof window !== "undefined",
        flowType: "pkce",
      },
    });
  return client;
}
export function imageUrl(media: { path: string } | undefined): string | undefined {
  if (!media) return undefined;
  if (media.path.startsWith("original/")) return `/images/${media.path.slice(9)}`;
  return db().storage.from("restaurant").getPublicUrl(media.path).data.publicUrl;
}
