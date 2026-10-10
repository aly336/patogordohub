begin;
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table private.owners (
  user_id uuid primary key references auth.users(id) on delete restrict,
  created_at timestamptz not null default now()
);
create table public.audit_log (
  id bigint generated always as identity primary key,
  actor_id uuid,
  action text not null,
  entity text not null,
  record_id text,
  created_at timestamptz not null default now()
);
create function public.is_owner() returns boolean language sql stable security definer
set search_path = '' as $$ select exists(select 1 from private.owners where user_id = auth.uid()) $$;
revoke all on function public.is_owner() from public;
grant execute on function public.is_owner() to anon, authenticated;

create function public.audit_change() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.audit_log(actor_id,action,entity,record_id)
  values(auth.uid(),tg_op,tg_table_name,coalesce(to_jsonb(new)->>'id',to_jsonb(old)->>'id',to_jsonb(new)->>'user_id',to_jsonb(old)->>'user_id'));
  return coalesce(new,old);
end $$;
revoke all on function public.audit_change() from public;

create table public.media (
  id uuid primary key default gen_random_uuid(),
  name text not null check(length(name) between 1 and 160),
  path text not null unique check(path ~ '^(original/|uploads/)[a-zA-Z0-9/_.-]+\.(jpg|jpeg|png|webp)$'),
  mime_type text not null check(mime_type in ('image/jpeg','image/png','image/webp')),
  size_bytes integer not null check(size_bytes between 1 and 5242880),
  alt text not null default '' check(length(alt) <= 300),
  created_at timestamptz not null default now()
);
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check(length(trim(name)) between 1 and 80),
  position integer not null default 0 check(position between 0 and 100000),
  published boolean not null default true
);
create table public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null check(length(trim(name)) between 1 and 120),
  description text not null default '' check(length(description) <= 2000),
  ingredients text not null default '' check(length(ingredients) <= 2000),
  category_id uuid not null references public.categories on delete restrict,
  price_cents integer not null check(price_cents between 1 and 100000000),
  image_id uuid references public.media on delete restrict,
  featured boolean not null default false,
  available boolean not null default true,
  published boolean not null default false,
  position integer not null default 0 check(position between 0 and 100000),
  tag text not null default '' check(length(tag) <= 40)
);
create index products_category_idx on public.products(category_id);
create table public.addons (
  id uuid primary key default gen_random_uuid(),
  name text not null check(length(trim(name)) between 1 and 120),
  price_cents integer not null check(price_cents between 1 and 100000000),
  published boolean not null default true,
  position integer not null default 0 check(position between 0 and 100000)
);
create table public.promotions (
  id uuid primary key default gen_random_uuid(),
  name text not null check(length(trim(name)) between 1 and 120),
  description text not null default '' check(length(description) <= 2000),
  image_id uuid references public.media on delete restrict,
  original_price_cents integer not null check(original_price_cents between 1 and 100000000),
  promo_price_cents integer,
  discount_percent integer check(discount_percent between 1 and 99),
  effective_price_cents integer generated always as
    (coalesce(promo_price_cents,round(original_price_cents::numeric * (100-discount_percent)/100)::integer)) stored,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  active boolean not null default false,
  position integer not null default 0 check(position between 0 and 100000),
  check(ends_at > starts_at),
  check((promo_price_cents is null) <> (discount_percent is null)),
  check(promo_price_cents is null or promo_price_cents between 1 and original_price_cents-1),
  check(effective_price_cents between 1 and original_price_cents-1)
);
create table public.promotion_products (
  promotion_id uuid references public.promotions on delete cascade,
  product_id uuid references public.products on delete cascade,
  primary key(promotion_id,product_id)
);
create index promotion_products_product_idx on public.promotion_products(product_id);

create table public.site_settings (
  id integer primary key default 1 check(id=1),
  name text not null check(length(trim(name)) between 1 and 120),
  address text not null check(length(address) between 1 and 500),
  whatsapp text not null default '' check(whatsapp = '' or whatsapp ~ '^[1-9][0-9]{9,14}$'),
  instagram text not null default '' check(instagram = '' or instagram ~ '^https://(www\.)?instagram\.com/[a-zA-Z0-9_.]+/?$'),
  hours text not null default '' check(length(hours) <= 1000),
  headline text not null default '' check(length(headline) <= 180),
  order_url text not null default '' check(order_url = '' or order_url ~ '^https://[^[:space:]]+$'),
  maps_url text not null default '' check(maps_url = '' or maps_url ~ '^https://[^[:space:]]+$'),
  logo_id uuid references public.media on delete restrict,
  hero_id uuid references public.media on delete restrict,
  combo_id uuid references public.media on delete restrict,
  lunch_id uuid references public.media on delete restrict,
  about_id uuid references public.media on delete restrict,
  hide_unavailable boolean not null default false
);

do $$ declare t text; begin
  foreach t in array array['media','categories','products','addons','promotions','promotion_products','site_settings'] loop
    execute format('alter table public.%I enable row level security',t);
    execute format('create policy owner_all on public.%I for all to authenticated using ((select public.is_owner())) with check ((select public.is_owner()))',t);
    execute format('create trigger audit after insert or update or delete on public.%I for each row execute function public.audit_change()',t);
    execute format('revoke all on public.%I from anon, authenticated',t);
    execute format('grant select on public.%I to anon',t);
    execute format('grant select,insert,update,delete on public.%I to authenticated',t);
  end loop;
end $$;
alter table public.audit_log enable row level security;
revoke all on public.audit_log from anon,authenticated;
grant select on public.audit_log to authenticated;
create policy audit_owners on public.audit_log for select to authenticated using ((select public.is_owner()));
create trigger audit after insert or update or delete on private.owners for each row execute function public.audit_change();
create policy public_media on public.media for select to anon,authenticated using(true);
create policy public_settings on public.site_settings for select to anon,authenticated using(true);
create policy public_categories on public.categories for select to anon,authenticated using(published);
create policy public_addons on public.addons for select to anon,authenticated using(published);
create policy public_products on public.products for select to anon,authenticated using(
  published and exists(select 1 from public.categories c where c.id=category_id and c.published)
  and (available or not coalesce((select hide_unavailable from public.site_settings where id=1),false))
);
create policy public_promotions on public.promotions for select to anon,authenticated using(active and starts_at <= now() and ends_at > now());
create policy public_promotion_products on public.promotion_products for select to anon,authenticated using(
  exists(select 1 from public.promotions p where p.id=promotion_id and p.active and p.starts_at <= now() and p.ends_at > now())
  and exists(select 1 from public.products p where p.id=product_id)
);

-- Explicit filters apply even when the public site is visited by an owner.
create function public.get_catalog() returns jsonb language sql stable security invoker set search_path = '' as $$
 select jsonb_build_object(
 'server_now',now(),
 'settings',(select to_jsonb(s) from public.site_settings s where id=1),
 'media',coalesce((select jsonb_agg(m) from public.media m),'[]'::jsonb),
 'categories',coalesce((select jsonb_agg(c order by c.position,c.name) from public.categories c where published),'[]'::jsonb),
 'products',coalesce((select jsonb_agg(p order by (select c.position from public.categories c where c.id=p.category_id),p.position,p.name) from public.products p where published
   and exists(select 1 from public.categories c where c.id=p.category_id and c.published)
   and (available or not coalesce((select hide_unavailable from public.site_settings where id=1),false))),'[]'::jsonb),
 'addons',coalesce((select jsonb_agg(a order by a.position,a.name) from public.addons a where published),'[]'::jsonb),
 'promotions',coalesce((select jsonb_agg(p order by p.position,p.name) from public.promotions p where active and starts_at <= now() and ends_at > now()),'[]'::jsonb)
 )
$$;
revoke all on function public.get_catalog() from public;
grant execute on function public.get_catalog() to anon,authenticated;

-- Atomic campaign + participating products. RLS remains in effect for every write.
create function public.save_promotion(campaign jsonb, product_ids uuid[]) returns uuid
language plpgsql security invoker set search_path = '' as $$
declare p public.promotions; result uuid;
begin
 if not public.is_owner() then raise exception 'Not authorized' using errcode='42501'; end if;
 p := jsonb_populate_record(null::public.promotions,campaign);
 insert into public.promotions(id,name,description,image_id,original_price_cents,promo_price_cents,discount_percent,starts_at,ends_at,active,position)
 values(coalesce(p.id,gen_random_uuid()),p.name,coalesce(p.description,''),p.image_id,p.original_price_cents,p.promo_price_cents,p.discount_percent,p.starts_at,p.ends_at,coalesce(p.active,false),coalesce(p.position,0))
 on conflict(id) do update set name=excluded.name, description=excluded.description,image_id=excluded.image_id,
 original_price_cents=excluded.original_price_cents,promo_price_cents=excluded.promo_price_cents,discount_percent=excluded.discount_percent,
 starts_at=excluded.starts_at,ends_at=excluded.ends_at,active=excluded.active,position=excluded.position
 returning id into result;
 delete from public.promotion_products where promotion_id=result;
 insert into public.promotion_products select result,unnest(product_ids);
 return result;
end $$;
revoke all on function public.save_promotion(jsonb,uuid[]) from public;
grant execute on function public.save_promotion(jsonb,uuid[]) to authenticated;

create function public.list_owners() returns table(user_id uuid,email text,created_at timestamptz)
language plpgsql security definer set search_path = '' as $$
begin
 if not public.is_owner() then raise exception 'Not authorized' using errcode='42501'; end if;
 return query select o.user_id,u.email::text,o.created_at from private.owners o join auth.users u on u.id=o.user_id order by o.created_at;
end $$;
create function public.set_owner(target_email text, authorize boolean) returns void
language plpgsql security definer set search_path = '' as $$
declare target uuid;
begin
 perform pg_advisory_xact_lock(928734);
 if not public.is_owner() then raise exception 'Not authorized' using errcode='42501'; end if;
 select id into target from auth.users where lower(email)=lower(trim(target_email)) and email_confirmed_at is not null;
 if target is null then raise exception 'Confirmed account required'; end if;
 if authorize then
   insert into private.owners(user_id) values(target) on conflict do nothing;
 else
   if (select count(*) from private.owners) <= 1 and exists(select 1 from private.owners where user_id=target) then raise exception 'Last owner cannot be removed'; end if;
   delete from private.owners where user_id=target;
 end if;
end $$;
revoke all on function public.list_owners(), public.set_owner(text,boolean) from public;
grant execute on function public.list_owners(), public.set_owner(text,boolean) to authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('restaurant','restaurant',true,5242880,array['image/jpeg','image/png','image/webp']);
create policy restaurant_owner_select on storage.objects for select to authenticated using(bucket_id='restaurant' and (select public.is_owner()));
create policy restaurant_owner_insert on storage.objects for insert to authenticated with check(bucket_id='restaurant' and (select public.is_owner()) and name ~ '^uploads/[a-f0-9-]+\.(jpg|jpeg|png|webp)$');
create policy restaurant_owner_update on storage.objects for update to authenticated using(bucket_id='restaurant' and (select public.is_owner())) with check(bucket_id='restaurant' and (select public.is_owner()));
create policy restaurant_owner_delete on storage.objects for delete to authenticated using(bucket_id='restaurant' and (select public.is_owner()));
commit;
