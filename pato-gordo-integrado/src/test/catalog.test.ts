import { describe, expect, it } from "vitest";
import {
  activePromotion,
  discountedPrice,
  parseMoney,
  promotionSchema,
  type Promotion,
} from "@/lib/catalog";
const campaign = {
  id: "test",
  name: "Oferta",
  description: "",
  image_id: null,
  original_price_cents: 4990,
  promo_price_cents: 3990,
  discount_percent: null,
  effective_price_cents: 3990,
  starts_at: "2026-10-09T15:00:00.000Z",
  ends_at: "2026-10-09T16:00:00.000Z",
  active: true,
  position: 0,
} satisfies Promotion;
describe("Money and campaign boundaries", () => {
  it("parses reais directly to exact integer centavos", () => {
    expect(parseMoney("32,90")).toBe(3290);
    expect(parseMoney("0.01")).toBe(1);
    expect(parseMoney("4.5")).toBe(450);
    expect(discountedPrice(4990, 20)).toBe(3992);
  });
  it.each(["-1", "0", "1.999", "NaN", "1e3", "", "1.234,50"])("rejects invalid input %s", (v) =>
    expect(() => parseMoney(v)).toThrow(),
  );
  it("expires at the exact end and starts inclusively", () => {
    expect(activePromotion(campaign, Date.parse(campaign.starts_at))).toBe(true);
    expect(activePromotion(campaign, Date.parse(campaign.ends_at))).toBe(false);
    expect(activePromotion({ ...campaign, active: false }, Date.parse(campaign.starts_at))).toBe(
      false,
    );
  });
  it("validates discount exclusivity and period", () => {
    expect(promotionSchema.safeParse(campaign).success).toBe(true);
    expect(promotionSchema.safeParse({ ...campaign, promo_price_cents: 5000 }).success).toBe(false);
    expect(promotionSchema.safeParse({ ...campaign, discount_percent: 10 }).success).toBe(false);
    expect(promotionSchema.safeParse({ ...campaign, ends_at: campaign.starts_at }).success).toBe(
      false,
    );
  });
});
