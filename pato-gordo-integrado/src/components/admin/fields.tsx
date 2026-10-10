import { useId, type ReactNode } from "react";
export const inputClass =
  "w-full rounded-xl border bg-background px-3 py-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary";
export const buttonClass =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-primary px-5 py-2 text-sm font-bold text-primary-foreground transition hover:brightness-110 disabled:cursor-wait disabled:opacity-50";
export const secondaryClass =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-full border px-5 py-2 text-sm font-semibold hover:border-primary disabled:opacity-50";
export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <label className="flex min-w-0 flex-col gap-2 text-sm font-semibold">
      <span>{label}</span>
      {children}
      {hint && <span className="font-normal text-muted-foreground">{hint}</span>}
    </label>
  );
}
export function TextField({
  label,
  value,
  onChange,
  type = "text",
  required = false,
  maxLength = 120,
  hint,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
  maxLength?: number;
  hint?: string;
}) {
  return (
    <Field label={label} {...(hint ? { hint } : {})}>
      <input
        className={inputClass}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        type={type}
        required={required}
        maxLength={maxLength}
        step={type === "number" ? "1" : undefined}
        min={type === "number" ? "0" : undefined}
      />
    </Field>
  );
}
export function CheckField({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  const id = useId();
  return (
    <label htmlFor={id} className="flex min-h-11 cursor-pointer items-center gap-3 text-sm">
      <input
        id={id}
        className="h-5 w-5 accent-primary"
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      {label}
    </label>
  );
}
export function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border bg-card p-5 sm:p-7">
      <h2 className="mb-6 text-3xl">{title}</h2>
      {children}
    </section>
  );
}
