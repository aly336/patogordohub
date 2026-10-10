import { useState, type FormEvent } from "react";
import {
  discountedPrice,
  money,
  moneyInput,
  parseMoney,
  promotionSchema,
  type Promotion,
} from "@/lib/catalog";
import { db, imageUrl } from "@/lib/supabase";
import { type AdminData, type RunAction } from "./data";
import {
  buttonClass,
  CheckField,
  Field,
  inputClass,
  Panel,
  secondaryClass,
  TextField,
} from "./fields";
import { ImageSelect } from "./Media";
// Editors always use Brasília time, regardless of the owner's device timezone.
const toInput = (date: string) =>
  new Date(Date.parse(date) - 3 * 3600000).toISOString().slice(0, 16);
const fromInput = (date: string) => new Date(`${date}:00-03:00`).toISOString();
export function PromotionEditor({
  promotion,
  data,
  run,
  close,
  busy,
}: {
  promotion: Promotion | null;
  data: AdminData;
  run: RunAction;
  close: () => void;
  busy: boolean;
}) {
  const [name, setName] = useState(promotion?.name ?? "");
  const [description, setDescription] = useState(promotion?.description ?? "");
  const [image, setImage] = useState(promotion?.image_id ?? null);
  const [original, setOriginal] = useState(
    promotion ? moneyInput(promotion.original_price_cents) : "",
  );
  const [price, setPrice] = useState(
    promotion?.promo_price_cents ? moneyInput(promotion.promo_price_cents) : "",
  );
  const [percent, setPercent] = useState(String(promotion?.discount_percent ?? 10));
  const [mode, setMode] = useState(promotion?.discount_percent ? "percent" : "price");
  const [start, setStart] = useState(toInput(promotion?.starts_at ?? new Date().toISOString()));
  const [end, setEnd] = useState(
    toInput(promotion?.ends_at ?? new Date(Date.now() + 86400000).toISOString()),
  );
  const [active, setActive] = useState(promotion?.active ?? false);
  const [position, setPosition] = useState(String(promotion?.position ?? 0));
  const [preview, setPreview] = useState(false);
  const [products, setProducts] = useState(
    data.promotion_products
      .filter((p) => p.promotion_id === promotion?.id)
      .map((p) => p.product_id),
  );
  let effective = "—";
  try {
    effective = money(
      mode === "price" ? parseMoney(price) : discountedPrice(parseMoney(original), Number(percent)),
    );
  } catch {
    /* Incomplete draft. */
  }
  async function submit(e: FormEvent) {
    e.preventDefault();
    await run(async () => {
      const campaign = promotionSchema.parse({
        name,
        description,
        image_id: image,
        original_price_cents: parseMoney(original),
        promo_price_cents: mode === "price" ? parseMoney(price) : null,
        discount_percent: mode === "percent" ? Number(percent) : null,
        starts_at: fromInput(start),
        ends_at: fromInput(end),
        active,
        position: Number(position),
      });
      const { error } = await db().rpc("save_promotion", {
        campaign: { ...campaign, ...(promotion ? { id: promotion.id } : {}) },
        product_ids: products,
      });
      if (error) throw error;
    }, "Campanha salva. A validade será respeitada automaticamente.");
  }
  return (
    <Panel title={promotion ? "Editar campanha" : "Nova campanha"}>
      <form onSubmit={submit} className="space-y-6">
        <div className="grid gap-5 md:grid-cols-2">
          <TextField label="Nome da campanha" value={name} onChange={setName} required />
          <TextField
            label="Posição de destaque"
            type="number"
            value={position}
            onChange={setPosition}
            required
          />
          <TextField label="Preço original (R$)" value={original} onChange={setOriginal} required />
          <Field label="Tipo de desconto">
            <select className={inputClass} value={mode} onChange={(e) => setMode(e.target.value)}>
              <option value="price">Preço promocional</option>
              <option value="percent">Percentual</option>
            </select>
          </Field>
          {mode === "price" ? (
            <TextField label="Preço promocional (R$)" value={price} onChange={setPrice} required />
          ) : (
            <TextField
              label="Desconto (%)"
              type="number"
              value={percent}
              onChange={setPercent}
              required
            />
          )}
          <div className="self-end py-3 text-gold">
            Preço final: <strong>{effective}</strong>
          </div>
          <TextField
            label="Início (horário de Brasília)"
            type="datetime-local"
            value={start}
            onChange={setStart}
            required
          />
          <TextField
            label="Término (horário de Brasília)"
            type="datetime-local"
            value={end}
            onChange={setEnd}
            required
          />
          <Field label="Descrição e condições">
            <textarea
              className={inputClass}
              rows={4}
              maxLength={2000}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </Field>
          <ImageSelect value={image} onChange={setImage} media={data.media} />
        </div>
        <fieldset className="rounded-xl border p-4">
          <legend className="px-2 text-sm font-bold">
            Produtos participantes (opcional para campanhas gerais)
          </legend>
          <div className="grid max-h-64 gap-x-5 overflow-auto sm:grid-cols-2">
            {data.products.map((p) => (
              <CheckField
                key={p.id}
                label={p.name}
                checked={products.includes(p.id)}
                onChange={(checked) =>
                  setProducts((v) => (checked ? [...v, p.id] : v.filter((id) => id !== p.id)))
                }
              />
            ))}
          </div>
        </fieldset>
        <CheckField
          label="Campanha ativa (publicada somente dentro do período)"
          checked={active}
          onChange={setActive}
        />
        <div className="flex flex-wrap gap-3">
          <button disabled={busy} className={buttonClass}>
            Salvar campanha
          </button>
          <button type="button" className={secondaryClass} onClick={() => setPreview(!preview)}>
            Pré-visualizar
          </button>
          <button type="button" className={secondaryClass} onClick={close}>
            Cancelar
          </button>
        </div>
        {preview && (
          <article className="max-w-md overflow-hidden rounded-2xl border">
            {image && (
              <img
                src={imageUrl(data.media.find((m) => m.id === image))}
                alt={name}
                className="aspect-[4/3] w-full object-cover"
              />
            )}
            <div className="stripe-ember p-6 text-accent-foreground">
              <p className="text-xs">PRÉVIA DA CAMPANHA</p>
              <h3 className="mt-3 text-3xl">{name}</h3>
              <p className="mt-3">{description}</p>
              <p className="mt-4 font-display text-3xl text-gold">{effective}</p>
            </div>
          </article>
        )}
      </form>
    </Panel>
  );
}
