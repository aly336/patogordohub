import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { type Addon, type Product } from "./menu";
import { usePublicMenu } from "./public-menu";

export interface CartLine {
  key: string;
  product: Product;
  qty: number;
  addons: string[];
}

interface CartCtx {
  lines: CartLine[];
  open: boolean;
  setOpen: (v: boolean) => void;
  add: (p: Product, addons?: string[], qty?: number) => void;
  setQty: (key: string, qty: number) => void;
  remove: (key: string) => void;
  clear: () => void;
  count: number;
  subtotal: number;
}

const Ctx = createContext<CartCtx | null>(null);

export const lineUnit = (l: CartLine, ADDONS: Addon[]) =>
  l.product.price +
  l.addons.reduce((s, id) => s + (ADDONS.find((a) => a.id === id)?.price ?? 0), 0);

export function CartProvider({ children }: { children: ReactNode }) {
  const { products, addons: ADDONS } = usePublicMenu();
  const [stored, setLines] = useState<CartLine[]>([]);
  const lines = useMemo(
    () =>
      stored.flatMap((l) => {
        const p = products.find((p) => p.id === l.product.id && p.available);
        return p
          ? [{ ...l, product: p, addons: l.addons.filter((id) => ADDONS.some((a) => a.id === id)) }]
          : [];
      }),
    [stored, products, ADDONS],
  );
  const [open, setOpen] = useState(false);

  const value = useMemo<CartCtx>(() => {
    const add = (p: Product, addons: string[] = [], qty = 1) => {
      const key = `${p.id}|${[...addons].sort().join(",")}`;
      setLines((ls) => {
        const ex = ls.find((l) => l.key === key);
        if (ex) return ls.map((l) => (l.key === key ? { ...l, qty: l.qty + qty } : l));
        return [...ls, { key, product: p, qty, addons }];
      });
    };
    return {
      lines,
      open,
      setOpen,
      add,
      setQty: (key, qty) =>
        setLines((ls) =>
          qty <= 0
            ? ls.filter((l) => l.key !== key)
            : ls.map((l) => (l.key === key ? { ...l, qty } : l)),
        ),
      remove: (key) => setLines((ls) => ls.filter((l) => l.key !== key)),
      clear: () => setLines([]),
      count: lines.reduce((s, l) => s + l.qty, 0),
      subtotal: lines.reduce((s, l) => s + lineUnit(l, ADDONS) * l.qty, 0),
    };
  }, [lines, open, ADDONS]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCart() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useCart outside CartProvider");
  return c;
}
