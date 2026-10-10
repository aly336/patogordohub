import { useState, type FormEvent } from "react";
import { settingsSchema, type Settings } from "@/lib/catalog";
import { saveRow, type AdminData, type RunAction } from "./data";
import { buttonClass, CheckField, Panel, TextField, Field, inputClass } from "./fields";
import { ImageSelect } from "./Media";
export function SettingsEditor({
  data,
  run,
  busy,
}: {
  data: AdminData;
  run: RunAction;
  busy: boolean;
}) {
  const initial = data.site_settings[0];
  const [value, setValue] = useState<Settings>(
    initial ?? {
      id: 1,
      name: "Pato Gordo",
      address: "R. Maria de Matos Libânio, San Genaro, Ribeirão das Neves – MG, 33825-360",
      whatsapp: "",
      instagram: "",
      hours: "",
      headline: "O pato resolve!",
      order_url: "",
      maps_url: "",
      logo_id: null,
      hero_id: null,
      combo_id: null,
      lunch_id: null,
      about_id: null,
      hide_unavailable: false,
    },
  );
  const set = <K extends keyof Settings>(key: K, next: Settings[K]) =>
    setValue((v) => ({ ...v, [key]: next }));
  async function submit(e: FormEvent) {
    e.preventDefault();
    await run(async () => {
      const payload = settingsSchema.parse(value);
      await saveRow("site_settings", { ...payload, id: 1 }, initial ? 1 : undefined);
    }, "Configurações publicadas.");
  }
  return (
    <Panel title="Informações do restaurante">
      <form onSubmit={submit} className="space-y-6">
        <div className="grid gap-5 md:grid-cols-2">
          <TextField
            label="Nome do restaurante"
            value={value.name}
            onChange={(v) => set("name", v)}
            required
          />
          <TextField
            label="Texto de destaque"
            value={value.headline}
            onChange={(v) => set("headline", v)}
            maxLength={180}
          />
          <TextField
            label="Endereço"
            value={value.address}
            onChange={(v) => set("address", v)}
            required
            maxLength={500}
          />
          <TextField
            label="WhatsApp"
            value={value.whatsapp}
            onChange={(v) => set("whatsapp", v)}
            hint="País + DDD + número, somente dígitos. Confira o contato herdado do projeto."
          />
          <TextField
            label="Instagram"
            value={value.instagram}
            onChange={(v) => set("instagram", v)}
            type="url"
            maxLength={300}
          />
          <Field label="Horários de funcionamento">
            <textarea
              className={inputClass}
              rows={3}
              maxLength={1000}
              value={value.hours}
              onChange={(e) => set("hours", e.target.value)}
            />
          </Field>
          <TextField
            label="Link para pedidos (opcional)"
            type="url"
            value={value.order_url}
            onChange={(v) => set("order_url", v)}
            maxLength={1000}
          />
          <TextField
            label="Link para localização (opcional)"
            type="url"
            value={value.maps_url}
            onChange={(v) => set("maps_url", v)}
            maxLength={1000}
          />
          {(
            [
              ["logo_id", "Logotipo"],
              ["hero_id", "Imagem principal"],
              ["combo_id", "Imagem de combos"],
              ["lunch_id", "Imagem do almoço"],
              ["about_id", "Imagem do ambiente"],
            ] as const
          ).map(([key, label]) => (
            <ImageSelect
              key={key}
              label={label}
              value={value[key]}
              onChange={(v) => set(key, v)}
              media={data.media}
            />
          ))}
        </div>
        <CheckField
          label="Ocultar produtos indisponíveis (desmarque para exibir com aviso)"
          checked={value.hide_unavailable}
          onChange={(v) => set("hide_unavailable", v)}
        />
        <button className={buttonClass} disabled={busy}>
          Salvar configurações
        </button>
      </form>
    </Panel>
  );
}
