import { createFileRoute } from "@tanstack/react-router";
import {
  AnimatePresence,
  motion,
  useScroll,
  useTransform,
  useReducedMotion,
  type Variants,
} from "framer-motion";
import { useRef, useState, type ReactNode, type MouseEvent } from "react";
import {
  Menu,
  MapPin,
  Instagram,
  Phone,
  ShoppingBag,
  Star,
  X,
  Plus,
  Check,
  Utensils,
  Bike,
  Store,
} from "lucide-react";
import { CartProvider, useCart } from "@/lib/cart";
import { CartDrawer } from "@/components/CartDrawer";
import { brl, type Category, type Product } from "@/lib/menu";
import { MenuProvider, usePublicMenu } from "@/lib/public-menu";

const TITLE = "Pato Gordo — Bar e Hamburgueria em Ribeirão das Neves";
const DESC =
  "Hambúrguer artesanal, combos caprichados e almoço em San Genaro, Ribeirão das Neves (MG). Monte seu pedido e envie pelo WhatsApp.";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
    ],
  }),
  component: () => (
    <MenuProvider>
      <CartProvider>
        <Page />
      </CartProvider>
    </MenuProvider>
  ),
});

const ease = [0.22, 1, 0.36, 1] as const;
const up: Variants = {
  hidden: { opacity: 0, y: 40 },
  show: { opacity: 1, y: 0, transition: { duration: 0.8, ease } },
};

function Reveal({
  children,
  className,
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-80px" }}
      variants={up}
      transition={{ delay }}
    >
      {children}
    </motion.div>
  );
}

const NAV = [
  ["Início", "#inicio"],
  ["Cardápio", "#cardapio"],
  ["Combos", "#combos"],
  ["Promoções", "#promocoes"],
  ["Sobre Nós", "#sobre"],
  ["Localização", "#localizacao"],
] as const;

function Page() {
  return (
    <div className="relative">
      <Header />
      <main>
        <Hero />
        <Marquee />
        <Cardapio />
        <Combos />
        <Promocoes />
        <Almoco />
        <Sobre />
        <Avaliacoes />
        <Localizacao />
      </main>
      <Footer />
      <FloatingWhats />
      <MobileBar />
      <CartDrawer />
    </div>
  );
}

/* ---------------- HEADER ---------------- */
function Header() {
  const { logo, settings } = usePublicMenu();
  const { count, setOpen } = useCart();
  const [menu, setMenu] = useState(false);
  return (
    <motion.header
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.2, ease }}
      className="fixed inset-x-0 top-0 z-50 border-b border-transparent bg-background/60 backdrop-blur-md"
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <a href="#inicio" className="flex shrink-0 items-center gap-3">
          <img src={logo} alt="Logotipo Pato Gordo" className="h-12 w-12 sm:h-14 sm:w-14" />
          <span className="hidden font-display text-xl uppercase leading-none sm:block">
            {!settings?.name || settings.name === "Pato Gordo" ? (
              <>
                Pato
                <br />
                <span className="text-primary">Gordo</span>
              </>
            ) : (
              settings.name
            )}
          </span>
        </a>
        <nav className="hidden items-center gap-7 lg:flex">
          {NAV.map(([l, h]) => (
            <a
              key={h}
              href={h}
              className="text-sm font-semibold text-muted-foreground transition hover:text-primary"
            >
              {l}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setOpen(true)}
            className="relative rounded-full border p-3 transition hover:border-primary"
            aria-label="Abrir carrinho"
          >
            <ShoppingBag className="h-5 w-5" />
            {count > 0 && (
              <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-ember px-1 text-xs font-bold text-accent-foreground">
                {count}
              </span>
            )}
          </button>
          <a
            href="#cardapio"
            className="hidden rounded-full bg-primary px-6 py-3 font-display text-lg uppercase tracking-wide text-primary-foreground shadow-ember transition hover:scale-105 sm:block"
          >
            Pedir agora
          </a>
          <button
            onClick={() => setMenu(true)}
            className="rounded-full border p-3 lg:hidden"
            aria-label="Abrir menu"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </div>
      <AnimatePresence>
        {menu && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] flex flex-col bg-background p-6 lg:hidden"
          >
            <div className="flex justify-between">
              <img src={logo} alt="Pato Gordo" className="h-14 w-14" />
              <button
                onClick={() => setMenu(false)}
                className="rounded-full border p-3"
                aria-label="Fechar menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="mt-10 flex flex-col gap-2">
              {NAV.map(([l, h], i) => (
                <motion.a
                  key={h}
                  href={h}
                  onClick={() => setMenu(false)}
                  initial={{ opacity: 0, x: -30 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.05 * i }}
                  className="font-display text-5xl uppercase hover:text-primary"
                >
                  {l}
                </motion.a>
              ))}
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
}

/* ---------------- HERO ---------------- */
function Hero() {
  const { logo, burger, waLink, settings } = usePublicMenu();
  const reduced = useReducedMotion();
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], [0, 140]);
  const scale = useTransform(scrollYProgress, [0, 1], [1, 1.12]);
  const words = ["A fome", "bateu?"];
  return (
    <section id="inicio" ref={ref} className="grain relative min-h-[100svh] overflow-hidden pt-24">
      <div className="pointer-events-none absolute inset-0 bg-glow" />
      <div className="mx-auto grid max-w-7xl items-center gap-8 px-4 pb-16 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:pb-0">
        <div className="relative z-10 pt-8 lg:pt-0">
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="font-hand text-2xl text-gold sm:text-3xl"
          >
            Bar e Hamburgueria · Ribeirão das Neves
          </motion.p>
          <h1 className="mt-3 text-[clamp(3.5rem,11vw,8.5rem)]">
            {words.map((w, i) => (
              <motion.span
                key={w}
                className="block"
                initial={{ opacity: 0, y: 60 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.35 + i * 0.1, ease }}
              >
                {w}
              </motion.span>
            ))}
            <motion.span
              className="block text-fire"
              initial={{ opacity: 0, y: 60 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.55, ease }}
            >
              {settings?.headline || "O pato resolve!"}
            </motion.span>
          </h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.75, duration: 0.7 }}
            className="mt-6 max-w-md text-lg text-muted-foreground"
          >
            Do hambúrguer artesanal ao combo caprichado. Aqui o sabor chega pesado!
          </motion.p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <motion.a
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.9 }}
              href="#cardapio"
              className="rounded-full bg-primary px-8 py-4 text-center font-display text-xl uppercase tracking-wide text-primary-foreground shadow-ember transition hover:scale-105"
            >
              Ver cardápio
            </motion.a>
            <motion.a
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1 }}
              href={settings?.order_url || waLink("Olá, Pato Gordo! Quero fazer um pedido 🍔")}
              target="_blank"
              rel="noreferrer"
              className="rounded-full border-2 border-foreground/30 px-8 py-4 text-center font-display text-xl uppercase tracking-wide transition hover:border-whatsapp hover:text-whatsapp"
            >
              Pedir pelo WhatsApp
            </motion.a>
          </div>
        </div>

        <motion.div
          style={{ y: reduced ? 0 : y }}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.2, delay: 0.2, ease }}
          className="relative"
        >
          <div className="relative aspect-square overflow-hidden rounded-[2.5rem] shadow-deep lg:-mr-10 lg:rotate-2">
            <motion.img
              style={{ scale: reduced ? 1 : scale }}
              src={burger}
              alt="Hambúrguer artesanal com cheddar derretido"
              className="h-full w-full object-cover"
              fetchPriority="high"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background/60 via-transparent to-transparent" />
          </div>
          <motion.img
            initial={{ opacity: 0, scale: 0.6, rotate: -20 }}
            animate={{ opacity: 1, scale: 1, rotate: -8 }}
            transition={{ delay: 0.5, duration: 0.9, ease }}
            src={logo}
            alt=""
            className="absolute -bottom-8 -left-4 w-32 drop-shadow-2xl sm:w-44"
          />
          <motion.div
            initial={{ opacity: 0, rotate: 30 }}
            animate={{ opacity: 1, rotate: 12 }}
            transition={{ delay: 1.1 }}
            className="absolute -top-4 right-4 grid h-28 w-28 place-items-center rounded-full bg-ember text-center font-display text-lg uppercase leading-tight text-accent-foreground shadow-ember lg:-right-6"
          >
            Feito
            <br />
            na hora
            <br />★
          </motion.div>
          <p className="absolute -bottom-4 right-6 font-hand text-xl text-muted-foreground">
            *imagem ilustrativa
          </p>
        </motion.div>
      </div>
    </section>
  );
}

function Marquee() {
  const t = "HAMBÚRGUER ARTESANAL ✦ CERVEJA GELADA ✦ COMBOS CAPRICHADOS ✦ ALMOÇO CASEIRO ✦ ";
  return (
    <div className="stripe-ember -rotate-1 overflow-hidden py-4 shadow-deep">
      <div className="flex w-max animate-marquee whitespace-nowrap font-display text-3xl text-accent-foreground">
        <span>{t.repeat(3)}</span>
        <span>{t.repeat(3)}</span>
      </div>
    </div>
  );
}

function SectionTitle({
  kicker,
  title,
  sub,
  center,
}: {
  kicker: string;
  title: ReactNode;
  sub?: string;
  center?: boolean;
}) {
  return (
    <Reveal className={center ? "mx-auto max-w-3xl text-center" : "max-w-3xl"}>
      <p className="font-hand text-2xl text-gold">{kicker}</p>
      <h2 className="mt-2 text-[clamp(2.6rem,7vw,5.5rem)]">{title}</h2>
      {sub && <p className="mt-4 text-lg text-muted-foreground">{sub}</p>}
    </Reveal>
  );
}

/* ---------------- CARDÁPIO ---------------- */
function Cardapio() {
  const {
    products: PRODUCTS,
    categories: CATEGORIES,
    addons: ADDONS,
    isPending,
    isError,
    configured,
    refetch,
  } = usePublicMenu();
  const [cat, setCat] = useState<Category | "todos">("todos");
  const list =
    cat === "todos"
      ? PRODUCTS
      : PRODUCTS.filter((p) => (cat === "destaques" ? p.featured : p.category === cat));
  return (
    <section id="cardapio" className="mx-auto max-w-7xl scroll-mt-24 px-4 py-24 sm:px-6">
      <SectionTitle
        kicker="nosso cardápio"
        title={
          <>
            Escolha seu próximo <span className="text-fire">favorito</span>
          </>
        }
        sub="Dos clássicos aos gigantes. Aqui tem hambúrguer para toda fome!"
      />
      <div className="-mx-4 mt-10 flex gap-2 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
        {[
          { id: "todos", label: "Todos" },
          ...(PRODUCTS.some((p) => p.featured) ? [{ id: "destaques", label: "Destaques" }] : []),
          ...CATEGORIES,
        ].map((c) => (
          <button
            key={c.id}
            onClick={() => setCat(c.id)}
            aria-pressed={cat === c.id}
            className={`relative shrink-0 rounded-full px-6 py-3 text-sm font-bold transition ${cat === c.id ? "text-primary-foreground" : "border hover:border-primary"}`}
          >
            {cat === c.id && (
              <motion.span
                layoutId="pill"
                className="absolute inset-0 rounded-full bg-primary"
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
              />
            )}
            <span className="relative">{c.label}</span>
          </button>
        ))}
        <a
          href="#combos"
          className="shrink-0 rounded-full border px-6 py-3 text-sm font-bold hover:border-primary"
        >
          Combos
        </a>
        <a
          href="#promocoes"
          className="shrink-0 rounded-full border px-6 py-3 text-sm font-bold hover:border-primary"
        >
          Promoções
        </a>
        <a
          href="#almoco"
          className="shrink-0 rounded-full border px-6 py-3 text-sm font-bold hover:border-primary"
        >
          Almoço
        </a>
      </div>
      {!configured && (
        <p role="status" className="mt-8 rounded-xl border p-5">
          Cardápio em configuração. Volte em breve.
        </p>
      )}
      {configured && isPending && (
        <p role="status" className="mt-8">
          Carregando o cardápio…
        </p>
      )}
      {isError && (
        <div role="alert" className="mt-8 rounded-xl border p-5">
          Não foi possível atualizar o cardápio.{" "}
          <button className="underline" onClick={() => refetch()}>
            Tentar novamente
          </button>
        </div>
      )}
      {configured && !isPending && !isError && list.length === 0 && (
        <p className="mt-8">Nenhum produto publicado nesta categoria.</p>
      )}
      <motion.div layout className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <AnimatePresence mode="popLayout">
          {list.map((p, i) => (
            <motion.div
              key={p.id}
              layout
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0, transition: { delay: i * 0.04 } }}
              exit={{ opacity: 0, scale: 0.95 }}
            >
              <ProductCard p={p} />
            </motion.div>
          ))}
        </AnimatePresence>
      </motion.div>
      <Reveal className="mt-10 rounded-2xl border border-dashed p-6">
        <h3 className="text-2xl">+ Adicionais</h3>
        <div className="mt-3 flex flex-wrap gap-x-8 gap-y-2 text-muted-foreground">
          {ADDONS.map((a) => (
            <span key={a.id}>
              {a.name} <b className="text-gold">{brl(a.price)}</b>
            </span>
          ))}
        </div>
      </Reveal>
    </section>
  );
}

function ProductCard({ p }: { p: Product }) {
  const { addons: ADDONS } = usePublicMenu();
  const { add } = useCart();
  const [addons, setAddons] = useState<string[]>([]);
  const [qty, setQty] = useState(1);
  const [done, setDone] = useState(false);
  const reduced = useReducedMotion();
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const total =
    (p.price + addons.reduce((s, id) => s + (ADDONS.find((a) => a.id === id)?.price ?? 0), 0)) *
    qty;

  const onMove = (e: MouseEvent<HTMLDivElement>) => {
    if (reduced) return;
    const r = e.currentTarget.getBoundingClientRect();
    setTilt({
      x: ((e.clientY - r.top) / r.height - 0.5) * -6,
      y: ((e.clientX - r.left) / r.width - 0.5) * 6,
    });
  };

  return (
    <div
      onMouseMove={onMove}
      onMouseLeave={() => setTilt({ x: 0, y: 0 })}
      style={{ transform: `perspective(900px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)` }}
      className="group flex h-full flex-col rounded-2xl border bg-card p-6 transition-[transform,border-color] duration-200 hover:border-primary/60"
    >
      {p.image && (
        <img
          src={p.image}
          alt={p.name}
          loading="lazy"
          decoding="async"
          className="mb-5 aspect-[4/3] w-full rounded-xl object-cover"
        />
      )}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          {(p.tag || p.featured) && (
            <span className="mb-2 inline-block rounded-full bg-ember px-3 py-0.5 text-xs font-bold uppercase text-accent-foreground">
              {p.tag || "Destaque"}
            </span>
          )}
          <h3 className="text-3xl">{p.name}</h3>
        </div>
        <span className="shrink-0 font-display text-3xl text-gold">{brl(p.price)}</span>
      </div>
      <p className="mt-3 flex-1 text-sm leading-relaxed text-muted-foreground">{p.description}</p>
      {p.ingredients && p.ingredients !== p.description && (
        <p className="mt-2 text-xs text-muted-foreground">Ingredientes: {p.ingredients}</p>
      )}
      {!p.available && (
        <p role="status" className="mt-3 text-gold">
          Indisponível no momento
        </p>
      )}
      <div className="mt-4 flex flex-wrap gap-2">
        {ADDONS.map((a) => {
          const on = addons.includes(a.id);
          return (
            <button
              key={a.id}
              onClick={() => setAddons((s) => (on ? s.filter((x) => x !== a.id) : [...s, a.id]))}
              className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${on ? "border-gold bg-gold/15 text-gold" : "text-muted-foreground hover:border-gold"}`}
            >
              {on ? "✓" : "+"} {a.name.replace(" de carne fresca 100 g", " 100g")} {brl(a.price)}
            </button>
          );
        })}
      </div>
      <div className="mt-5 flex items-center gap-2">
        <div className="flex items-center rounded-full bg-muted">
          <button
            onClick={() => setQty((q) => Math.max(1, q - 1))}
            className="px-3 py-2 text-lg"
            aria-label="Diminuir"
          >
            −
          </button>
          <span className="w-5 text-center font-bold">{qty}</span>
          <button
            onClick={() => setQty((q) => q + 1)}
            className="px-3 py-2 text-lg"
            aria-label="Aumentar"
          >
            +
          </button>
        </div>
        <button
          disabled={!p.available}
          onClick={() => {
            add(p, addons, qty);
            setDone(true);
            setAddons([]);
            setQty(1);
            setTimeout(() => setDone(false), 1400);
          }}
          className={`flex flex-1 items-center justify-center gap-2 rounded-full py-3 font-bold disabled:cursor-not-allowed disabled:opacity-40 transition ${done ? "bg-whatsapp text-primary-foreground" : "bg-primary text-primary-foreground hover:brightness-110"}`}
        >
          {done ? (
            <>
              <Check className="h-4 w-4" /> Adicionado
            </>
          ) : (
            <>
              <Plus className="h-4 w-4" /> {brl(total)}
            </>
          )}
        </button>
      </div>
    </div>
  );
}

/* ---------------- COMBOS ---------------- */
function Combos() {
  const { combo, products, categories } = usePublicMenu();
  return (
    <section id="combos" className="grain relative scroll-mt-24 overflow-hidden bg-charcoal py-24">
      <div className="pointer-events-none absolute inset-0 bg-glow opacity-60" />
      <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-2">
        <Reveal className="relative">
          <div className="overflow-hidden rounded-[2rem] shadow-deep lg:-rotate-2">
            <motion.img
              whileHover={{ scale: 1.05 }}
              transition={{ duration: 0.8 }}
              src={combo}
              alt="Combo com 4 mini-hambúrgueres, batata com bacon e anéis de cebola"
              loading="lazy"
              className="aspect-[4/5] w-full object-cover"
            />
          </div>
          <span className="absolute -right-2 top-6 rotate-6 rounded-lg bg-gold px-4 py-2 font-display text-xl uppercase text-primary-foreground">
            Foto real
          </span>
        </Reveal>
        <div>
          <SectionTitle
            kicker="pra dividir (ou não)"
            title={
              <>
                Fome de verdade <span className="text-fire">pede combo!</span>
              </>
            }
          />
          <div className="mt-8 space-y-4">
            {products
              .filter(
                (p) => categories.find((c) => c.id === p.category)?.name.toLowerCase() === "combos",
              )
              .map((p) => (
                <ProductCard key={p.id} p={p} />
              ))}
            {!products.some(
              (p) => categories.find((c) => c.id === p.category)?.name.toLowerCase() === "combos",
            ) && <p className="text-muted-foreground">Novos combos serão publicados aqui.</p>}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------------- PROMOÇÕES ---------------- */
function Promocoes() {
  const { promotions, asset, waLink } = usePublicMenu();
  const promos = promotions.map((p) => ({
    ...p,
    img: asset(p.image_id),
    title: p.name,
    price: brl(p.effective_price_cents),
    alt: p.name,
    msg: "Olá! Quero saber sobre a promoção " + p.name,
  }));
  return (
    <section id="promocoes" className="relative scroll-mt-24 py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <SectionTitle
          center
          kicker="corre que é por tempo limitado"
          title={
            <>
              Ofertas de dar <span className="text-fire">água na boca!</span>
            </>
          }
        />
        {promos.length === 0 && (
          <p className="mt-10 text-center text-muted-foreground">
            As próximas ofertas vão aparecer por aqui. Fique de olho!
          </p>
        )}
        <div className="mt-14 grid gap-8 md:grid-cols-2">
          {promos.map((p, i) => (
            <Reveal key={p.title} delay={i * 0.12}>
              <div className="group overflow-hidden rounded-[2rem] border bg-card">
                <div className="overflow-hidden">
                  <img
                    src={p.img || "/images/burger.jpg"}
                    alt={p.alt}
                    loading="lazy"
                    className="aspect-[4/5] w-full object-cover object-top transition duration-700 group-hover:scale-105"
                  />
                </div>
                <div className="stripe-ember flex flex-wrap items-center justify-between gap-3 p-6 text-accent-foreground">
                  <div>
                    <h3 className="text-3xl">{p.title}</h3>
                    <p className="mt-2 text-sm">{p.description}</p>
                    <p className="mt-2">
                      <s>{brl(p.original_price_cents)}</s>
                    </p>
                    <p className="font-display text-2xl text-gold">{p.price}</p>
                    <p className="mt-2 text-xs">
                      Até{" "}
                      {new Date(p.ends_at).toLocaleString("pt-BR", {
                        timeZone: "America/Sao_Paulo",
                      })}{" "}
                      (Brasília)
                    </p>
                  </div>
                  <a
                    href={waLink(p.msg)}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-full bg-background px-5 py-3 text-sm font-bold text-foreground transition hover:scale-105"
                  >
                    Consultar disponibilidade
                  </a>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
        <p className="mt-6 text-center text-sm text-muted-foreground">
          Promoções sujeitas à disponibilidade. Confirme condições e validade pelo WhatsApp.
        </p>
      </div>
    </section>
  );
}

/* ---------------- ALMOÇO ---------------- */
function Almoco() {
  const { almoco, waLink } = usePublicMenu();
  return (
    <section id="almoco" className="scroll-mt-24 bg-cream py-24 text-primary-foreground">
      <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-[1fr_1.1fr]">
        <div>
          <Reveal>
            <p className="font-hand text-2xl text-ember">
              de segunda a segunda? pergunta pra gente!
            </p>
            <h2 className="mt-2 text-[clamp(2.6rem,7vw,5.5rem)]">
              Aqui também tem <span className="text-ember">almoço caprichado!</span>
            </h2>
            <p className="mt-5 max-w-md text-lg opacity-80">
              Refeições generosas, bem servidas e com aquele sabor caseiro que abraça.
            </p>
            <a
              href={waLink("Olá! Qual é o almoço do dia hoje?")}
              target="_blank"
              rel="noreferrer"
              className="mt-8 inline-block rounded-full bg-ember px-8 py-4 font-display text-xl uppercase tracking-wide text-accent-foreground transition hover:scale-105"
            >
              Consultar almoço do dia
            </a>
          </Reveal>
        </div>
        <Reveal delay={0.1}>
          <img
            src={almoco}
            alt="Prato de almoço completo com arroz, feijão tropeiro, macarrão, bife acebolado e salada"
            loading="lazy"
            className="aspect-square w-full rotate-2 rounded-[2rem] object-cover shadow-deep"
          />
        </Reveal>
      </div>
    </section>
  );
}

/* ---------------- SOBRE ---------------- */
function Sobre() {
  const { logo, ambiente } = usePublicMenu();
  return (
    <section id="sobre" className="relative scroll-mt-24 overflow-hidden py-28">
      <div className="mx-auto grid max-w-7xl gap-12 px-4 sm:px-6 lg:grid-cols-12">
        <div className="lg:col-span-6">
          <SectionTitle
            kicker="nossa história"
            title={
              <>
                Não é só hambúrguer. <span className="text-fire">É Pato Gordo!</span>
              </>
            }
          />
          <Reveal delay={0.1}>
            <p className="mt-8 border-l-4 border-primary pl-6 text-xl leading-relaxed text-muted-foreground">
              No Pato Gordo, cada lanche é preparado para transformar a sua fome em um momento
              especial. Dos clássicos aos artesanais, nossa missão é servir sabor, qualidade e
              aquela vontade de voltar!
            </p>
          </Reveal>
          <Reveal delay={0.2} className="mt-10 grid grid-cols-3 gap-3 text-center">
            {[
              [Utensils, "Consumo no local"],
              [Store, "Retirada"],
              [Bike, "Entrega"],
            ].map(([Icon, l]) => {
              const I = Icon as typeof Utensils;
              return (
                <div key={l as string} className="rounded-2xl border p-4">
                  <I className="mx-auto h-7 w-7 text-primary" />
                  <p className="mt-2 text-sm font-semibold">{l as string}</p>
                </div>
              );
            })}
          </Reveal>
        </div>
        <div className="relative lg:col-span-6">
          <Reveal>
            <img
              src={ambiente}
              alt="Ambiente aconchegante de hamburgueria (imagem ilustrativa)"
              loading="lazy"
              className="aspect-[4/3] w-full rounded-[2rem] object-cover shadow-deep"
            />
          </Reveal>
          <motion.img
            initial={{ opacity: 0, y: 40, rotate: -15 }}
            whileInView={{ opacity: 1, y: 0, rotate: -6 }}
            viewport={{ once: true }}
            transition={{ duration: 0.9, ease }}
            src={logo}
            alt="Mascote Pato Gordo"
            className="absolute -bottom-10 -left-4 w-40 drop-shadow-2xl sm:w-52"
          />
          <p className="mt-3 text-right font-hand text-lg text-muted-foreground">
            *ambiente ilustrativo
          </p>
        </div>
      </div>
    </section>
  );
}

/* ---------------- AVALIAÇÕES ---------------- */
function Avaliacoes() {
  return (
    <section className="bg-charcoal py-24">
      <div className="mx-auto max-w-4xl px-4 text-center sm:px-6">
        <SectionTitle
          center
          kicker="palavra de cliente"
          title={
            <>
              Quem experimenta, <span className="text-fire">recomenda!</span>
            </>
          }
        />
        <Reveal delay={0.1} className="mt-10">
          <div className="flex items-center justify-center gap-1 text-gold">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star key={i} className="h-8 w-8 fill-current" />
            ))}
          </div>
          <p className="mt-3 text-muted-foreground">
            <b className="text-foreground">5,0</b> no Google · baseado em 1 avaliação
          </p>
          <blockquote className="mx-auto mt-10 max-w-2xl rounded-3xl border bg-card p-8 sm:p-10">
            <p className="font-display text-3xl uppercase leading-tight sm:text-4xl">
              "Excelente comida, lugar acessível para todas as pessoas."
            </p>
            <footer className="mt-5 font-hand text-2xl text-gold">— Esdres Fernandes</footer>
          </blockquote>
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent("Bar e Hamburgueria Pato Gordo Ribeirão das Neves")}`}
            target="_blank"
            rel="noreferrer"
            className="mt-8 inline-block text-sm font-bold text-primary underline-offset-4 hover:underline"
          >
            Ver avaliações no Google Maps →
          </a>
        </Reveal>
      </div>
    </section>
  );
}

/* ---------------- LOCALIZAÇÃO ---------------- */
function Localizacao() {
  const { ADDRESS, PHONE_LABEL, INSTAGRAM, MAPS_QUERY, HOURS, waLink, settings } = usePublicMenu();
  return (
    <section id="localizacao" className="scroll-mt-24 py-24">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-2">
        <div>
          <SectionTitle
            kicker="vem pra cá"
            title={
              <>
                O pato <span className="text-fire">te espera!</span>
              </>
            }
          />
          <Reveal delay={0.1} className="mt-8 space-y-5">
            <p className="flex gap-3 text-lg">
              <MapPin className="mt-1 h-5 w-5 shrink-0 text-primary" />
              {ADDRESS}
            </p>
            <p className="flex gap-3 text-lg">
              <Phone className="mt-1 h-5 w-5 shrink-0 text-primary" />
              {PHONE_LABEL}
            </p>
            <a
              href={INSTAGRAM}
              target="_blank"
              rel="noreferrer"
              className="flex gap-3 text-lg hover:text-primary"
            >
              <Instagram className="mt-1 h-5 w-5 shrink-0 text-primary" />
              {settings?.instagram?.split("/").filter(Boolean).at(-1) ?? "Instagram"}
            </a>
            <div className="rounded-2xl border p-5">
              {HOURS.map((h) => (
                <div key={h.day} className="flex justify-between gap-4 text-sm">
                  <span className="font-semibold">{h.day}</span>
                  <span className="text-muted-foreground">{h.time}</span>
                </div>
              ))}
            </div>
            <p className="text-sm text-muted-foreground">
              Consumo no local, retirada e entrega (taxa a confirmar).
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <a
                href={
                  settings?.maps_url ||
                  `https://www.google.com/maps/dir/?api=1&destination=${MAPS_QUERY}`
                }
                target="_blank"
                rel="noreferrer"
                className="rounded-full bg-primary px-8 py-4 text-center font-display text-xl uppercase tracking-wide text-primary-foreground"
              >
                Como chegar
              </a>
              <a
                href={waLink("Olá, Pato Gordo!")}
                target="_blank"
                rel="noreferrer"
                className="rounded-full bg-whatsapp px-8 py-4 text-center font-display text-xl uppercase tracking-wide text-primary-foreground"
              >
                WhatsApp
              </a>
            </div>
          </Reveal>
        </div>
        <Reveal delay={0.15}>
          <iframe
            title="Mapa Pato Gordo"
            src={`https://www.google.com/maps?q=${MAPS_QUERY}&output=embed`}
            loading="lazy"
            className="h-[420px] w-full rounded-[2rem] border grayscale-[40%] lg:h-full"
          />
        </Reveal>
      </div>
    </section>
  );
}

/* ---------------- FOOTER ---------------- */
function Footer() {
  const { logo, ADDRESS, PHONE_LABEL, INSTAGRAM, waLink, settings } = usePublicMenu();
  return (
    <footer className="grain relative overflow-hidden border-t bg-charcoal pb-28 pt-20 lg:pb-12">
      <div className="pointer-events-none absolute inset-0 bg-glow opacity-40" />
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6">
        <p className="text-center font-display text-[clamp(2.5rem,8vw,7rem)] uppercase leading-none">
          {settings?.name ?? "Pato Gordo"} —{" "}
          <span className="text-fire">aqui a fome não tem vez!</span>
        </p>
        <div className="mt-14 grid gap-8 text-sm text-muted-foreground sm:grid-cols-3">
          <img src={logo} alt="Pato Gordo" className="h-24 w-24" loading="lazy" />
          <div className="space-y-2">
            <p>{ADDRESS}</p>
            <p>{PHONE_LABEL}</p>
          </div>
          <div className="flex flex-col gap-2">
            <a href="#cardapio" className="hover:text-primary">
              Cardápio
            </a>
            <a href={INSTAGRAM} target="_blank" rel="noreferrer" className="hover:text-primary">
              Instagram {settings?.instagram?.split("/").filter(Boolean).at(-1) ?? "Instagram"}
            </a>
            <a
              href={waLink("Olá!")}
              target="_blank"
              rel="noreferrer"
              className="hover:text-primary"
            >
              WhatsApp
            </a>
          </div>
        </div>
        <p className="mt-10 text-xs text-muted-foreground">
          © {new Date().getFullYear()} {settings?.name ?? "Bar e Hamburgueria Pato Gordo"}. Imagens
          marcadas como ilustrativas não representam produtos específicos.
        </p>
      </div>
    </footer>
  );
}

function FloatingWhats() {
  const { waLink } = usePublicMenu();
  return (
    <a
      href={waLink("Olá, Pato Gordo! 🍔")}
      target="_blank"
      rel="noreferrer"
      aria-label="WhatsApp"
      className="fixed bottom-6 right-6 z-40 hidden h-16 w-16 animate-pulse-ring place-items-center rounded-full bg-whatsapp text-primary-foreground shadow-deep lg:grid"
    >
      <svg viewBox="0 0 24 24" className="h-8 w-8 fill-current">
        <path d="M17.5 14.4c-.3-.1-1.7-.8-2-.9-.3-.1-.5-.1-.7.1-.2.3-.8.9-.9 1.1-.2.2-.3.2-.6.1-.3-.1-1.2-.5-2.4-1.5-.9-.8-1.5-1.8-1.6-2.1-.2-.3 0-.5.1-.6l.4-.5c.2-.2.2-.3.3-.5.1-.2 0-.4 0-.5l-.9-2.2c-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.5s1.1 2.9 1.2 3.1c.1.2 2.1 3.2 5.1 4.5.7.3 1.3.5 1.7.6.7.2 1.4.2 1.9.1.6-.1 1.7-.7 2-1.4.2-.7.2-1.2.2-1.4-.1-.1-.3-.2-.6-.3M12 21.8c-1.8 0-3.5-.5-5-1.4l-.4-.2-3.7 1 1-3.6-.2-.4A9.8 9.8 0 1 1 12 21.8m8.4-18.2A11.8 11.8 0 0 0 1.7 17.8L0 24l6.3-1.7a11.8 11.8 0 0 0 5.7 1.4c6.5 0 11.8-5.3 11.8-11.8 0-3.2-1.2-6.1-3.4-8.3" />
      </svg>
    </a>
  );
}

function MobileBar() {
  const { waLink } = usePublicMenu();
  const { count, subtotal, setOpen } = useCart();
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-3 gap-2 border-t bg-background/90 p-3 backdrop-blur-md lg:hidden">
      <a
        href="#cardapio"
        className="flex flex-col items-center justify-center rounded-xl py-2 text-xs font-bold"
      >
        <Utensils className="mb-1 h-5 w-5" />
        Cardápio
      </a>
      <a
        href={waLink("Olá, Pato Gordo! 🍔")}
        target="_blank"
        rel="noreferrer"
        className="flex flex-col items-center justify-center rounded-xl py-2 text-xs font-bold text-whatsapp"
      >
        <Phone className="mb-1 h-5 w-5" />
        WhatsApp
      </a>
      <button
        onClick={() => setOpen(true)}
        className="relative flex flex-col items-center justify-center rounded-xl bg-primary py-2 text-xs font-bold text-primary-foreground"
      >
        <ShoppingBag className="mb-1 h-5 w-5" />
        {count > 0 ? brl(subtotal) : "Carrinho"}
        {count > 0 && (
          <span className="absolute right-2 top-1 grid h-5 min-w-5 place-items-center rounded-full bg-ember px-1 text-[10px] text-accent-foreground">
            {count}
          </span>
        )}
      </button>
    </div>
  );
}
