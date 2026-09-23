-- =====================================================================
-- Закрытие дыр в правах доступа
-- =====================================================================
-- Запустить в Supabase → SQL Editor на уже развёрнутой базе.
-- Для новых проектов всё это уже есть в supabase/init.sql.
--
-- 1. profiles: пользователь мог изменить свою строку целиком, включая
--    role, и выдать себе права админа. Теперь можно менять только
--    display_name.
-- 2. tournaments: создавать, менять и удалять турниры мог кто угодно,
--    даже без входа (анонимный ключ есть в коде страницы). Теперь пишет
--    только админ, как в остальных таблицах.
-- 3. is_admin(): фиксированный search_path (предупреждение линтера
--    Supabase function_search_path_mutable).
-- =====================================================================

-- 1. profiles — запрет на смену роли
revoke update on profiles from anon, authenticated;
grant update (display_name) on profiles to authenticated;

-- 2. tournaments — пишет только админ.
-- Удаляем ВСЕ политики таблицы, а не только известные по имени: на боевой
-- базе они могли создаваться вручную и называться иначе. Разрешающие
-- политики складываются через OR, так что любая забытая оставила бы дыру.
alter table tournaments enable row level security;

do $$
declare
  p record;
begin
  for p in
    select policyname from pg_policies
    where schemaname = 'public' and tablename = 'tournaments'
  loop
    execute format('drop policy %I on public.tournaments', p.policyname);
  end loop;
end $$;

create policy tournaments_read  on tournaments for select using (true);
create policy tournaments_write on tournaments for all    using (is_admin()) with check (is_admin());

-- 3. is_admin() — тело без изменений
create or replace function is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from profiles where id = auth.uid() and role = 'admin'
  );
$$;

-- ---------------------------------------------------------------------
-- Проверка: все таблицы под RLS, у tournaments ровно две политики
-- ---------------------------------------------------------------------
select tablename, rowsecurity
from pg_tables
where schemaname = 'public'
  and tablename in ('profiles', 'seasons', 'players', 'tournaments', 'games', 'game_players');

select tablename, policyname, cmd, qual, with_check
from pg_policies
where schemaname = 'public'
order by tablename, policyname;
