import { beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ProductEditor } from "@/components/admin/ProductEditor";
import { PromotionEditor } from "@/components/admin/PromotionEditor";
import type { AdminData, RunAction } from "@/components/admin/data";
import { validateImage } from "@/lib/upload";
const spies = vi.hoisted(() => ({ save: vi.fn(), rpc: vi.fn() }));
vi.mock("@/components/admin/data", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  saveRow: spies.save,
}));
vi.mock("@/lib/supabase", () => ({ db: () => ({ rpc: spies.rpc }), imageUrl: () => undefined }));
const data: AdminData = {
  products: [],
  categories: [
    {
      id: "00000000-0000-4000-8000-000000000001",
      name: "Hambúrgueres",
      published: true,
      position: 0,
    },
  ],
  addons: [],
  promotions: [],
  media: [],
  site_settings: [],
  promotion_products: [],
  audit_log: [],
};
const run: RunAction = async (fn) => {
  await fn();
  return true;
};
beforeEach(() => {
  cleanup();
  vi.clearAllMocks();
  spies.save.mockResolvedValue(undefined);
  spies.rpc.mockResolvedValue({ data: null, error: null });
});
describe("Administrative forms", () => {
  it("creates a published product with exact cents and a category", async () => {
    render(<ProductEditor product={null} data={data} run={run} close={() => {}} busy={false} />);
    fireEvent.change(screen.getByLabelText("Nome"), { target: { value: "X-Pato Especial" } });
    fireEvent.change(screen.getByLabelText(/Preço/), { target: { value: "32,90" } });
    fireEvent.click(screen.getByLabelText("Publicado no cardápio"));
    fireEvent.click(screen.getByRole("button", { name: "Pré-visualizar" }));
    expect(screen.getByRole("article", { name: "Prévia do produto" })).toHaveTextContent(
      "X-Pato Especial",
    );
    fireEvent.click(screen.getByRole("button", { name: "Salvar produto" }));
    await waitFor(() =>
      expect(spies.save).toHaveBeenCalledWith(
        "products",
        expect.objectContaining({
          price_cents: 3290,
          name: "X-Pato Especial",
          published: true,
          category_id: data.categories[0]!.id,
        }),
        undefined,
      ),
    );
  });
  it("edits and disables an existing product", async () => {
    const product = {
      id: "00000000-0000-4000-8000-000000000200",
      name: "X Salada",
      description: "",
      ingredients: "",
      category_id: data.categories[0]!.id,
      price_cents: 1300,
      image_id: null,
      available: true,
      published: true,
      featured: false,
      position: 0,
      tag: "",
    };
    render(<ProductEditor product={product} data={data} run={run} close={() => {}} busy={false} />);
    fireEvent.change(screen.getByLabelText(/Preço/), { target: { value: "14,50" } });
    fireEvent.click(screen.getByLabelText("Disponível para pedir"));
    fireEvent.click(screen.getByRole("button", { name: "Salvar produto" }));
    await waitFor(() =>
      expect(spies.save).toHaveBeenCalledWith(
        "products",
        expect.objectContaining({ price_cents: 1450, available: false }),
        product.id,
      ),
    );
  });
  it("sends promotion and participants through the atomic server function", async () => {
    render(
      <PromotionEditor promotion={null} data={data} run={run} close={() => {}} busy={false} />,
    );
    fireEvent.change(screen.getByLabelText("Nome da campanha"), {
      target: { value: "Combo de sexta" },
    });
    fireEvent.change(screen.getByLabelText("Preço original (R$)"), { target: { value: "49,90" } });
    fireEvent.change(screen.getByLabelText("Preço promocional (R$)"), {
      target: { value: "39,90" },
    });
    fireEvent.click(screen.getByLabelText(/Campanha ativa/));
    fireEvent.click(screen.getByRole("button", { name: "Salvar campanha" }));
    await waitFor(() =>
      expect(spies.rpc).toHaveBeenCalledWith(
        "save_promotion",
        expect.objectContaining({
          campaign: expect.objectContaining({
            original_price_cents: 4990,
            promo_price_cents: 3990,
            active: true,
          }),
          product_ids: [],
        }),
      ),
    );
  });
});
describe("Image validation before upload", () => {
  const file = (type: string, bytes: number[], size = bytes.length) =>
    ({
      type,
      size,
      slice: () => ({ arrayBuffer: async () => Uint8Array.from(bytes).buffer }),
    }) as unknown as File;
  it("accepts real signatures and rejects renamed executable/SVG data", async () => {
    await expect(validateImage(file("image/jpeg", [255, 216, 255, 0]))).resolves.toBeUndefined();
    await expect(
      validateImage(file("image/png", [137, 80, 78, 71, 13, 10, 26, 10])),
    ).resolves.toBeUndefined();
    await expect(validateImage(file("image/jpeg", [60, 115, 118, 103]))).rejects.toThrow();
    await expect(validateImage(file("image/jpeg", [255, 216, 255], 5242881))).rejects.toThrow();
  });
});
