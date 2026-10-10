import { useEffect, useState } from "react";
import { db, imageUrl } from "@/lib/supabase";
import { optimizeImage, validateImage } from "@/lib/upload";
import type { Media } from "@/lib/catalog";
import { deleteRow, type RunAction } from "./data";
import { buttonClass, Field, inputClass, Panel, secondaryClass, TextField } from "./fields";
export function ImageSelect({
  label = "Fotografia",
  value,
  onChange,
  media,
}: {
  label?: string;
  value: string | null;
  onChange: (value: string | null) => void;
  media: Media[];
}) {
  const item = media.find((m) => m.id === value);
  return (
    <div className="space-y-3">
      <Field label={label}>
        <select
          className={inputClass}
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value || null)}
        >
          <option value="">Sem imagem</option>
          {media.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
      </Field>
      {item && (
        <img
          src={imageUrl(item)}
          alt={item.alt || item.name}
          className="h-32 w-44 rounded-xl border object-cover"
          loading="lazy"
        />
      )}
    </div>
  );
}
export function MediaLibrary({
  media,
  run,
  busy,
}: {
  media: Media[];
  run: RunAction;
  busy: boolean;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [name, setName] = useState("");
  const [alt, setAlt] = useState("");
  const [error, setError] = useState("");
  useEffect(() => {
    if (!file) {
      setPreview("");
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);
  async function upload() {
    if (!file) return;
    const success = await run(async () => {
      const blob = await optimizeImage(file);
      const path = `uploads/${crypto.randomUUID()}.webp`;
      const { error } = await db()
        .storage.from("restaurant")
        .upload(path, blob, { contentType: "image/webp", upsert: false, cacheControl: "31536000" });
      if (error) throw error;
      const { error: metadataError } = await db()
        .from("media")
        .insert({
          name: name.trim() || file.name.slice(0, 160),
          alt,
          path,
          mime_type: "image/webp",
          size_bytes: blob.size,
        })
        .select("id")
        .single();
      if (metadataError) {
        await db().storage.from("restaurant").remove([path]);
        throw metadataError;
      }
    }, "Imagem enviada. Selecione-a no produto, campanha ou configuração desejada.");
    if (success) {
      setFile(null);
      setName("");
      setAlt("");
    }
  }
  async function remove(m: Media) {
    if (!window.confirm(`Excluir a imagem “${m.name}”? Imagens em uso não podem ser excluídas.`))
      return;
    await run(async () => {
      await deleteRow("media", m.id);
      if (m.path.startsWith("uploads/")) {
        const { error } = await db().storage.from("restaurant").remove([m.path]);
        if (error) {
          await db().from("media").insert(m);
          throw error;
        }
      }
    }, "Imagem excluída.");
  }
  return (
    <div className="space-y-6">
      <Panel title="Nova fotografia ou banner">
        <p className="mb-5 text-sm text-muted-foreground">
          JPG, PNG ou WebP, até 5 MB. As fotos são otimizadas para até 1600 px. Envie uma nova
          imagem e selecione-a no conteúdo para substituir a anterior.
        </p>
        <div className="grid gap-5 md:grid-cols-2">
          <Field label="Arquivo">
            <input
              key={file ? "selected" : "empty"}
              className={inputClass}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={async (e) => {
                setError("");
                const next = e.target.files?.[0];
                if (!next) return;
                try {
                  await validateImage(next);
                  setFile(next);
                  setName(next.name.slice(0, 160));
                } catch {
                  setFile(null);
                  setError("Selecione um JPG, PNG ou WebP válido de até 5 MB.");
                }
              }}
            />
          </Field>
          <TextField label="Nome na biblioteca" value={name} onChange={setName} maxLength={160} />
          <TextField label="Descrição da imagem" value={alt} onChange={setAlt} maxLength={300} />
          {preview && (
            <img
              src={preview}
              alt="Prévia antes do envio"
              className="max-h-64 rounded-xl object-contain"
            />
          )}
        </div>
        {error && (
          <p role="alert" className="mt-4 text-gold">
            {error}
          </p>
        )}
        <button disabled={!file || busy} onClick={upload} className={`${buttonClass} mt-5`}>
          Enviar imagem
        </button>
      </Panel>
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {media.map((m) => (
          <article key={m.id} className="overflow-hidden rounded-2xl border bg-card">
            <img
              src={imageUrl(m)}
              alt={m.alt || m.name}
              className="aspect-[4/3] w-full object-cover"
              loading="lazy"
            />
            <div className="p-5">
              <p className="break-words font-bold">{m.name}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {Math.ceil(m.size_bytes / 1024)} KB
              </p>
              <button
                disabled={busy}
                onClick={() => remove(m)}
                className={`${secondaryClass} mt-4`}
              >
                Excluir imagem
              </button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
