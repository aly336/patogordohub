import { z } from "zod";

export interface Media {
  id: string;
  name: string;
  path: string;
  mime_type: string;
  size_bytes: number;
  alt: string;
}
export interface CategoryRow {
  id: string;
  name: string;
  position: number;
  published: boolean;
}
export interface ProductRow {
  id: string;
  name: string;
  description: string;
  ingredients: string;
  category_id: string;
  price_cents: number;
  image_id: string | null;
  featured: boolean;
  available: boolean;
  published: boolean;
  position: number;
  tag: string;
}
export interface AddonRow {
  id: string;
  name: string;
  price_cents: number;
  published: boolean;
  position: number;
}
export interface Promotion {
  id: string;
  name: string;
  description: string;
  image_id: string | null;
  original_price_cents: number;
  promo_price_cents: number | null;
  discount_percent: number | null;
  effective_price_cents: number;
  starts_at: string;
  ends_at: string;
  active: boolean;
  position: number;
}
export interface Settings {
  id: number;
  name: string;
  address: string;
  whatsapp: string;
  instagram: string;
  hours: string;
  headline: string;
  order_url: string;
  maps_url: string;
  logo_id: string | null;
  hero_id: string | null;
  combo_id: string | null;
  lunch_id: string | null;
  about_id: string | null;
  hide_unavailable: boolean;
}
export interface Catalog {
  server_now: string;
  settings: Settings | null;
  media: Media[];
  categories: CategoryRow[];
  products: ProductRow[];
  addons: AddonRow[];
  promotions: Promotion[];
}

export const money = (cents: number) =>
  (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
export function parseMoney(value: string): number {
  const clean = value.trim().replace(",", ".");
  if (!/^\d{1,7}(\.\d{1,2})?$/.test(clean))
    throw new Error("Use um valor válido com até duas casas decimais.");
  const [whole = "0", fraction = ""] = clean.split(".");
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  if (cents < 1 || cents > 100000000)
    throw new Error("O preço deve estar entre R$ 0,01 e R$ 1.000.000,00.");
  return cents;
}
export const moneyInput = (cents: number) => (cents / 100).toFixed(2);
export const activePromotion = (p: Promotion, now: number) =>
  p.active && Date.parse(p.starts_at) <= now && Date.parse(p.ends_at) > now;
export const discountedPrice = (original: number, percent: number) =>
  Math.round((original * (100 - percent)) / 100);
const text = (max: number) => z.string().trim().min(1).max(max);
const cents = z.number().int().min(1).max(100000000);
const position = z.number().int().min(0).max(100000);
export const productSchema = z.object({
  name: text(120),
  description: z.string().max(2000),
  ingredients: z.string().max(2000),
  category_id: z.string().uuid(),
  price_cents: cents,
  image_id: z.string().uuid().nullable(),
  featured: z.boolean(),
  available: z.boolean(),
  published: z.boolean(),
  position,
  tag: z.string().max(40),
});
export const categorySchema = z.object({ name: text(80), position, published: z.boolean() });
export const addonSchema = z.object({
  name: text(120),
  price_cents: cents,
  position,
  published: z.boolean(),
});
export const promotionSchema = z
  .object({
    name: text(120),
    description: z.string().max(2000),
    image_id: z.string().uuid().nullable(),
    original_price_cents: cents,
    promo_price_cents: cents.nullable(),
    discount_percent: z.number().int().min(1).max(99).nullable(),
    starts_at: z.string().datetime(),
    ends_at: z.string().datetime(),
    active: z.boolean(),
    position,
  })
  .superRefine((p, ctx) => {
    if ((p.promo_price_cents === null) === (p.discount_percent === null))
      ctx.addIssue({ code: "custom", message: "Escolha preço promocional ou percentual." });
    const effective =
      p.promo_price_cents ?? discountedPrice(p.original_price_cents, p.discount_percent ?? 0);
    if (effective < 1 || effective >= p.original_price_cents)
      ctx.addIssue({ code: "custom", message: "O desconto deve reduzir o preço sem zerá-lo." });
    if (Date.parse(p.ends_at) <= Date.parse(p.starts_at))
      ctx.addIssue({ code: "custom", message: "O término deve ser posterior ao início." });
  });
const httpsUrl = z.union([
  z.literal(""),
  z
    .string()
    .url()
    .refine((v) => v.startsWith("https://") && !/\s/.test(v), "Use um endereço HTTPS."),
]);
export const settingsSchema = z.object({
  name: text(120),
  address: text(500),
  whatsapp: z.string().regex(/^$|^[1-9]\d{9,14}$/),
  instagram: z.string().regex(/^$|^https:\/\/(www\.)?instagram\.com\/[a-zA-Z0-9_.]+\/?$/),
  hours: z.string().max(1000),
  headline: z.string().max(180),
  order_url: httpsUrl,
  maps_url: httpsUrl,
  logo_id: z.string().uuid().nullable(),
  hero_id: z.string().uuid().nullable(),
  combo_id: z.string().uuid().nullable(),
  lunch_id: z.string().uuid().nullable(),
  about_id: z.string().uuid().nullable(),
  hide_unavailable: z.boolean(),
});
export function safeError(error: unknown): string {
  if (error instanceof z.ZodError) return "Revise os campos, limites e datas do formulário.";
  if (
    error instanceof Error &&
    (error.message.startsWith("Use ") || error.message.startsWith("O preço"))
  )
    return error.message;
  const code = (error as { code?: string })?.code;
  if (code === "23503") return "Este registro está em uso. Remova as referências antes de excluir.";
  if (code === "42501")
    return "Sua conta não tem permissão. Entre novamente ou consulte um proprietário.";
  if (code === "23505") return "Já existe um registro com esse nome.";
  return "Não foi possível concluir. Confira os dados e a conexão e tente novamente.";
}
