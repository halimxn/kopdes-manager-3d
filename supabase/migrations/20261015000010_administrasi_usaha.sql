-- Migrasi 10: Administrasi usaha (aset, jadwal & absensi, pembelian, penjualan harian, simpanan)
-- Jalankan di cloud hanya setelah disetujui pemilik pada proyek <project-ref>.
-- Menambah lima jenis catatan pada hub_records: 'assets', 'attendance', 'purchase-orders',
-- 'sales', dan 'savings'. Pengiriman boleh menaut pembelian lewat purchase_id.
-- Tidak menghapus tabel, data, atau izin RLS. Butuh migrasi 2 (anggota) dan 8 (pengiriman).
begin;

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

commit;
