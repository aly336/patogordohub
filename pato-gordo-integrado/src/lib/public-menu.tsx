import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { activePromotion, type Catalog } from "./catalog";
import { configured, db, imageUrl } from "./supabase";

export async function fetchCatalog(): Promise<Catalog> {
  const { data, error } = await db().rpc("get_catalog");
  if (error) throw error;
  return data as Catalog;
}
function useCatalog() {
  const query = useQuery({
    queryKey: ["catalog"],
    queryFn: fetchCatalog,
    enabled: configured,
    refetchInterval: 15000,
    refetchOnWindowFocus: "always",
    retry: 1,
  });
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  const data = query.data;
  const settings = data?.settings;
  const asset = (id: string | null | undefined, fallback?: string) =>
    imageUrl(data?.media.find((m) => m.id === id)) ?? fallback;
  const serverNow = data
    ? Date.parse(data.server_now) + Math.max(0, now - query.dataUpdatedAt)
    : now;
  return {
    ...query,
    configured,
    settings,
    products: (data?.products ?? []).map((p) => ({
      ...p,
      category: p.category_id,
      price: p.price_cents,
      image: asset(p.image_id),
    })),
    categories: (data?.categories ?? []).map((c) => ({ ...c, label: c.name })),
    addons: (data?.addons ?? []).map((a) => ({ ...a, price: a.price_cents })),
    promotions: (data?.promotions ?? []).filter((p) => activePromotion(p, serverNow)),
    asset,
    logo: asset(settings?.logo_id, "/images/logo.png"),
    burger: asset(settings?.hero_id, "/images/burger.jpg"),
    combo: asset(settings?.combo_id, "/images/combo.jpg"),
    almoco: asset(settings?.lunch_id, "/images/almoco.jpg"),
    ambiente: asset(settings?.about_id, "/images/ambiente.jpg"),
    ADDRESS:
      settings?.address ??
      "R. Maria de Matos Libânio, San Genaro, Ribeirão das Neves – MG, 33825-360",
    PHONE_LABEL: settings?.whatsapp ?? "",
    INSTAGRAM: settings?.instagram || undefined,
    MAPS_QUERY: encodeURIComponent(
      settings?.address ??
        "R. Maria de Matos Libânio, San Genaro, Ribeirão das Neves – MG, 33825-360",
    ),
    HOURS: [{ day: "Horários", time: settings?.hours || "Consulte o restaurante" }],
    waLink: (text: string) =>
      settings?.whatsapp
        ? `https://wa.me/${settings.whatsapp}?text=${encodeURIComponent(text)}`
        : undefined,
  };
}
const Context = createContext<ReturnType<typeof useCatalog> | null>(null);
export function MenuProvider({ children }: { children: ReactNode }) {
  const catalog = useCatalog();
  return <Context.Provider value={catalog}>{children}</Context.Provider>;
}
export function usePublicMenu() {
  const value = useContext(Context);
  if (!value) throw new Error("MenuProvider ausente");
  return value;
}
