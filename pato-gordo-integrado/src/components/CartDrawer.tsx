import * as Dialog from "@radix-ui/react-dialog";
import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { Minus, Plus, Trash2, X } from "lucide-react";
import { useCart, lineUnit } from "@/lib/cart";
import { brl } from "@/lib/menu";
import { usePublicMenu, fetchCatalog } from "@/lib/public-menu";

type Mode = "Retirada" | "Entrega" | "Consumo no local";

export function CartDrawer() {
  const { addons: ADDONS, waLink, refetch, settings, isError } = usePublicMenu();
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState("");
  const { open, setOpen, lines, setQty, remove, subtotal } = useCart();
  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");
  const [mode, setMode] = useState<Mode>("Retirada");
  const [address, setAddress] = useState("");

  const canSend =
    !!settings?.whatsapp &&
    !isError &&
    !sending &&
    lines.length > 0 &&
    name.trim() &&
    (mode !== "Entrega" || address.trim());

  const send = async () => {
    if (!canSend) return;
    setSending(true);
    setNotice("");
    try {
      const fresh = await fetchCatalog();
      const changed = lines.some((l) => {
        const p = fresh.products.find((p) => p.id === l.product.id);
        return (
          !p?.available ||
          p.price_cents !== l.product.price ||
          l.addons.some(
            (id) =>
              fresh.addons.find((a) => a.id === id)?.price_cents !==
              ADDONS.find((a) => a.id === id)?.price,
          )
        );
      });
      if (changed || fresh.settings?.whatsapp !== settings?.whatsapp) {
        await refetch();
        setNotice("O cardápio foi atualizado. Revise o pedido e envie novamente.");
        return;
      }
      const items = lines
        .map((l) => {
          const ad = l.addons.map((id) => ADDONS.find((a) => a.id === id)?.name).filter(Boolean);
          return `• ${l.qty}x ${l.product.name}${ad.length ? ` (+ ${ad.join(", ")})` : ""} — ${brl(lineUnit(l, ADDONS) * l.qty)}`;
        })
        .join("\n");
      const msg = [
        "🦆 *Pedido — Pato Gordo*",
        "",
        items,
        "",
        `*Subtotal:* ${brl(subtotal)}`,
        mode === "Entrega" ? "*Taxa de entrega:* a confirmar" : "",
        "",
        `*Nome:* ${name}`,
        `*Modalidade:* ${mode}`,
        mode === "Entrega" ? `*Endereço:* ${address}` : "",
        notes ? `*Observações:* ${notes}` : "",
      ]
        .filter((x, i, arr) => x !== "" || arr[i - 1] !== "")
        .join("\n");
      const link = waLink(msg);
      if (link) window.location.assign(link);
    } catch {
      setNotice("Não foi possível conferir o cardápio. Tente novamente.");
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <AnimatePresence>
        {open && (
          <Dialog.Portal forceMount>
            <motion.div
              className="fixed inset-0 z-[60] bg-background/70 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
            />
            <Dialog.Content forceMount asChild aria-describedby={undefined}>
              <motion.aside
                className="fixed right-0 top-0 z-[61] flex h-full w-full max-w-md flex-col border-l bg-card"
                initial={{ x: "100%" }}
                animate={{ x: 0 }}
                exit={{ x: "100%" }}
                transition={{ type: "spring", damping: 30, stiffness: 260 }}
                aria-label="Seu pedido"
              >
                <div className="flex items-center justify-between border-b p-5">
                  <Dialog.Title asChild>
                    <h2 className="text-3xl">Seu pedido</h2>
                  </Dialog.Title>
                  <button
                    onClick={() => setOpen(false)}
                    aria-label="Fechar"
                    className="rounded-full p-2 hover:bg-muted"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="flex-1 space-y-5 overflow-y-auto p-5">
                  {lines.length === 0 ? (
                    <p className="py-16 text-center text-muted-foreground">
                      Seu carrinho está vazio. Bora escolher um lanche?
                    </p>
                  ) : (
                    <ul className="space-y-3">
                      {lines.map((l) => (
                        <li key={l.key} className="rounded-xl bg-muted p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="font-bold">{l.product.name}</p>
                              {l.addons.length > 0 && (
                                <p className="text-xs text-muted-foreground">
                                  +{" "}
                                  {l.addons
                                    .map((id) => ADDONS.find((a) => a.id === id)?.name)
                                    .join(", ")}
                                </p>
                              )}
                            </div>
                            <button
                              onClick={() => remove(l.key)}
                              aria-label="Remover"
                              className="shrink-0 text-muted-foreground hover:text-ember"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                          <div className="mt-3 flex items-center justify-between">
                            <div className="flex items-center gap-1 rounded-full bg-background p-1">
                              <button
                                onClick={() => setQty(l.key, l.qty - 1)}
                                className="rounded-full p-1.5 hover:bg-muted"
                                aria-label="Diminuir"
                              >
                                <Minus className="h-4 w-4" />
                              </button>
                              <span className="w-6 text-center font-bold">{l.qty}</span>
                              <button
                                onClick={() => setQty(l.key, l.qty + 1)}
                                className="rounded-full p-1.5 hover:bg-muted"
                                aria-label="Aumentar"
                              >
                                <Plus className="h-4 w-4" />
                              </button>
                            </div>
                            <span className="font-bold text-gold">
                              {brl(lineUnit(l, ADDONS) * l.qty)}
                            </span>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}

                  {lines.length > 0 && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-3 gap-2">
                        {(["Retirada", "Entrega", "Consumo no local"] as Mode[]).map((m) => (
                          <button
                            key={m}
                            onClick={() => setMode(m)}
                            className={`rounded-xl border px-2 py-3 text-xs font-bold transition ${mode === m ? "border-primary bg-primary text-primary-foreground" : "hover:border-primary"}`}
                          >
                            {m}
                          </button>
                        ))}
                      </div>
                      <input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        aria-label="Seu nome"
                        maxLength={120}
                        placeholder="Seu nome *"
                        className="w-full rounded-xl border bg-background px-4 py-3 outline-none focus:border-primary"
                      />
                      {mode === "Entrega" && (
                        <input
                          value={address}
                          onChange={(e) => setAddress(e.target.value)}
                          aria-label="Endereço completo"
                          maxLength={500}
                          placeholder="Endereço completo *"
                          className="w-full rounded-xl border bg-background px-4 py-3 outline-none focus:border-primary"
                        />
                      )}
                      <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        aria-label="Observações"
                        maxLength={1000}
                        placeholder="Observações (ex: sem cebola)"
                        rows={2}
                        className="w-full resize-none rounded-xl border bg-background px-4 py-3 outline-none focus:border-primary"
                      />
                    </div>
                  )}
                </div>

                {lines.length > 0 && (
                  <div className="space-y-3 border-t p-5">
                    {notice && (
                      <p role="status" className="text-sm text-gold">
                        {notice}
                      </p>
                    )}
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>Subtotal</span>
                      <span className="text-lg font-bold text-foreground">{brl(subtotal)}</span>
                    </div>
                    {mode === "Entrega" && (
                      <p className="text-xs text-muted-foreground">
                        Taxa de entrega a confirmar pelo WhatsApp.
                      </p>
                    )}
                    <button
                      disabled={!canSend}
                      onClick={send}
                      className="w-full rounded-full bg-whatsapp py-4 font-display text-xl uppercase tracking-wide text-primary-foreground transition hover:brightness-110 disabled:opacity-40"
                    >
                      Enviar pedido no WhatsApp
                    </button>
                  </div>
                )}
              </motion.aside>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  );
}
