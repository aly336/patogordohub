// Executes the shipped migrations on PostgreSQL (PGlite). auth/storage schemas
// below are test harnesses, not substitutes for a deployed Supabase service.
import { PGlite } from "@electric-sql/pglite";
import { readFileSync, readdirSync } from "node:fs";
import assert from "node:assert/strict";
const pg = new PGlite();
let checks = 0;
const owner = "11111111-1111-4111-8111-111111111111";
const other = "22222222-2222-4222-8222-222222222222";
const extra = "33333333-3333-4333-8333-333333333333";
await pg.exec(`
 create role anon; create role authenticated;
 create schema auth; create schema storage;
 create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz);
 create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
 grant usage on schema public,auth,storage to anon,authenticated;
 grant execute on function auth.uid() to anon,authenticated;
 create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
 create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text references storage.buckets,name text);
 alter table storage.objects enable row level security;
 grant select,insert,update,delete on storage.objects to anon,authenticated;
 insert into auth.users values ('${owner}','owner@example.test',now()),('${other}','other@example.test',now()),('${extra}','extra@example.test',now());
`);
for (const file of readdirSync(new URL("../supabase/migrations/", import.meta.url)).sort())
  await pg.exec(readFileSync(new URL("../supabase/migrations/" + file, import.meta.url), "utf8"));
await pg.exec(`insert into private.owners(user_id) values('${owner}')`);
async function as(role, id = "") {
  await pg.exec(
    `reset role; select set_config('request.jwt.claim.sub','${id}',false); set role ${role};`,
  );
}
async function val(sql, params = []) {
  return (await pg.query(sql, params)).rows[0];
}
async function check(label, fn) {
  await fn();
  checks++;
  console.log("PASS " + label);
}
async function denied(sql, params = []) {
  await assert.rejects(() => pg.query(sql, params));
}
try {
  await check("Anonymous catalog is seeded from original Lovable products", async () => {
    await as("anon");
    const r = await val("select public.get_catalog() as catalog");
    assert.equal(r.catalog.products.length, 11);
    assert.equal(r.catalog.products[0].price_cents, 1300);
    assert.equal(r.catalog.media.length, 7);
  });
  await check("Anonymous cannot create products or read owner/audit data", async () => {
    await denied("insert into public.categories(name) values('injected')");
    await denied("select * from private.owners");
    await denied("select * from public.audit_log");
    await denied("select public.list_owners()");
    await denied("select public.set_owner('other@example.test',true)");
  });
  await check("Authenticated non-owner cannot escalate or upload", async () => {
    await as("authenticated", other);
    assert.equal((await val("select public.is_owner() as allowed")).allowed, false);
    await denied("select public.set_owner('other@example.test',true)");
    await denied(
      "insert into public.media(name,path,mime_type,size_bytes) values('hack','uploads/a.jpg','image/jpeg',100)",
    );
    await denied(
      "insert into storage.objects(bucket_id,name) values('restaurant','uploads/a.jpg')",
    );
    assert.equal(
      (await pg.query("update public.products set price_cents=1 returning id")).rows.length,
      0,
    );
  });
  await check("Owner creates, edits, unpublishes and disables a product", async () => {
    await as("authenticated", owner);
    await pg.exec(
      "insert into public.products(id,name,description,category_id,price_cents,published) values('44444444-4444-4444-8444-444444444444','Teste','Integração','00000000-0000-4000-8000-000000000001',3290,true)",
    );
    await pg.exec("update public.products set price_cents=3490,available=false where name='Teste'");
    await as("anon");
    assert.equal(
      (await val("select price_cents,available from public.products where name='Teste'"))
        .price_cents,
      3490,
    );
    await as("authenticated", owner);
    await pg.exec("update public.site_settings set hide_unavailable=true");
    await as("anon");
    assert.equal(
      (await pg.query("select * from public.products where name='Teste'")).rows.length,
      0,
    );
    await as("authenticated", owner);
    await pg.exec(
      "update public.site_settings set hide_unavailable=false; update public.products set published=false where name='Teste'",
    );
    await as("anon");
    assert.equal(
      (await pg.query("select * from public.products where name='Teste'")).rows.length,
      0,
    );
  });
  await check("Hiding a category hides its products from direct API reads", async () => {
    await as("authenticated", owner);
    await pg.exec(
      "update public.categories set published=false where id='00000000-0000-4000-8000-000000000001'",
    );
    await as("anon");
    assert.equal(
      (
        await pg.query(
          "select * from public.products where category_id='00000000-0000-4000-8000-000000000001'",
        )
      ).rows.length,
      0,
    );
    await as("authenticated", owner);
    await pg.exec(
      "update public.categories set published=true where id='00000000-0000-4000-8000-000000000001'",
    );
  });
  await check("Money and relational integrity reject invalid direct writes", async () => {
    await denied("update public.products set price_cents=-1");
    await denied("delete from public.categories where id='00000000-0000-4000-8000-000000000001'");
    await denied("update public.site_settings set order_url='javascript:alert(1)'");
  });
  const campaign = {
    id: "55555555-5555-4555-8555-555555555555",
    name: "Teste campanha",
    description: "",
    original_price_cents: 4990,
    promo_price_cents: null,
    discount_percent: 20,
    starts_at: new Date(Date.now() - 3600000).toISOString(),
    ends_at: new Date(Date.now() + 3600000).toISOString(),
    active: true,
    position: 0,
  };
  await check("Campaign and product associations save atomically with exact discount", async () => {
    await pg.query("select public.save_promotion($1::jsonb,$2::uuid[])", [
      JSON.stringify(campaign),
      ["00000000-0000-4000-8000-000000000200"],
    ]);
    await as("anon");
    assert.equal(
      (await val("select effective_price_cents from public.promotions")).effective_price_cents,
      3992,
    );
    assert.equal((await pg.query("select * from public.promotion_products")).rows.length, 1);
  });
  await check("Expired, future and inactive campaigns are denied to public reads", async () => {
    await as("authenticated", owner);
    await pg.exec("update public.promotions set ends_at=now()-interval '1 second'");
    await as("anon");
    assert.equal((await pg.query("select * from public.promotions")).rows.length, 0);
    assert.equal((await pg.query("select * from public.promotion_products")).rows.length, 0);
    await as("authenticated", owner);
    await pg.exec(
      "update public.promotions set starts_at=now()+interval '1 day',ends_at=now()+interval '2 days'",
    );
    await as("anon");
    assert.equal((await pg.query("select * from public.promotions")).rows.length, 0);
    await as("authenticated", owner);
    await pg.exec("update public.promotions set starts_at=now()-interval '1 hour',active=false");
    await as("anon");
    assert.equal((await pg.query("select * from public.promotions")).rows.length, 0);
  });
  await check(
    "Campaign rejects invalid discount/dates and rolls back invalid relations",
    async () => {
      await as("authenticated", owner);
      await denied("select public.save_promotion($1::jsonb,$2::uuid[])", [
        JSON.stringify({ ...campaign, discount_percent: 100 }),
        [],
      ]);
      await denied("select public.save_promotion($1::jsonb,$2::uuid[])", [
        JSON.stringify({ ...campaign, ends_at: campaign.starts_at }),
        [],
      ]);
      await denied("select public.save_promotion($1::jsonb,$2::uuid[])", [
        JSON.stringify({ ...campaign, name: "must roll back" }),
        ["99999999-9999-4999-8999-999999999999"],
      ]);
      assert.equal((await val("select name from public.promotions")).name, "Teste campanha");
    },
  );
  await check("Owner public catalog also excludes unpublished and expired content", async () => {
    const r = await val("select public.get_catalog() as catalog");
    assert.equal(r.catalog.products.length, 11);
    assert.equal(r.catalog.promotions.length, 0);
  });
  await check("Owner uploads/replaces metadata; referenced images cannot be deleted", async () => {
    await pg.exec(
      "insert into storage.objects(bucket_id,name) values('restaurant','uploads/abc.jpg'); insert into public.media(id,name,path,mime_type,size_bytes) values('66666666-6666-4666-8666-666666666666','Photo','uploads/abc.jpg','image/jpeg',100); update public.products set image_id='66666666-6666-4666-8666-666666666666' where name='Teste'",
    );
    await denied("delete from public.media where id='66666666-6666-4666-8666-666666666666'");
    await pg.exec(
      "update public.products set image_id=null where name='Teste'; delete from public.media where id='66666666-6666-4666-8666-666666666666'; delete from storage.objects where name='uploads/abc.jpg'",
    );
  });
  await check("Owner audit is generated and cannot be rewritten", async () => {
    assert.ok((await pg.query("select * from public.audit_log")).rows.length > 10);
    await denied("delete from public.audit_log");
  });
  await check("Owner can grant/revoke confirmed accounts; revocation is immediate", async () => {
    await pg.exec("select public.set_owner('extra@example.test',true)");
    await as("authenticated", extra);
    assert.equal((await val("select public.is_owner() as yes")).yes, true);
    await pg.exec("select public.set_owner('extra@example.test',false)");
    assert.equal((await val("select public.is_owner() as yes")).yes, false);
    await denied("insert into public.categories(name) values('revoked')");
  });
  await check(
    "The last owner cannot be revoked and unknown accounts cannot be authorized",
    async () => {
      await as("authenticated", owner);
      await denied("select public.set_owner('owner@example.test',false)");
      await denied("select public.set_owner('unknown@example.test',true)");
    },
  );
  await check("Reordering swaps neighbors atomically and rejects non-owners", async () => {
    await as("authenticated", owner);
    const product = "00000000-0000-4000-8000-000000000201";
    const before = (
      await pg.query(
        "select id from public.products where category_id='00000000-0000-4000-8000-000000000001' order by position,name,id",
      )
    ).rows.map((r) => r.id);
    const previousIndex = before.indexOf(product);
    await pg.query("select public.move_product($1::uuid,-1)", [product]);
    const after = (
      await pg.query(
        "select id from public.products where category_id='00000000-0000-4000-8000-000000000001' order by position,name,id",
      )
    ).rows.map((r) => r.id);
    assert.equal(after[previousIndex - 1], product);
    assert.equal(after[previousIndex], before[previousIndex - 1]);
    await denied("select public.move_product($1::uuid,3)", [product]);
    await as("authenticated", other);
    await denied("select public.move_product($1::uuid,-1)", [product]);
  });
  console.log(
    `\n${checks} database scenarios passed. Supabase Auth/Storage network services are not exercised by this harness.`,
  );
} finally {
  await pg.close();
}
