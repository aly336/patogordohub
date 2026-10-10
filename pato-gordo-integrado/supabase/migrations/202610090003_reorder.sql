begin;
create function public.move_product(target_id uuid, direction integer) returns void
language plpgsql security invoker set search_path = '' as $$
declare category uuid; current_position integer; neighbor uuid;
begin
 if not public.is_owner() then raise exception 'Not authorized' using errcode='42501'; end if;
 if direction not in (-1,1) then raise exception 'Invalid direction'; end if;
 perform pg_advisory_xact_lock(928735);
 select category_id into category from public.products where id=target_id;
 if category is null then raise exception 'Product not found'; end if;
 with ranked as (select id,(row_number() over(order by position,name,id)-1)::integer as rank from public.products where category_id=category)
 update public.products p set position=r.rank from ranked r where r.id=p.id and p.position<>r.rank;
 select position into current_position from public.products where id=target_id;
 select id into neighbor from public.products where category_id=category and position=current_position+direction;
 if neighbor is not null then
  update public.products set position=case when id=target_id then current_position+direction else current_position end where id in(target_id,neighbor);
 end if;
end $$;
revoke all on function public.move_product(uuid,integer) from public;
grant execute on function public.move_product(uuid,integer) to authenticated;
commit;
