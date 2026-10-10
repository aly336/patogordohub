import { useState, type FormEvent } from "react";
import { productSchema, money, moneyInput, parseMoney, type ProductRow } from "@/lib/catalog";
import { imageUrl } from "@/lib/supabase";
import { saveRow, type AdminData, type RunAction } from "./data";
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
export function ProductEditor({
  product,
  data,
  run,
  close,
  busy,
}: {
  product: ProductRow | null;
  data: AdminData;
  run: RunAction;
  close: () => void;
  busy: boolean;
}) {
  const [value, setValue] = useState<Omit<ProductRow, "id">>(
    product ?? {
      name: "",
      description: "",
      ingredients: "",
      category_id: data.categories[0]?.id ?? "",
      price_cents: 0,
      image_id: null,
      featured: false,
      available: true,
      published: false,
      position: data.products.length,
      tag: "",
    },
  );
  const [price, setPrice] = useState(product ? moneyInput(product.price_cents) : "");
  const [preview, setPreview] = useState(false);
  const set = <K extends keyof typeof value>(key: K, next: (typeof value)[K]) =>
    setValue((v) => ({ ...v, [key]: next }));
  let previewPrice = "—";
  try {
    previewPrice = money(parseMoney(price));
  } catch {
    /* Invalid draft stays editable. */
  }
  async function submit(e: FormEvent) {
    e.preventDefault();
    await run(async () => {
      const payload = productSchema.parse({ ...value, price_cents: parseMoney(price) });
      await saveRow("products", payload, product?.id);
    }, "Produto salvo. O site será atualizado automaticamente.");
  }
  return (
    <Panel title={product ? "Editar produto" : "Novo produto"}>
      <form onSubmit={submit} className="space-y-6">
        <div className="grid gap-5 md:grid-cols-2">
          <TextField label="Nome" value={value.name} onChange={(v) => set("name", v)} required />
          <Field label="Categoria">
            <select
              required
              className={inputClass}
              value={value.category_id}
              onChange={(e) => set("category_id", e.target.value)}
            >
              <option value="">Selecione</option>
              {data.categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                  {!c.published ? " (oculta)" : ""}
                </option>
              ))}
            </select>
          </Field>
          <TextField
            label="Preço (R$)"
            value={price}
            onChange={setPrice}
            required
            hint="Ex.: 32,90"
          />
          <TextField
            label="Ordem de exibição"
            type="number"
            value={String(value.position)}
            onChange={(v) => set("position", Number(v))}
            required
          />
          <Field label="Descrição">
            <textarea
              className={inputClass}
              rows={3}
              maxLength={2000}
              value={value.description}
              onChange={(e) => set("description", e.target.value)}
            />
          </Field>
          <Field label="Ingredientes">
            <textarea
              className={inputClass}
              rows={3}
              maxLength={2000}
              value={value.ingredients}
              onChange={(e) => set("ingredients", e.target.value)}
            />
          </Field>
          <ImageSelect
            value={value.image_id}
            onChange={(v) => set("image_id", v)}
            media={data.media}
          />
          <TextField
            label="Selo (opcional)"
            value={value.tag}
            onChange={(v) => set("tag", v)}
            maxLength={40}
          />
        </div>
        <div className="flex flex-wrap gap-x-7">
          <CheckField
            label="Publicado no cardápio"
            checked={value.published}
            onChange={(v) => set("published", v)}
          />
          <CheckField
            label="Disponível para pedir"
            checked={value.available}
            onChange={(v) => set("available", v)}
          />
          <CheckField
            label="Destaque na página inicial"
            checked={value.featured}
            onChange={(v) => set("featured", v)}
          />
        </div>
        <div className="flex flex-wrap gap-3">
          <button className={buttonClass} disabled={busy}>
            Salvar produto
          </button>
          <button
            type="button"
            className={secondaryClass}
            onClick={() => setPreview(!preview)}
            aria-expanded={preview}
          >
            Pré-visualizar
          </button>
          <button type="button" className={secondaryClass} onClick={close}>
            Cancelar
          </button>
        </div>
        {preview && (
          <article
            className="max-w-sm rounded-2xl border bg-background p-6"
            aria-label="Prévia do produto"
          >
            {value.image_id && (
              <img
                className="mb-5 aspect-[4/3] w-full rounded-xl object-cover"
                src={imageUrl(data.media.find((m) => m.id === value.image_id))}
                alt={value.name}
              />
            )}
            <p className="mb-2 text-xs uppercase text-primary">
              Prévia · {value.published ? "Publicado" : "Rascunho"}
            </p>
            <h3 className="text-3xl">{value.name || "Nome do produto"}</h3>
            <p className="mt-3 text-muted-foreground">{value.description}</p>
            <p className="mt-5 font-display text-3xl text-gold">{previewPrice}</p>
            {!value.available && <p className="mt-3">Indisponível</p>}
          </article>
        )}
      </form>
    </Panel>
  );
}
