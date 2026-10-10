import { db } from "@/lib/supabase";
import type { AddonRow, CategoryRow, Media, ProductRow, Promotion, Settings } from "@/lib/catalog";
export interface AdminData {
  products: ProductRow[];
  categories: CategoryRow[];
  addons: AddonRow[];
  promotions: Promotion[];
  media: Media[];
  site_settings: Settings[];
  promotion_products: { promotion_id: string; product_id: string }[];
  audit_log: { id: number; action: string; entity: string; created_at: string }[];
}
export type EditableTable =
  "products" | "categories" | "addons" | "promotions" | "media" | "site_settings";
export async function loadAdmin(): Promise<AdminData> {
  const tables = [
    "products",
    "categories",
    "addons",
    "promotions",
    "media",
    "site_settings",
    "promotion_products",
    "audit_log",
  ] as const;
  const entries = await Promise.all(
    tables.map(async (table) => {
      const query = db().from(table).select("*");
      const { data, error } = await (table === "audit_log"
        ? query.order("created_at", { ascending: false }).limit(15)
        : query);
      if (error) throw error;
      return [table, data ?? []];
    }),
  );
  return Object.fromEntries(entries) as unknown as AdminData;
}
export async function saveRow(table: EditableTable, value: object, id?: string | number) {
  const query = id ? db().from(table).update(value).eq("id", id) : db().from(table).insert(value);
  const { error } = await query.select("id").single();
  if (error) throw error;
}
export async function deleteRow(table: EditableTable, id: string | number) {
  const { error } = await db().from(table).delete().eq("id", id).select("id").single();
  if (error) throw error;
}
export type RunAction = (action: () => Promise<void>, message?: string) => Promise<boolean>;
