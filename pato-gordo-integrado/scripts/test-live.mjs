// Run ONLY against a disposable/staging Supabase project after applying migrations.
// No privileged service key is used. Test accounts must already exist.
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
const required = [
  "TEST_SUPABASE_URL",
  "TEST_SUPABASE_PUBLIC_KEY",
  "TEST_OWNER_EMAIL",
  "TEST_OWNER_PASSWORD",
  "TEST_MEMBER_EMAIL",
  "TEST_MEMBER_PASSWORD",
];
for (const key of required) if (!process.env[key]) throw new Error(`Missing ${key}`);
if (process.env.TEST_ALLOW_WRITES !== "true")
  throw new Error(
    "Set TEST_ALLOW_WRITES=true for a staging project. This test creates and removes only its own fixtures.",
  );
const client = () =>
  createClient(process.env.TEST_SUPABASE_URL, process.env.TEST_SUPABASE_PUBLIC_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
const anon = client(),
  owner = client(),
  member = client();
const must = async (p) => {
  const result = await p;
  if (result.error)
    throw new Error(
      `API operation failed (${result.error.code ?? result.error.status ?? "unknown"})`,
    );
  return result.data;
};
await must(
  owner.auth.signInWithPassword({
    email: process.env.TEST_OWNER_EMAIL,
    password: process.env.TEST_OWNER_PASSWORD,
  }),
);
await must(
  member.auth.signInWithPassword({
    email: process.env.TEST_MEMBER_EMAIL,
    password: process.env.TEST_MEMBER_PASSWORD,
  }),
);
assert.equal(await must(owner.rpc("is_owner")), true);
assert.equal(await must(member.rpc("is_owner")), false);
const id = crypto.randomUUID(),
  product = crypto.randomUUID(),
  campaign = crypto.randomUUID(),
  photo = crypto.randomUUID();
const paths = [`uploads/${crypto.randomUUID()}.jpg`, `uploads/${crypto.randomUUID()}.jpg`];
let checks = 0;
const pass = (name) => console.log(`PASS ${++checks}: ${name}`);
try {
  await must(owner.from("categories").insert({ id, name: `QA ${id}`, position: 99999 }));
  await must(
    owner.from("products").insert({
      id: product,
      name: `QA ${id}`,
      category_id: id,
      price_cents: 3290,
      published: true,
    }),
  );
  assert.equal(
    (await must(anon.from("products").select("price_cents").eq("id", product).single()))
      .price_cents,
    3290,
  );
  pass("Public menu reads database data");
  await must(owner.from("products").update({ price_cents: 3490 }).eq("id", product));
  assert.equal(
    (await must(anon.from("products").select("price_cents").eq("id", product).single()))
      .price_cents,
    3490,
  );
  await must(
    owner.from("products").update({ published: false, available: false }).eq("id", product),
  );
  assert.equal((await must(anon.from("products").select("id").eq("id", product))).length, 0);
  pass("Edit, hide and disable product");
  for (const c of [anon, member]) {
    assert.ok((await c.from("categories").insert({ name: `forbidden ${id}` })).error);
    const update = await c
      .from("products")
      .update({ price_cents: 1 })
      .eq("id", product)
      .select("id");
    assert.ok(update.error || update.data.length === 0);
    assert.ok((await c.rpc("list_owners")).error);
    assert.ok(
      (await c.rpc("set_owner", { target_email: process.env.TEST_MEMBER_EMAIL, authorize: true }))
        .error,
    );
    assert.ok(
      (
        await c.storage
          .from("restaurant")
          .upload(`uploads/${crypto.randomUUID()}.jpg`, new Uint8Array([1, 2, 3]), {
            contentType: "image/jpeg",
          })
      ).error,
    );
  }
  pass("Anonymous/member direct API writes, escalation and upload denied");
  await must(
    owner.rpc("save_promotion", {
      campaign: {
        id: campaign,
        name: `QA ${id}`,
        original_price_cents: 4990,
        promo_price_cents: 3990,
        starts_at: new Date(Date.now() - 3600000).toISOString(),
        ends_at: new Date(Date.now() + 3600000).toISOString(),
        active: true,
      },
      product_ids: [product],
    }),
  );
  assert.equal(
    (
      await must(
        anon.from("promotions").select("effective_price_cents").eq("id", campaign).single(),
      )
    ).effective_price_cents,
    3990,
  );
  await must(owner.from("promotions").update({ active: false }).eq("id", campaign));
  assert.equal((await must(anon.from("promotions").select("id").eq("id", campaign))).length, 0);
  await must(
    owner
      .from("promotions")
      .update({ active: true, ends_at: new Date(Date.now() - 1000).toISOString() })
      .eq("id", campaign),
  );
  assert.equal((await must(anon.from("promotions").select("id").eq("id", campaign))).length, 0);
  pass("Create, activate, disable and expire campaign");
  const bytes = readFileSync(new URL("../public/images/burger.jpg", import.meta.url));
  for (const path of paths)
    await must(owner.storage.from("restaurant").upload(path, bytes, { contentType: "image/jpeg" }));
  await must(
    owner.from("media").insert({
      id: photo,
      name: `QA ${id}`,
      path: paths[0],
      mime_type: "image/jpeg",
      size_bytes: bytes.length,
    }),
  );
  await must(owner.from("products").update({ image_id: photo }).eq("id", product));
  const url = owner.storage.from("restaurant").getPublicUrl(paths[0]).data.publicUrl;
  assert.equal((await fetch(url)).status, 200);
  assert.ok((await owner.from("media").delete().eq("id", photo)).error);
  await must(owner.from("media").update({ path: paths[1] }).eq("id", photo));
  pass("Upload, public image retrieval, replacement and reference protection");
  console.log(
    `${checks} live API scenarios passed. Password recovery email and responsive UI require manual verification.`,
  );
} finally {
  // IDs and paths are generated above: cleanup never enumerates or deletes existing data.
  for (const [table, key, value] of [
    ["promotions", "id", campaign],
    ["products", "id", product],
    ["categories", "id", id],
    ["media", "id", photo],
  ]) {
    const { error } = await owner.from(table).delete().eq(key, value);
    if (error) console.error(`Cleanup failed for ${table} fixture ${value}`);
  }
  const { error } = await owner.storage.from("restaurant").remove(paths);
  if (error) console.error(`Cleanup failed for files ${paths.join(", ")}`);
  await Promise.all([owner.auth.signOut(), member.auth.signOut()]);
}
