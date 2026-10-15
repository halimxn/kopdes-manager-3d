-- =============================================================================
-- RESET FORCE CLEAN: Kopdes Management Web
-- Proyek Tujuan: <project-ref> (KDMP Puntukrejo)
-- PERINGATAN: SCRIPT INI AKAN MENGHAPUS SEMUA DATA LAMA PADA TABEL APLIKASI.
--
-- Karakteristik:
-- 1. Menghapus tabel dan function lama tanpa gagal meski ada data uji tersimpan.
-- 2. Membangun skema bersih secara menyeluruh dari seluruh migrasi aktif.
-- 3. Memisahkan secara tegas Tugas ('work-items') dan Kegiatan Lapangan ('journal')
--    dengan indeks performa khusus pada tanggal, status, dan foreign relation.
-- 4. Mengaktifkan RLS, proteksi brute-force PIN, audit log, dan relasi integritas.
-- =============================================================================

begin;
set local lock_timeout = '10s';

-- Hapus tabel aplikasi lama secara total
drop table if exists public.hub_records, public.manager_reports,
  public.manager_sessions, public.manager_security, public.activity_log, public.template_runs cascade;
drop function if exists public.hub_changed() cascade;
drop function if exists public.hub_log() cascade;
drop function if exists public.hub_check_relations() cascade;
drop function if exists public.reserve_pin_attempt() cascade;
drop function if exists public.finish_pin_login(text, text) cascade;
drop function if exists public.initialize_manager(text) cascade;
drop function if exists public.change_manager_pin(text, text) cascade;
drop function if exists public.install_plan(jsonb) cascade;
drop function if exists public.save_work_item(uuid, jsonb, jsonb) cascade;
drop function if exists public.restore_manager_data(jsonb, jsonb) cascade;
drop function if exists public.hub_validate_operations() cascade;
drop function if exists public.hub_operations_ready() cascade;
drop function if exists public.hub_validate_logistics() cascade;
drop function if exists public.hub_post_stock_movement(jsonb) cascade;
drop function if exists public.hub_logistics_ready() cascade;
drop function if exists public.hub_validate_administration() cascade;
drop function if exists public.hub_administration_ready() cascade;

-- Sumber: 20260930000001_manager_hub.sql
-- Hanya untuk proyek Supabase BARU. Tidak menyentuh database lama.
-- Data domain divalidasi Zod di server; JSONB menjaga fondasi tetap kecil.

create table public.hub_records (
  id uuid primary key default gen_random_uuid(),
  entity text not null check (entity in ('organization','workstreams','milestones','work-items','units','checklist','stakeholders','interactions','meetings','decisions','documents','risks','issues','staff','trainings','journal')),
  data jsonb not null check (jsonb_typeof(data) = 'object' and length(trim(data->>'title')) > 0),
  recurrence_key text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index hub_records_entity on public.hub_records(entity, created_at);
create unique index hub_single_organization on public.hub_records(entity) where entity = 'organization';
create unique index hub_unique_workstream_code on public.hub_records((data->>'code')) where entity = 'workstreams';
create table public.manager_security (
  id boolean primary key default true check(id),
  pin_hash text,
  attempts integer not null default 0,
  blocked_until timestamptz,
  next_attempt_at timestamptz
);
insert into public.manager_security(id) values(true);
create table public.manager_sessions (
  token_hash text primary key,
  expires_at timestamptz not null
);
create table public.manager_reports (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  period_start date not null,
  period_end date not null check(period_end >= period_start),
  snapshot jsonb not null,
  created_at timestamptz not null default now()
);
create table public.activity_log (
  id bigint generated always as identity primary key,
  entity text not null,
  record_id uuid not null,
  action text not null,
  created_at timestamptz not null default now()
);
create table public.template_runs (key text primary key, created_at timestamptz not null default now());

create function public.hub_changed() returns trigger language plpgsql set search_path = '' as $$
begin
  if TG_OP = 'UPDATE' then NEW.updated_at := now(); return NEW; end if;
  return NEW;
end $$;
create trigger hub_timestamp before update on public.hub_records for each row execute function public.hub_changed();
create function public.hub_log() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if TG_OP = 'DELETE' then
    insert into public.activity_log(entity,record_id,action) values(OLD.entity,OLD.id,TG_OP); return OLD;
  end if;
  insert into public.activity_log(entity,record_id,action) values(NEW.entity,NEW.id,TG_OP); return NEW;
end $$;
create trigger hub_activity after insert or update or delete on public.hub_records for each row execute function public.hub_log();

-- Relasi diperiksa pada akhir transaksi: seed/pulihkan boleh memasukkan anak lebih dahulu.
create function public.hub_check_relations() returns trigger language plpgsql security definer set search_path = '' as $$
declare current_row public.hub_records; field text; target text; reference_id text; dependency text; has_cycle boolean;
begin
  if TG_OP = 'DELETE' then
    if not exists(select 1 from public.hub_records where id=OLD.id) and exists(
      select 1 from public.hub_records r where
      exists(select 1 from jsonb_each_text(r.data) pair where pair.key like '%\_id' escape '\' and pair.value=OLD.id::text)
      or coalesce(r.data->'dependencies','[]'::jsonb) ? OLD.id::text
    ) then raise exception 'Record is still referenced'; end if;
    return null;
  end if;
  select * into current_row from public.hub_records where id=NEW.id;
  if not found then return null; end if;
  for field,target in select * from (values
    ('workstream_id','workstreams'),('milestone_id','milestones'),('unit_id','units'),
    ('stakeholder_id','stakeholders'),('meeting_id','meetings'),('issue_id','issues'),('staff_id','staff'),('work_item_id','work-items')
  ) as refs(field,target) loop
    reference_id:=current_row.data->>field;
    if coalesce(reference_id,'')<>'' and not exists(select 1 from public.hub_records where id::text=reference_id and entity=target) then
      raise exception 'Missing related record';
    end if;
  end loop;
  if current_row.entity='work-items' then
    for dependency in select jsonb_array_elements_text(coalesce(current_row.data->'dependencies','[]'::jsonb)) loop
      if not exists(select 1 from public.hub_records where id::text=dependency and entity='work-items') then raise exception 'Missing dependency'; end if;
    end loop;
    with recursive walk(id,path,cycle) as (
      select current_row.id::text,array[current_row.id::text],false
      union all
      select edge.value,w.path || edge.value,edge.value=any(w.path)
      from walk w join public.hub_records r on r.id::text=w.id,
      lateral jsonb_array_elements_text(coalesce(r.data->'dependencies','[]'::jsonb)) edge(value)
      where not w.cycle
    ) select exists(select 1 from walk where cycle) into has_cycle;
    if has_cycle then raise exception 'Circular dependency'; end if;
  end if;
  return null;
end $$;
create constraint trigger hub_relations after insert or update or delete on public.hub_records deferrable initially deferred for each row execute function public.hub_check_relations();

-- Satu baris terkunci: pembatasan bertahan pada banyak proses/server.
create function public.reserve_pin_attempt() returns text language plpgsql security definer set search_path = '' as $$
declare access public.manager_security;
begin
  select * into access from public.manager_security where id = true for update;
  if access.pin_hash is null then return null; end if;
  if access.blocked_until > now() or access.next_attempt_at > now() then return null; end if;
  if access.blocked_until is not null and access.blocked_until <= now() then access.attempts := 0; end if;
  update public.manager_security set attempts = access.attempts + 1,
    blocked_until = case when access.attempts + 1 >= 5 then now() + interval '15 minutes' else null end,
    next_attempt_at = now() + make_interval(secs => power(2, least(access.attempts,4))::integer)
    where id = true;
  return access.pin_hash;
end $$;
create function public.finish_pin_login(expected_hash text, session_hash text) returns boolean language plpgsql security definer set search_path = '' as $$
begin
  perform 1 from public.manager_security where id = true and pin_hash = expected_hash for update;
  if not found then return false; end if;
  update public.manager_security set attempts=0,blocked_until=null,next_attempt_at=null where id=true;
  delete from public.manager_sessions where expires_at <= now();
  insert into public.manager_sessions(token_hash,expires_at) values(session_hash,now()+interval '12 hours');
  return true;
end $$;
create function public.initialize_manager(hash text) returns boolean language plpgsql security definer set search_path = '' as $$
begin
  update public.manager_security set pin_hash=hash where id=true and pin_hash is null;
  return found;
end $$;
create function public.change_manager_pin(expected_hash text, new_hash text) returns boolean language plpgsql security definer set search_path = '' as $$
begin
  update public.manager_security set pin_hash=new_hash,attempts=0,blocked_until=null,next_attempt_at=null where id=true and pin_hash=expected_hash;
  if not found then return false; end if;
  delete from public.manager_sessions;
  return true;
end $$;
create function public.install_plan(records jsonb) returns boolean language plpgsql security definer set search_path = '' as $$
begin
  insert into public.template_runs(key) values('plan-90-v1') on conflict do nothing;
  if not found then return false; end if;
  insert into public.hub_records(id,entity,data)
    select (item->>'id')::uuid,item->>'entity',item->'data' from jsonb_array_elements(records) item;
  return true;
end $$;
create function public.save_work_item(record_id uuid, payload jsonb, next_payload jsonb) returns jsonb language plpgsql security definer set search_path = '' as $$
declare saved public.hub_records; previous_status text;
begin
  if record_id is null then
    insert into public.hub_records(entity,data) values('work-items',payload) returning * into saved;
  else
    select data->>'status' into previous_status from public.hub_records where id=record_id and entity='work-items' for update;
    if not found then raise exception 'Task not found'; end if;
    update public.hub_records set data=payload where id=record_id returning * into saved;
  end if;
  if payload->>'status'='selesai' and previous_status is distinct from 'selesai' and next_payload is not null then
    insert into public.hub_records(entity,data,recurrence_key) values('work-items',next_payload,saved.id::text || ':' || (payload->>'due_date')) on conflict(recurrence_key) do nothing;
  end if;
  return to_jsonb(saved);
end $$;
create function public.restore_manager_data(records jsonb, reports jsonb) returns void language plpgsql security definer set search_path = '' as $$
begin
  delete from public.hub_records;
  insert into public.hub_records(id,entity,data,recurrence_key,created_at,updated_at)
    select (item->>'id')::uuid,item->>'entity',item->'data',item->>'recurrence_key',(item->>'created_at')::timestamptz,(item->>'updated_at')::timestamptz from jsonb_array_elements(records) item;
  delete from public.manager_reports;
  insert into public.manager_reports(id,title,period_start,period_end,snapshot,created_at)
    select (item->>'id')::uuid,item->>'title',(item->>'period_start')::date,(item->>'period_end')::date,item->'snapshot',(item->>'created_at')::timestamptz from jsonb_array_elements(reports) item;
  insert into public.template_runs(key) values('plan-90-v1') on conflict do nothing;
end $$;

alter table public.hub_records enable row level security;
alter table public.manager_security enable row level security;
alter table public.manager_sessions enable row level security;
alter table public.manager_reports enable row level security;
alter table public.activity_log enable row level security;
alter table public.template_runs enable row level security;
-- Tidak ada policy anon/authenticated. Hanya server dengan sesi terverifikasi.
revoke all on public.hub_records,public.manager_security,public.manager_sessions,public.manager_reports,public.activity_log,public.template_runs from anon,authenticated;
grant all on public.hub_records,public.manager_security,public.manager_sessions,public.manager_reports,public.activity_log,public.template_runs to service_role;
grant usage, select on sequence public.activity_log_id_seq to service_role;
revoke all on function public.reserve_pin_attempt(),public.finish_pin_login(text,text),public.initialize_manager(text),public.change_manager_pin(text,text),public.install_plan(jsonb),public.restore_manager_data(jsonb,jsonb),public.save_work_item(uuid,jsonb,jsonb),public.hub_changed(),public.hub_log(),public.hub_check_relations() from public,anon,authenticated;
grant execute on function public.reserve_pin_attempt(),public.finish_pin_login(text,text),public.initialize_manager(text),public.change_manager_pin(text,text),public.install_plan(jsonb),public.restore_manager_data(jsonb,jsonb),public.save_work_item(uuid,jsonb,jsonb) to service_role;


-- Sumber: 20261001000002_operations.sql
-- Jalankan hanya setelah disetujui pemilik pada proyek <project-ref>.
-- Menambah empat domain pencatatan; tidak menghapus data atau mengubah izin RLS.

alter table public.hub_records drop constraint hub_records_entity_check;
alter table public.hub_records add constraint hub_records_entity_check check(entity in ('organization','workstreams','milestones','work-items','units','checklist','stakeholders','interactions','meetings','decisions','documents','risks','issues','staff','trainings','journal','members','cash-entries','inventory-items','stock-counts'));
create unique index hub_member_number on public.hub_records(lower(trim(data->>'member_number'))) where entity='members';
create unique index hub_inventory_sku on public.hub_records(lower(trim(data->>'sku'))) where entity='inventory-items';
create or replace function public.hub_check_relations() returns trigger language plpgsql security definer set search_path = '' as $$
declare current_row public.hub_records; field text; target text; reference_id text; dependency text; has_cycle boolean;
begin
  if TG_OP = 'DELETE' then
    if not exists(select 1 from public.hub_records where id=OLD.id) and exists(
      select 1 from public.hub_records r where
      exists(select 1 from jsonb_each_text(r.data) pair where pair.key like '%\_id' escape '\' and pair.value=OLD.id::text)
      or coalesce(r.data->'dependencies','[]'::jsonb) ? OLD.id::text
    ) then raise exception 'Record is still referenced'; end if;
    return null;
  end if;
  select * into current_row from public.hub_records where id=NEW.id;
  if not found then return null; end if;
  for field,target in select * from (values
    ('item_id','inventory-items'),('workstream_id','workstreams'),('milestone_id','milestones'),('unit_id','units'),
    ('stakeholder_id','stakeholders'),('meeting_id','meetings'),('issue_id','issues'),('staff_id','staff'),('work_item_id','work-items')
  ) as refs(field,target) loop
    reference_id:=current_row.data->>field;
    if coalesce(reference_id,'')<>'' and not exists(select 1 from public.hub_records where id::text=reference_id and entity=target) then
      raise exception 'Missing related record';
    end if;
  end loop;
  if current_row.entity='work-items' then
    for dependency in select jsonb_array_elements_text(coalesce(current_row.data->'dependencies','[]'::jsonb)) loop
      if not exists(select 1 from public.hub_records where id::text=dependency and entity='work-items') then raise exception 'Missing dependency'; end if;
    end loop;
    with recursive walk(id,path,cycle) as (
      select current_row.id::text,array[current_row.id::text],false
      union all
      select edge.value,w.path || edge.value,edge.value=any(w.path)
      from walk w join public.hub_records r on r.id::text=w.id,
      lateral jsonb_array_elements_text(coalesce(r.data->'dependencies','[]'::jsonb)) edge(value)
      where not w.cycle
    ) select exists(select 1 from walk where cycle) into has_cycle;
    if has_cycle then raise exception 'Circular dependency'; end if;
  end if;
  return null;
end $$;

create function public.hub_validate_operations() returns trigger language plpgsql set search_path='' as $$
declare field text; value numeric;
begin
  if NEW.entity in ('cash-entries','inventory-items','stock-counts') then
    for field in select unnest(case NEW.entity when 'cash-entries' then array['amount'] when 'inventory-items' then array['book_quantity','minimum_quantity'] else array['book_quantity','counted_quantity'] end) loop
      if jsonb_typeof(NEW.data->field) is distinct from 'number' then raise exception 'Quantity must be a number'; end if;
      value := (NEW.data->>field)::numeric;
      if value<>trunc(value) or value<0 or value>(case when field='amount' then 1000000000000 else 1000000000 end) or (field='amount' and value=0) then raise exception 'Invalid amount or quantity'; end if;
    end loop;
  end if;
  if NEW.entity='cash-entries' and coalesce(NEW.data->>'direction','') not in ('masuk','keluar') then raise exception 'Invalid cash direction'; end if;
  if NEW.entity='members' and length(trim(coalesce(NEW.data->>'member_number','')))=0 then raise exception 'Missing member number'; end if;
  if NEW.entity='inventory-items' and length(trim(coalesce(NEW.data->>'sku','')))=0 then raise exception 'Missing SKU'; end if;
  if NEW.entity='stock-counts' and coalesce(NEW.data->>'item_id','')='' then raise exception 'Missing item'; end if;
  return NEW;
end $$;
create trigger hub_operations_validation before insert or update on public.hub_records for each row execute function public.hub_validate_operations();
create function public.hub_operations_ready() returns boolean language sql stable set search_path='' as $$ select true $$;
revoke all on function public.hub_validate_operations(),public.hub_operations_ready() from public,anon,authenticated;
grant execute on function public.hub_operations_ready() to service_role;


-- Sumber: 20261001000003_cooperative_redesign.sql
-- Migrasi 3: Redesain Menyeluruh Ruang Kerja Koperasi (KDMP Puntukrejo)
-- Menambah entitas 'sprints' (Target Periode Kerja), indeks kode tugas cepat, dan relasi sprint.
-- Menjaga kompatibilitas penuh dengan 20 entitas sebelumnya; tidak ada penghapusan data.

-- Perbarui batas entitas hub_records dengan menambahkan 'sprints'
alter table public.hub_records drop constraint hub_records_entity_check;
alter table public.hub_records add constraint hub_records_entity_check check(
  entity in (
    'organization','workstreams','milestones','work-items','units','checklist',
    'stakeholders','interactions','meetings','decisions','documents','risks','issues',
    'staff','trainings','journal','members','cash-entries','inventory-items','stock-counts',
    'sprints'
  )
);

-- Indeks pencarian kode tugas (contoh: #KD-44001 atau KD-44001)
create index if not exists hub_work_items_code on public.hub_records(((data->>'code'))) where entity = 'work-items';

-- Perbarui pemeriksaan relasi untuk mencakup sprint_id
create or replace function public.hub_check_relations() returns trigger language plpgsql security definer set search_path = '' as $$
declare current_row public.hub_records; field text; target text; reference_id text; dependency text; has_cycle boolean;
begin
  if TG_OP = 'DELETE' then
    if not exists(select 1 from public.hub_records where id=OLD.id) and exists(
      select 1 from public.hub_records r where
      exists(select 1 from jsonb_each_text(r.data) pair where pair.key like '%\_id' escape '\' and pair.value=OLD.id::text)
      or coalesce(r.data->'dependencies','[]'::jsonb) ? OLD.id::text
    ) then raise exception 'Record is still referenced'; end if;
    return null;
  end if;
  select * into current_row from public.hub_records where id=NEW.id;
  if not found then return null; end if;
  for field,target in select * from (values
    ('item_id','inventory-items'),('workstream_id','workstreams'),('milestone_id','milestones'),('unit_id','units'),
    ('stakeholder_id','stakeholders'),('meeting_id','meetings'),('issue_id','issues'),('staff_id','staff'),
    ('work_item_id','work-items'),('sprint_id','sprints')
  ) as refs(field,target) loop
    reference_id:=current_row.data->>field;
    if coalesce(reference_id,'')<>'' and not exists(select 1 from public.hub_records where id::text=reference_id and entity=target) then
      raise exception 'Missing related record';
    end if;
  end loop;
  if current_row.entity='work-items' then
    for dependency in select jsonb_array_elements_text(coalesce(current_row.data->'dependencies','[]'::jsonb)) loop
      if not exists(select 1 from public.hub_records where id::text=dependency and entity='work-items') then raise exception 'Missing dependency'; end if;
    end loop;
    with recursive walk(id,path,cycle) as (
      select current_row.id::text,array[current_row.id::text],false
      union all
      select edge.value,w.path || edge.value,edge.value=any(w.path)
      from walk w join public.hub_records r on r.id::text=w.id,
      lateral jsonb_array_elements_text(coalesce(r.data->'dependencies','[]'::jsonb)) edge(value)
      where not w.cycle
    ) select exists(select 1 from walk where cycle) into has_cycle;
    if has_cycle then raise exception 'Circular dependency'; end if;
  end if;
  return null;
end $$;


-- Sumber: 20261001000004_interconnected_operations.sql
-- Migrasi 4: Keterhubungan Pencatatan Operasional Koperasi (KDMP Puntukrejo)
-- Menghubungkan Buku Kas dengan Anggota (member_id) dan Barang Dagangan (item_id).
-- Menambahkan indeks pencarian cepat untuk transaksi per anggota dan per barang.
-- Menjaga kompatibilitas penuh dengan 20 entitas sebelumnya; tidak ada penghapusan data.

-- Perbarui pemeriksaan relasi (foreign key check) untuk mencakup member_id
create or replace function public.hub_check_relations() returns trigger language plpgsql security definer set search_path = '' as $$
declare current_row public.hub_records; field text; target text; reference_id text; dependency text; has_cycle boolean;
begin
  if TG_OP = 'DELETE' then
    if not exists(select 1 from public.hub_records where id=OLD.id) and exists(
      select 1 from public.hub_records r where
      exists(select 1 from jsonb_each_text(r.data) pair where pair.key like '%\_id' escape '\' and pair.value=OLD.id::text)
      or coalesce(r.data->'dependencies','[]'::jsonb) ? OLD.id::text
    ) then raise exception 'Record is still referenced'; end if;
    return null;
  end if;
  select * into current_row from public.hub_records where id=NEW.id;
  if not found then return null; end if;
  for field,target in select * from (values
    ('item_id','inventory-items'),('workstream_id','workstreams'),('milestone_id','milestones'),('unit_id','units'),
    ('stakeholder_id','stakeholders'),('meeting_id','meetings'),('issue_id','issues'),('staff_id','staff'),
    ('work_item_id','work-items'),('sprint_id','sprints'),('member_id','members')
  ) as refs(field,target) loop
    reference_id:=current_row.data->>field;
    if coalesce(reference_id,'')<>'' and not exists(select 1 from public.hub_records where id::text=reference_id and entity=target) then
      raise exception 'Missing related record';
    end if;
  end loop;
  if current_row.entity='work-items' then
    for dependency in select jsonb_array_elements_text(coalesce(current_row.data->'dependencies','[]'::jsonb)) loop
      if not exists(select 1 from public.hub_records where id::text=dependency and entity='work-items') then raise exception 'Missing dependency'; end if;
    end loop;
    with recursive walk(id,path,cycle) as (
      select current_row.id::text,array[current_row.id::text],false
      union all
      select edge.value,w.path || edge.value,edge.value=any(w.path)
      from walk w join public.hub_records r on r.id::text=w.id,
      lateral jsonb_array_elements_text(coalesce(r.data->'dependencies','[]'::jsonb)) edge(value)
      where not w.cycle
    ) select exists(select 1 from walk where cycle) into has_cycle;
    if has_cycle then raise exception 'Circular dependency'; end if;
  end if;
  return null;
end $$;

-- Indeks pencarian cepat transaksi kas per anggota
create index if not exists hub_cash_member on public.hub_records(((data->>'member_id'))) where entity = 'cash-entries';

-- Indeks pencarian cepat transaksi kas per barang
create index if not exists hub_cash_item on public.hub_records(((data->>'item_id'))) where entity = 'cash-entries';


-- Sumber: 20261001000005_manager_superapp.sql
-- Migrasi 5: Fitur Superapp Manajer & Manajemen Draf Laporan (KDMP Puntukrejo)
-- 1. Menambahkan kolom status ('draft' | 'final') pada tabel manager_reports.
-- 2. Menjamin dukungan penuh untuk penghapusan (DELETE) dan pembaruan (UPDATE) draf laporan.
-- 3. Menambahkan indeks pencarian cepat laporan berdasarkan status dan periode tanggal.
-- 4. Idempoten dan aman dijalankan; tidak ada data laporan lama yang hilang.

-- Tambah kolom status pada tabel manager_reports jika belum ada
alter table public.manager_reports
  add column if not exists status text not null default 'final';

-- Perbarui status dari snapshot jika sebelumnya sudah tersimpan di jsonb
update public.manager_reports
  set status = coalesce(snapshot->>'status', 'final')
  where status is null or status = 'final' and snapshot ? 'status';

-- Buat indeks pencarian cepat untuk penyaringan draf vs laporan resmi
create index if not exists manager_reports_status_created_idx
  on public.manager_reports (status, created_at desc);

create index if not exists manager_reports_period_idx
  on public.manager_reports (period_start, period_end);

-- Pastikan izin akses penuh diberikan kepada role service_role
grant all on public.manager_reports to service_role;


-- Sumber: 20261002000006_paged_records.sql
-- Indeks untuk daftar bertahap. Tidak mengubah atau menghapus catatan.
-- Target: proyek Kopdes saat ini, <project-ref>.

create index if not exists hub_records_page_created_idx
  on public.hub_records (entity, created_at desc, id desc);
create index if not exists hub_task_page_due_idx
  on public.hub_records ((data->>'due_date'), id desc)
  where entity = 'work-items';
create index if not exists hub_task_status_completed_idx
  on public.hub_records ((data->>'status'), (data->>'completed_at'))
  where entity = 'work-items';
create index if not exists hub_project_records_idx
  on public.hub_records (entity, (data->>'workstream_id'), created_at desc)
  where entity in ('work-items', 'milestones', 'checklist');


-- Sumber: 20261002000007_document_relation_check.sql
-- Migrasi 7: Validasi Relasi Dokumen pada Tugas (KDMP Puntukrejo)
-- Memastikan document_id pada catatan merujuk ke entitas documents yang valid.
-- Menambahkan indeks pencarian tugas berdasarkan dokumen terkait.

create or replace function public.hub_check_relations() returns trigger language plpgsql security definer set search_path = '' as $$
declare current_row public.hub_records; field text; target text; reference_id text; dependency text; has_cycle boolean;
begin
  if TG_OP = 'DELETE' then
    if not exists(select 1 from public.hub_records where id=OLD.id) and exists(
      select 1 from public.hub_records r where
      exists(select 1 from jsonb_each_text(r.data) pair where pair.key like '%\_id' escape '\' and pair.value=OLD.id::text)
      or coalesce(r.data->'dependencies','[]'::jsonb) ? OLD.id::text
    ) then raise exception 'Record is still referenced'; end if;
    return null;
  end if;
  select * into current_row from public.hub_records where id=NEW.id;
  if not found then return null; end if;
  for field,target in select * from (values
    ('item_id','inventory-items'),('workstream_id','workstreams'),('milestone_id','milestones'),('unit_id','units'),
    ('stakeholder_id','stakeholders'),('meeting_id','meetings'),('issue_id','issues'),('staff_id','staff'),
    ('work_item_id','work-items'),('sprint_id','sprints'),('member_id','members'),('document_id','documents')
  ) as refs(field,target) loop
    reference_id:=current_row.data->>field;
    if coalesce(reference_id,'')<>'' and not exists(select 1 from public.hub_records where id::text=reference_id and entity=target) then
      raise exception 'Missing related record';
    end if;
  end loop;
  if current_row.entity='work-items' then
    for dependency in select jsonb_array_elements_text(coalesce(current_row.data->'dependencies','[]'::jsonb)) loop
      if not exists(select 1 from public.hub_records where id::text=dependency and entity='work-items') then raise exception 'Missing dependency'; end if;
    end loop;
    with recursive walk(id,path,cycle) as (
      select current_row.id::text,array[current_row.id::text],false
      union all
      select edge.value,w.path || edge.value,edge.value=any(w.path)
      from walk w join public.hub_records r on r.id::text=w.id,
      lateral jsonb_array_elements_text(coalesce(r.data->'dependencies','[]'::jsonb)) edge(value)
      where not w.cycle
    ) select exists(select 1 from walk where cycle) into has_cycle;
    if has_cycle then raise exception 'Circular dependency'; end if;
  end if;
  return null;
end $$;

create index if not exists hub_task_document_idx
  on public.hub_records (((data->>'document_id')))
  where entity = 'work-items';


-- Sumber: 20261006000008_world_logistics.sql
-- Migrasi 8: Pengiriman dan mutasi stok (Dunia Koperasi v2, paket 5)
-- Jalankan di cloud hanya setelah disetujui pemilik pada proyek <project-ref>.
-- Menambah dua jenis catatan pada hub_records: 'deliveries' (pengiriman barang masuk/keluar)
-- dan 'stock-movements' (jejak perubahan stok buku). Tidak menghapus tabel, data, atau izin RLS.
-- Stok buku barang hanya berubah lewat hub_post_stock_movement yang mencatat mutasinya
-- dalam satu transaksi; mutasi yang sudah tercatat tidak dapat diubah.

alter table public.hub_records drop constraint hub_records_entity_check;
alter table public.hub_records add constraint hub_records_entity_check check(
  entity in (
    'organization','workstreams','milestones','work-items','units','checklist',
    'stakeholders','interactions','meetings','decisions','documents','risks','issues',
    'staff','trainings','journal','members','cash-entries','inventory-items','stock-counts',
    'sprints','deliveries','stock-movements'
  )
);

-- Pemeriksaan relasi: tambah delivery_id dan stock_count_id.
create or replace function public.hub_check_relations() returns trigger language plpgsql security definer set search_path = '' as $$
declare current_row public.hub_records; field text; target text; reference_id text; dependency text; has_cycle boolean;
begin
  if TG_OP = 'DELETE' then
    if not exists(select 1 from public.hub_records where id=OLD.id) and exists(
      select 1 from public.hub_records r where
      exists(select 1 from jsonb_each_text(r.data) pair where pair.key like '%\_id' escape '\' and pair.value=OLD.id::text)
      or coalesce(r.data->'dependencies','[]'::jsonb) ? OLD.id::text
    ) then raise exception 'Record is still referenced'; end if;
    return null;
  end if;
  select * into current_row from public.hub_records where id=NEW.id;
  if not found then return null; end if;
  for field,target in select * from (values
    ('item_id','inventory-items'),('workstream_id','workstreams'),('milestone_id','milestones'),('unit_id','units'),
    ('stakeholder_id','stakeholders'),('meeting_id','meetings'),('issue_id','issues'),('staff_id','staff'),
    ('work_item_id','work-items'),('sprint_id','sprints'),('member_id','members'),('document_id','documents'),
    ('delivery_id','deliveries'),('stock_count_id','stock-counts')
  ) as refs(field,target) loop
    reference_id:=current_row.data->>field;
    if coalesce(reference_id,'')<>'' and not exists(select 1 from public.hub_records where id::text=reference_id and entity=target) then
      raise exception 'Missing related record';
    end if;
  end loop;
  if current_row.entity='work-items' then
    for dependency in select jsonb_array_elements_text(coalesce(current_row.data->'dependencies','[]'::jsonb)) loop
      if not exists(select 1 from public.hub_records where id::text=dependency and entity='work-items') then raise exception 'Missing dependency'; end if;
    end loop;
    with recursive walk(id,path,cycle) as (
      select current_row.id::text,array[current_row.id::text],false
      union all
      select edge.value,w.path || edge.value,edge.value=any(w.path)
      from walk w join public.hub_records r on r.id::text=w.id,
      lateral jsonb_array_elements_text(coalesce(r.data->'dependencies','[]'::jsonb)) edge(value)
      where not w.cycle
    ) select exists(select 1 from walk where cycle) into has_cycle;
    if has_cycle then raise exception 'Circular dependency'; end if;
  end if;
  return null;
end $$;

-- Validasi isi pengiriman dan mutasi; mutasi tidak boleh diubah setelah tercatat.
create function public.hub_validate_logistics() returns trigger language plpgsql set search_path='' as $$
declare amount numeric;
begin
  if TG_OP = 'UPDATE' and OLD.entity = 'stock-movements' then
    raise exception 'Stock movements are immutable';
  end if;
  if NEW.entity = 'stock-movements' then
    if coalesce(NEW.data->>'item_id','') = '' then raise exception 'Missing item'; end if;
    if coalesce(NEW.data->>'kind','') not in ('masuk','keluar','koreksi tambah','koreksi kurang') then
      raise exception 'Invalid movement kind';
    end if;
    if jsonb_typeof(NEW.data->'quantity') is distinct from 'number' then raise exception 'Quantity must be a number'; end if;
    amount := (NEW.data->>'quantity')::numeric;
    if amount <> trunc(amount) or amount <= 0 or amount > 1000000000 then raise exception 'Invalid amount or quantity'; end if;
  end if;
  if NEW.entity = 'deliveries' then
    if coalesce(NEW.data->>'direction','') not in ('masuk','keluar') then raise exception 'Invalid delivery direction'; end if;
    if coalesce(NEW.data->>'status','') not in ('dipesan','dikirim','tiba','diperiksa','selesai','dibatalkan') then
      raise exception 'Invalid delivery status';
    end if;
  end if;
  return NEW;
end $$;
create trigger hub_logistics_validation before insert or update on public.hub_records
  for each row execute function public.hub_validate_logistics();

-- Mencatat mutasi dan mengubah stok buku barang secara atomik. Baris barang dikunci agar
-- dua mutasi bersamaan tidak saling menimpa. Stok hasil tidak boleh negatif.
create function public.hub_post_stock_movement(p_data jsonb) returns uuid language plpgsql set search_path='' as $$
declare item public.hub_records; amount numeric; delta numeric; book_before numeric; book_after numeric; movement_id uuid;
begin
  if jsonb_typeof(p_data->'quantity') is distinct from 'number' then raise exception 'Quantity must be a number'; end if;
  amount := (p_data->>'quantity')::numeric;
  if amount <> trunc(amount) or amount <= 0 or amount > 1000000000 then raise exception 'Invalid amount or quantity'; end if;
  delta := case p_data->>'kind'
    when 'masuk' then amount when 'koreksi tambah' then amount
    when 'keluar' then -amount when 'koreksi kurang' then -amount
    else null end;
  if delta is null then raise exception 'Invalid movement kind'; end if;
  select * into item from public.hub_records
    where entity = 'inventory-items' and id::text = p_data->>'item_id' for update;
  if not found then raise exception 'Missing related record'; end if;
  book_before := (item.data->>'book_quantity')::numeric;
  book_after := book_before + delta;
  if book_after < 0 then raise exception 'Stock would be negative'; end if;
  if book_after > 1000000000 then raise exception 'Invalid amount or quantity'; end if;
  update public.hub_records
    set data = jsonb_set(data, '{book_quantity}', to_jsonb(book_after::bigint)), updated_at = now()
    where id = item.id;
  insert into public.hub_records(entity, data)
    values ('stock-movements', p_data || jsonb_build_object('book_before', book_before::bigint, 'book_after', book_after::bigint))
    returning id into movement_id;
  return movement_id;
end $$;

create index if not exists hub_movement_item_idx
  on public.hub_records (((data->>'item_id'))) where entity = 'stock-movements';
create index if not exists hub_delivery_status_idx
  on public.hub_records (((data->>'status'))) where entity = 'deliveries';

create function public.hub_logistics_ready() returns boolean language sql stable set search_path='' as $$ select true $$;
revoke all on function public.hub_validate_logistics(), public.hub_post_stock_movement(jsonb), public.hub_logistics_ready()
  from public, anon, authenticated;
grant execute on function public.hub_post_stock_movement(jsonb), public.hub_logistics_ready() to service_role;


-- Sumber: 20261013000009_report_backup.sql
-- Migrasi 9: pertahankan status laporan saat menyimpan dan memulihkan cadangan.

-- Status snapshot dipakai UI; kolom status lama dapat tertinggal sebagai final.
update public.manager_reports
  set status = snapshot->>'status'
  where snapshot->>'status' in ('draft', 'final')
    and status is distinct from snapshot->>'status';

create or replace function public.restore_manager_data(records jsonb, reports jsonb)
returns void language plpgsql security definer set search_path = '' as $$
begin
  delete from public.hub_records;
  insert into public.hub_records(id,entity,data,recurrence_key,created_at,updated_at)
    select (item->>'id')::uuid,item->>'entity',item->'data',item->>'recurrence_key',
      (item->>'created_at')::timestamptz,(item->>'updated_at')::timestamptz
    from jsonb_array_elements(records) item;
  delete from public.manager_reports;
  insert into public.manager_reports(id,title,period_start,period_end,snapshot,created_at,status)
    select (item->>'id')::uuid,item->>'title',(item->>'period_start')::date,
      (item->>'period_end')::date,
      jsonb_set(item->'snapshot','{status}',to_jsonb(coalesce(item->'snapshot'->>'status',item->>'status','final'))),
      (item->>'created_at')::timestamptz,
      coalesce(item->'snapshot'->>'status',item->>'status','final')
    from jsonb_array_elements(reports) item;
  insert into public.template_runs(key) values('plan-90-v1') on conflict do nothing;
end $$;

revoke all on function public.restore_manager_data(jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.restore_manager_data(jsonb,jsonb) to service_role;


-- Sumber: 20261015000010_administrasi_usaha.sql
-- Migrasi 10: Administrasi usaha (aset, jadwal & absensi, pembelian, penjualan harian, simpanan)
-- Jalankan di cloud hanya setelah disetujui pemilik pada proyek <project-ref>.
-- Menambah lima jenis catatan pada hub_records: 'assets', 'attendance', 'purchase-orders',
-- 'sales', dan 'savings'. Pengiriman boleh menaut pembelian lewat purchase_id.
-- Tidak menghapus tabel, data, atau izin RLS. Butuh migrasi 2 (anggota) dan 8 (pengiriman).

alter table public.hub_records drop constraint hub_records_entity_check;
alter table public.hub_records add constraint hub_records_entity_check check(
  entity in (
    'organization','workstreams','milestones','work-items','units','checklist',
    'stakeholders','interactions','meetings','decisions','documents','risks','issues',
    'staff','trainings','journal','members','cash-entries','inventory-items','stock-counts',
    'sprints','deliveries','stock-movements',
    'assets','attendance','purchase-orders','sales','savings'
  )
);

-- Pemeriksaan relasi: tambah purchase_id (pengiriman dari pembelian).
create or replace function public.hub_check_relations() returns trigger language plpgsql security definer set search_path = '' as $$
declare current_row public.hub_records; field text; target text; reference_id text; dependency text; has_cycle boolean;
begin
  if TG_OP = 'DELETE' then
    if not exists(select 1 from public.hub_records where id=OLD.id) and exists(
      select 1 from public.hub_records r where
      exists(select 1 from jsonb_each_text(r.data) pair where pair.key like '%\_id' escape '\' and pair.value=OLD.id::text)
      or coalesce(r.data->'dependencies','[]'::jsonb) ? OLD.id::text
    ) then raise exception 'Record is still referenced'; end if;
    return null;
  end if;
  select * into current_row from public.hub_records where id=NEW.id;
  if not found then return null; end if;
  for field,target in select * from (values
    ('item_id','inventory-items'),('workstream_id','workstreams'),('milestone_id','milestones'),('unit_id','units'),
    ('stakeholder_id','stakeholders'),('meeting_id','meetings'),('issue_id','issues'),('staff_id','staff'),
    ('work_item_id','work-items'),('sprint_id','sprints'),('member_id','members'),('document_id','documents'),
    ('delivery_id','deliveries'),('stock_count_id','stock-counts'),('purchase_id','purchase-orders')
  ) as refs(field,target) loop
    reference_id:=current_row.data->>field;
    if coalesce(reference_id,'')<>'' and not exists(select 1 from public.hub_records where id::text=reference_id and entity=target) then
      raise exception 'Missing related record';
    end if;
  end loop;
  if current_row.entity='work-items' then
    for dependency in select jsonb_array_elements_text(coalesce(current_row.data->'dependencies','[]'::jsonb)) loop
      if not exists(select 1 from public.hub_records where id::text=dependency and entity='work-items') then raise exception 'Missing dependency'; end if;
    end loop;
    with recursive walk(id,path,cycle) as (
      select current_row.id::text,array[current_row.id::text],false
      union all
      select edge.value,w.path || edge.value,edge.value=any(w.path)
      from walk w join public.hub_records r on r.id::text=w.id,
      lateral jsonb_array_elements_text(coalesce(r.data->'dependencies','[]'::jsonb)) edge(value)
      where not w.cycle
    ) select exists(select 1 from walk where cycle) into has_cycle;
    if has_cycle then raise exception 'Circular dependency'; end if;
  end if;
  return null;
end $$;

-- Validasi isi; angka harus bilangan bulat dalam batas. Simpanan anggota tidak boleh minus
-- per anggota dan jenis simpanan (penarikan melebihi setoran ditolak).
create function public.hub_validate_administration() returns trigger language plpgsql set search_path='' as $$
declare field text; amount numeric; balance numeric;
begin
  if NEW.entity not in ('assets','attendance','purchase-orders','sales','savings') then return NEW; end if;
  for field in select unnest(case NEW.entity
    when 'assets' then array['value'] when 'purchase-orders' then array['total']
    when 'sales' then array['amount','transactions'] when 'savings' then array['amount']
    else array[]::text[] end) loop
    if jsonb_typeof(NEW.data->field) is distinct from 'number' then raise exception 'Quantity must be a number'; end if;
    amount := (NEW.data->>field)::numeric;
    if amount<>trunc(amount) or amount<0 or amount>1000000000000 or (NEW.entity='savings' and amount=0) then
      raise exception 'Invalid amount or quantity';
    end if;
  end loop;
  if NEW.entity='assets' and coalesce(NEW.data->>'condition','') not in ('baik','perlu perbaikan','rusak','dihapuskan') then
    raise exception 'Invalid asset condition';
  end if;
  if NEW.entity='attendance' then
    if coalesce(NEW.data->>'staff_id','')='' or coalesce(NEW.data->>'date','')='' then raise exception 'Missing staff or date'; end if;
    if coalesce(NEW.data->>'status','') not in ('terjadwal','hadir','terlambat','izin','sakit','cuti','alpa','libur') then
      raise exception 'Invalid attendance status';
    end if;
  end if;
  if NEW.entity='purchase-orders' and coalesce(NEW.data->>'status','') not in ('draf','dipesan','diterima','dibatalkan') then
    raise exception 'Invalid purchase status';
  end if;
  if NEW.entity='sales' and (coalesce(NEW.data->>'unit_id','')='' or coalesce(NEW.data->>'date','')='') then
    raise exception 'Missing unit or date';
  end if;
  if NEW.entity='savings' then
    if coalesce(NEW.data->>'member_id','')='' then raise exception 'Missing member'; end if;
    if coalesce(NEW.data->>'kind','') not in ('pokok','wajib','sukarela') then raise exception 'Invalid savings kind'; end if;
    if coalesce(NEW.data->>'direction','') not in ('setor','tarik') then raise exception 'Invalid savings direction'; end if;
    -- Kunci baris anggota agar dua penarikan bersamaan tidak sama-sama lolos.
    perform 1 from public.hub_records where id::text=NEW.data->>'member_id' for update;
    select coalesce(sum(case when data->>'direction'='setor' then (data->>'amount')::numeric else -(data->>'amount')::numeric end),0)
      into balance from public.hub_records
      where entity='savings' and id<>NEW.id and data->>'member_id'=NEW.data->>'member_id' and data->>'kind'=NEW.data->>'kind';
    balance := balance + case when NEW.data->>'direction'='setor' then amount else -amount end;
    if balance < 0 then raise exception 'Savings balance would be negative'; end if;
  end if;
  return NEW;
end $$;
create trigger hub_administration_validation before insert or update on public.hub_records
  for each row execute function public.hub_validate_administration();

-- Satu catatan absensi per petugas per hari dan satu rekap penjualan per gerai per hari.
create unique index if not exists hub_attendance_staff_date_key
  on public.hub_records (((data->>'staff_id')), ((data->>'date'))) where entity = 'attendance';
create unique index if not exists hub_sales_unit_date_key
  on public.hub_records (((data->>'unit_id')), ((data->>'date'))) where entity = 'sales';
create index if not exists hub_savings_member_idx
  on public.hub_records (((data->>'member_id'))) where entity = 'savings';
create index if not exists hub_delivery_purchase_idx
  on public.hub_records (((data->>'purchase_id'))) where entity = 'deliveries';

create function public.hub_administration_ready() returns boolean language sql stable set search_path='' as $$ select true $$;
revoke all on function public.hub_validate_administration(), public.hub_administration_ready()
  from public, anon, authenticated;
grant execute on function public.hub_administration_ready() to service_role;

-- Indeks pemisahan tegas Tugas (work-items) vs Kegiatan Lapangan (journal)
create index if not exists hub_task_entity_due_idx on public.hub_records ((data->>'due_date')) where entity = 'work-items';
create index if not exists hub_task_entity_status_idx on public.hub_records ((data->>'status')) where entity = 'work-items';
create index if not exists hub_journal_entity_date_idx on public.hub_records ((data->>'date')) where entity = 'journal';
create index if not exists hub_journal_entity_task_idx on public.hub_records ((data->>'work_item_id')) where entity = 'journal';

commit;
