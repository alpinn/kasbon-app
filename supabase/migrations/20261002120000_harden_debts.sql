drop trigger debts_set_updated_at on public.debts;
drop function public.set_updated_at();

create function public.debts_guard_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  new.settled_at := case
    when new.settled_at is null then null
    else coalesce(old.settled_at, now())
  end;
  return new;
end;
$$;

revoke execute on function public.debts_guard_update() from public, anon, authenticated;

create trigger debts_guard_update
before update on public.debts
for each row execute function public.debts_guard_update();

revoke all on public.debts from authenticated;
grant select, delete on public.debts to authenticated;
grant insert (type, counterpart_name, amount, note, due_date) on public.debts to authenticated;
grant update (type, counterpart_name, amount, note, due_date, settled_at) on public.debts to authenticated;

alter table public.debts add constraint debts_settled_after_created
  check (settled_at is null or settled_at >= created_at);

alter table public.debts drop constraint debts_amount_check;
alter table public.debts add constraint debts_amount_check
  check (amount > 0 and amount <= 1000000000000);
