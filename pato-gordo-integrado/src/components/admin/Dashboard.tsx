import { useEffect, useRef, useState, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BarChart3,
  Utensils,
  Tags,
  Flame,
  Images,
  Settings,
  Users,
  LogOut,
  Menu,
  ArrowUp,
  ArrowDown,
  Plus,
  ExternalLink,
  X,
} from "lucide-react";
import {
  activePromotion,
  addonSchema,
  categorySchema,
  money,
  moneyInput,
  parseMoney,
  safeError,
  type CategoryRow,
  type AddonRow,
} from "@/lib/catalog";
import { db } from "@/lib/supabase";
import { deleteRow, loadAdmin, saveRow, type AdminData, type RunAction } from "./data";
import { ProductEditor } from "./ProductEditor";
import { PromotionEditor } from "./PromotionEditor";
import { MediaLibrary } from "./Media";
import { SettingsEditor } from "./Settings";
import { buttonClass, CheckField, inputClass, Panel, secondaryClass, TextField } from "./fields";

const sections = [
  ["Visão geral", BarChart3],
  ["Cardápio", Utensils],
  ["Categorias", Tags],
  ["Promoções", Flame],
  ["Banners e imagens", Images],
  ["Configurações do site", Settings],
  ["Administradores autorizados", Users],
] as const;
type Section = (typeof sections)[number][0];
export function Dashboard() {
  const [section, setSection] = useState<Section>("Visão geral");
  const [mobile, setMobile] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [failed, setFailed] = useState(false);
  const [dirty, setDirty] = useState(false);
  const lock = useRef(false);
  const cache = useQueryClient();
  const query = useQuery({
    queryKey: ["admin", "data"],
    queryFn: loadAdmin,
    retry: 1,
    refetchOnWindowFocus: false,
  });
  useEffect(() => {
    const unload = (e: BeforeUnloadEvent) => {
      if (dirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", unload);
    return () => window.removeEventListener("beforeunload", unload);
  }, [dirty]);
  const run: RunAction = async (action, success = "Alteração salva.") => {
    if (lock.current) return false;
    lock.current = true;
    setBusy(true);
    setMessage("");
    setFailed(false);
    try {
      await action();
      setDirty(false);
      await Promise.all([
        cache.invalidateQueries({ queryKey: ["admin"] }),
        cache.invalidateQueries({ queryKey: ["catalog"] }),
      ]);
      setMessage(success);
      return true;
    } catch (error) {
      setFailed(true);
      setMessage(safeError(error));
      return false;
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  function navigate(next: Section) {
    if (busy) return;
    if (dirty && !window.confirm("Descartar alterações ainda não salvas?")) return;
    setSection(next);
    setDirty(false);
    setMobile(false);
    setMessage("");
  }
  async function logout() {
    if (dirty && !window.confirm("Sair e descartar alterações não salvas?")) return;
    await run(async () => {
      const { error } = await db().auth.signOut();
      if (error) throw error;
    }, "Sessão encerrada.");
  }
  const data = query.data;
  return (
    <div className="min-h-svh lg:grid lg:grid-cols-[260px_minmax(0,1fr)]">
      <aside
        className={`${mobile ? "block" : "hidden"} fixed inset-0 z-50 overflow-y-auto border-r bg-card p-5 lg:sticky lg:top-0 lg:block lg:h-svh`}
      >
        <div className="mb-10 flex items-center gap-3">
          <img src="/images/logo.png" alt="" width="56" height="56" />
          <div>
            <p className="font-display text-2xl uppercase">Pato Gordo</p>
            <p className="mt-1 text-xs text-primary">PAINEL DOS PROPRIETÁRIOS</p>
          </div>
          <button
            className="ml-auto p-2 lg:hidden"
            aria-label="Fechar navegação"
            onClick={() => setMobile(false)}
          >
            <X />
          </button>
        </div>
        <nav aria-label="Painel administrativo" className="space-y-2">
          {sections.map(([name, Icon]) => (
            <button
              key={name}
              onClick={() => navigate(name)}
              aria-current={section === name ? "page" : undefined}
              className={`flex min-h-12 w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm transition ${section === name ? "bg-primary text-primary-foreground font-bold" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}
            >
              <Icon size={18} className="shrink-0" />
              {name}
            </button>
          ))}
        </nav>
        <div className="mt-10 space-y-2 border-t pt-5">
          <a
            href="/"
            target="_blank"
            rel="noreferrer"
            className="flex min-h-11 items-center gap-3 px-4 text-sm"
          >
            <ExternalLink size={18} />
            Abrir site
          </a>
          <button
            disabled={busy}
            onClick={logout}
            className="flex min-h-11 items-center gap-3 px-4 text-sm text-muted-foreground"
          >
            <LogOut size={18} />
            Sair
          </button>
        </div>
      </aside>
      <main className="min-w-0 px-4 py-6 sm:px-8 lg:p-10">
        <header className="mb-8 flex items-start justify-between gap-4">
          <div>
            <p className="mb-3 font-hand text-2xl text-gold">tudo pronto pra servir</p>
            <h1 className="text-4xl leading-tight sm:text-5xl">{section}</h1>
            <p className="mt-3 text-sm text-muted-foreground">
              Gerencie a casa. As alterações chegam ao site automaticamente.
            </p>
          </div>
          <button
            onClick={() => setMobile(true)}
            aria-label="Abrir navegação"
            aria-expanded={mobile}
            className="rounded-xl border p-3 lg:hidden"
          >
            <Menu />
          </button>
        </header>
        {message && (
          <div
            role={failed ? "alert" : "status"}
            className={`mb-6 rounded-xl border p-4 text-sm ${failed ? "border-ember text-gold" : "border-primary text-foreground"}`}
          >
            {message}
          </div>
        )}
        {query.isPending && <p role="status">Carregando o painel…</p>}
        {query.isError && (
          <div role="alert">
            Não foi possível carregar os dados.{" "}
            <button className="underline" onClick={() => query.refetch()}>
              Tentar novamente
            </button>
          </div>
        )}
        {data && (
          <div
            onChangeCapture={(e) => {
              if ((e.target as HTMLElement).closest("form")) setDirty(true);
            }}
          >
            {section === "Visão geral" && <Overview data={data} />}{" "}
            {section === "Cardápio" && (
              <Products
                data={data}
                run={run}
                busy={busy}
                dirty={dirty}
                discard={() => setDirty(false)}
              />
            )}{" "}
            {section === "Categorias" && <Categories data={data} run={run} busy={busy} />}{" "}
            {section === "Promoções" && (
              <Promotions
                data={data}
                run={run}
                busy={busy}
                dirty={dirty}
                discard={() => setDirty(false)}
              />
            )}{" "}
            {section === "Banners e imagens" && (
              <MediaLibrary media={data.media} run={run} busy={busy} />
            )}{" "}
            {section === "Configurações do site" && (
              <SettingsEditor data={data} run={run} busy={busy} />
            )}{" "}
            {section === "Administradores autorizados" && <Owners run={run} busy={busy} />}
          </div>
        )}
      </main>
    </div>
  );
}
function Overview({ data }: { data: AdminData }) {
  const counts = [
    ["Produtos no cardápio", data.products.length],
    ["Publicados e disponíveis", data.products.filter((p) => p.published && p.available).length],
    ["Indisponíveis", data.products.filter((p) => !p.available).length],
    ["Promoções em vigor", data.promotions.filter((p) => activePromotion(p, Date.now())).length],
  ];
  return (
    <div className="space-y-7">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {counts.map(([label, count]) => (
          <article key={label} className="rounded-2xl border bg-card p-6">
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="mt-5 font-display text-5xl text-gold">{count}</p>
          </article>
        ))}
      </div>
      <Panel title="Cardápio por categoria">
        <div className="divide-y">
          {[...data.categories]
            .sort((a, b) => a.position - b.position)
            .map((c) => (
              <div key={c.id} className="flex justify-between gap-4 py-4">
                <span>
                  {c.name}
                  {!c.published && " · oculta"}
                </span>
                <strong>
                  {data.products.filter((p) => p.category_id === c.id).length} produtos
                </strong>
              </div>
            ))}
        </div>
      </Panel>
      <Panel title="Últimas alterações">
        {data.audit_log.length === 0 && <p>Nenhuma alteração registrada.</p>}
        <ul className="divide-y">
          {data.audit_log.map((a) => (
            <li key={a.id} className="flex flex-wrap justify-between gap-2 py-3 text-sm">
              <span>
                {(
                  { INSERT: "Inclusão", UPDATE: "Atualização", DELETE: "Exclusão" } as Record<
                    string,
                    string
                  >
                )[a.action] ?? a.action}{" "}
                ·{" "}
                {(
                  {
                    products: "produtos",
                    categories: "categorias",
                    promotions: "promoções",
                    media: "imagens",
                    site_settings: "configurações",
                    owners: "proprietários",
                    addons: "adicionais",
                    promotion_products: "produtos da campanha",
                  } as Record<string, string>
                )[a.entity] ?? a.entity}
              </span>
              <time className="text-muted-foreground">
                {new Date(a.created_at).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}
              </time>
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}
type ListProps = {
  data: AdminData;
  run: RunAction;
  busy: boolean;
  dirty: boolean;
  discard: () => void;
};
function Products({ data, run, busy, dirty, discard }: ListProps) {
  const [edit, setEdit] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const close = () => {
    if (dirty && !window.confirm("Descartar alterações não salvas?")) return;
    discard();
    setEdit(null);
  };
  const afterSave: RunAction = async (fn, msg) => {
    const ok = await run(fn, msg);
    if (ok) {
      discard();
      setEdit(null);
    }
    return ok;
  };
  if (edit)
    return (
      <ProductEditor
        key={edit}
        product={data.products.find((p) => p.id === edit) ?? null}
        data={data}
        run={afterSave}
        busy={busy}
        close={close}
      />
    );
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-3">
        <button className={buttonClass} onClick={() => setEdit("new")}>
          <Plus size={18} />
          Adicionar produto
        </button>
        <input
          aria-label="Buscar produtos"
          className={`${inputClass} sm:max-w-xs`}
          placeholder="Buscar no cardápio…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          aria-label="Filtrar categoria"
          className={`${inputClass} sm:max-w-xs`}
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          <option value="">Todas as categorias</option>
          {data.categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-3">
        {data.products
          .filter(
            (p) =>
              p.name.toLowerCase().includes(search.toLowerCase()) &&
              (!category || p.category_id === category),
          )
          .sort((a, b) => a.position - b.position || a.name.localeCompare(b.name))
          .map((p) => (
            <article
              key={p.id}
              className="flex flex-wrap items-center gap-4 rounded-2xl border bg-card p-5"
            >
              <div className="min-w-40 flex-1">
                <h2 className="font-sans text-lg font-bold normal-case leading-normal">{p.name}</h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  {data.categories.find((c) => c.id === p.category_id)?.name} · Ordem {p.position} ·{" "}
                  {p.published ? "Publicado" : "Oculto"} ·{" "}
                  {p.available ? "Disponível" : "Indisponível"}
                </p>
              </div>
              <strong className="text-gold">{money(p.price_cents)}</strong>
              <div className="flex flex-wrap gap-2">
                <button disabled={busy} className={secondaryClass} onClick={() => setEdit(p.id)}>
                  Editar
                </button>
                <button
                  disabled={busy}
                  className={secondaryClass}
                  onClick={() => run(() => saveRow("products", { available: !p.available }, p.id))}
                >
                  {p.available ? "Indisponibilizar" : "Disponibilizar"}
                </button>
                <button
                  disabled={busy}
                  className={secondaryClass}
                  onClick={() => run(() => saveRow("products", { published: !p.published }, p.id))}
                >
                  {p.published ? "Ocultar" : "Publicar"}
                </button>
                <button
                  disabled={busy}
                  className="rounded-full border p-3"
                  aria-label={`Subir ${p.name}`}
                  onClick={() =>
                    run(async () => {
                      const { error } = await db().rpc("move_product", {
                        target_id: p.id,
                        direction: -1,
                      });
                      if (error) throw error;
                    })
                  }
                >
                  <ArrowUp size={16} />
                </button>
                <button
                  disabled={busy}
                  className="rounded-full border p-3"
                  aria-label={`Descer ${p.name}`}
                  onClick={() =>
                    run(async () => {
                      const { error } = await db().rpc("move_product", {
                        target_id: p.id,
                        direction: 1,
                      });
                      if (error) throw error;
                    })
                  }
                >
                  <ArrowDown size={16} />
                </button>
                <button
                  disabled={busy}
                  className="min-h-11 px-3 text-sm text-muted-foreground underline"
                  onClick={() => {
                    if (window.confirm(`Excluir “${p.name}” do cardápio?`))
                      run(() => deleteRow("products", p.id), "Produto excluído.");
                  }}
                >
                  Excluir
                </button>
              </div>
            </article>
          ))}
        {!data.products.length && <p>Adicione seu primeiro produto para começar.</p>}
      </div>
      <Panel title="Adicionais">
        <SimpleList table="addons" rows={data.addons} run={run} busy={busy} />
      </Panel>
    </div>
  );
}
function Promotions({ data, run, busy, dirty, discard }: ListProps) {
  const [edit, setEdit] = useState<string | null>(null);
  const close = () => {
    if (dirty && !window.confirm("Descartar alterações não salvas?")) return;
    discard();
    setEdit(null);
  };
  const afterSave: RunAction = async (fn, msg) => {
    const ok = await run(fn, msg);
    if (ok) {
      discard();
      setEdit(null);
    }
    return ok;
  };
  if (edit)
    return (
      <PromotionEditor
        key={edit}
        promotion={data.promotions.find((p) => p.id === edit) ?? null}
        data={data}
        run={afterSave}
        busy={busy}
        close={close}
      />
    );
  return (
    <div className="space-y-5">
      <button className={buttonClass} onClick={() => setEdit("new")}>
        <Plus size={18} />
        Criar campanha
      </button>
      {data.promotions.length === 0 && (
        <Panel title="A próxima oferta começa aqui">
          <p className="text-muted-foreground">
            Crie a campanha, escolha os produtos e defina a validade. Só promoções ativas e dentro
            do período aparecem no site.
          </p>
        </Panel>
      )}
      {[...data.promotions]
        .sort((a, b) => a.position - b.position)
        .map((p) => (
          <article key={p.id} className="rounded-2xl border bg-card p-5">
            <div className="flex flex-wrap justify-between gap-4">
              <div>
                <h2 className="text-3xl">{p.name}</h2>
                <p className="mt-3 text-gold">
                  <s className="mr-2 text-muted-foreground">{money(p.original_price_cents)}</s>
                  {money(p.effective_price_cents)}
                </p>
                <p className="mt-2 text-xs text-muted-foreground">
                  {!p.active
                    ? "Inativa"
                    : Date.parse(p.ends_at) <= Date.now()
                      ? "Encerrada"
                      : Date.parse(p.starts_at) > Date.now()
                        ? "Agendada"
                        : "Em vigor"}{" "}
                  ·{" "}
                  {new Date(p.starts_at).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}{" "}
                  até{" "}
                  {new Date(p.ends_at).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}{" "}
                  (Brasília)
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button className={secondaryClass} onClick={() => setEdit(p.id)}>
                  Editar
                </button>
                <button
                  disabled={busy}
                  className={secondaryClass}
                  onClick={() => run(() => saveRow("promotions", { active: !p.active }, p.id))}
                >
                  {p.active ? "Desativar" : "Ativar"}
                </button>
                <button
                  disabled={busy}
                  className={secondaryClass}
                  onClick={() => {
                    if (window.confirm(`Excluir a campanha “${p.name}”?`))
                      run(() => deleteRow("promotions", p.id), "Campanha excluída.");
                  }}
                >
                  Excluir
                </button>
              </div>
            </div>
          </article>
        ))}
    </div>
  );
}
function Categories({ data, run, busy }: { data: AdminData; run: RunAction; busy: boolean }) {
  return (
    <Panel title="Categorias do cardápio">
      <p className="mb-5 text-sm text-muted-foreground">
        Ocultar uma categoria também oculta seus produtos. Para excluir, mova os produtos para outra
        categoria primeiro.
      </p>
      <SimpleList table="categories" rows={data.categories} run={run} busy={busy} />
    </Panel>
  );
}
function SimpleList({
  table,
  rows,
  run,
  busy,
}: {
  table: "categories" | "addons";
  rows: (CategoryRow | AddonRow)[];
  run: RunAction;
  busy: boolean;
}) {
  const [edit, setEdit] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [position, setPosition] = useState("0");
  const [published, setPublished] = useState(true);
  const [price, setPrice] = useState("");
  function choose(row?: CategoryRow | AddonRow) {
    setEdit(row?.id ?? "new");
    setName(row?.name ?? "");
    setPosition(String(row?.position ?? rows.length));
    setPublished(row?.published ?? true);
    setPrice(row && "price_cents" in row ? moneyInput(row.price_cents) : "");
  }
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (
      await run(async () => {
        const fields = { name, position: Number(position), published };
        const payload =
          table === "addons"
            ? addonSchema.parse({ ...fields, price_cents: parseMoney(price) })
            : categorySchema.parse(fields);
        await saveRow(table, payload, edit === "new" ? undefined : edit!);
      })
    ) {
      setEdit(null);
    }
  }
  return (
    <div className="space-y-4">
      {edit ? (
        <form onSubmit={submit} className="space-y-4 rounded-xl border p-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField
              label="Nome"
              value={name}
              onChange={setName}
              required
              maxLength={table === "categories" ? 80 : 120}
            />
            <TextField
              label="Ordem"
              type="number"
              value={position}
              onChange={setPosition}
              required
            />
            {table === "addons" && (
              <TextField label="Preço (R$)" value={price} onChange={setPrice} required />
            )}
          </div>
          <CheckField label="Publicado" checked={published} onChange={setPublished} />
          <div className="flex gap-3">
            <button className={buttonClass} disabled={busy}>
              Salvar
            </button>
            <button
              type="button"
              className={secondaryClass}
              onClick={() => {
                if (window.confirm("Descartar este formulário?")) setEdit(null);
              }}
            >
              Cancelar
            </button>
          </div>
        </form>
      ) : (
        <button className={buttonClass} onClick={() => choose()}>
          Adicionar {table === "categories" ? "categoria" : "adicional"}
        </button>
      )}
      {[...rows]
        .sort((a, b) => a.position - b.position)
        .map((r) => (
          <div
            key={r.id}
            className="flex flex-wrap items-center justify-between gap-3 border-b py-3"
          >
            <div>
              <strong>{r.name}</strong>
              <p className="mt-1 text-xs text-muted-foreground">
                Ordem {r.position} · {r.published ? "Publicado" : "Oculto"}
                {"price_cents" in r ? ` · ${money(r.price_cents)}` : ""}
              </p>
            </div>
            <div className="flex gap-2">
              <button disabled={busy} className={secondaryClass} onClick={() => choose(r)}>
                Editar
              </button>
              <button
                disabled={busy}
                className={secondaryClass}
                onClick={() => {
                  if (window.confirm(`Excluir “${r.name}”?`))
                    run(() => deleteRow(table, r.id), "Registro excluído.");
                }}
              >
                Excluir
              </button>
            </div>
          </div>
        ))}
    </div>
  );
}
function Owners({ run, busy }: { run: RunAction; busy: boolean }) {
  const [email, setEmail] = useState("");
  const query = useQuery({
    queryKey: ["admin", "owners"],
    queryFn: async () => {
      const { data, error } = await db().rpc("list_owners");
      if (error) throw error;
      return data as { user_id: string; email: string; created_at: string }[];
    },
  });
  async function authorize(e: FormEvent) {
    e.preventDefault();
    if (
      await run(async () => {
        const { error } = await db().rpc("set_owner", { target_email: email, authorize: true });
        if (error) throw error;
      }, "Proprietário autorizado.")
    )
      setEmail("");
  }
  return (
    <Panel title="Quem pode administrar">
      <p className="mb-6 text-sm leading-relaxed text-muted-foreground">
        Para autorizar alguém, primeiro crie a conta pelo Supabase Auth e confirme o e-mail conforme
        o guia de proprietários. Depois informe aqui o e-mail exato. Não há cadastro público. O
        último proprietário não pode ser removido.
      </p>
      <form onSubmit={authorize} className="mb-7 flex flex-wrap items-end gap-3">
        <TextField
          label="E-mail da conta confirmada"
          type="email"
          required
          value={email}
          onChange={setEmail}
          maxLength={254}
        />
        <button className={buttonClass} disabled={busy}>
          Autorizar proprietário
        </button>
      </form>
      {query.isPending && <p>Conferindo proprietários…</p>}
      {query.isError && <p role="alert">Não foi possível carregar as autorizações.</p>}
      <ul className="divide-y">
        {query.data?.map((o) => (
          <li key={o.user_id} className="flex flex-wrap items-center justify-between gap-4 py-4">
            <span className="break-all">{o.email}</span>
            <button
              disabled={busy || query.data.length <= 1}
              className={secondaryClass}
              onClick={() => {
                if (window.confirm(`Revogar o acesso administrativo de ${o.email}?`))
                  run(async () => {
                    const { error } = await db().rpc("set_owner", {
                      target_email: o.email,
                      authorize: false,
                    });
                    if (error) throw error;
                  }, "Autorização revogada.");
              }}
            >
              Revogar acesso
            </button>
          </li>
        ))}
      </ul>
    </Panel>
  );
}
