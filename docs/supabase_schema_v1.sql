-- Hello Ride Platform
-- Supabase / Postgres schema v1
-- Mirrors the BigQuery rawdata design and adds mart tables for the Ops UI.

begin;

create schema if not exists rawdata;
create schema if not exists mart;

create table if not exists rawdata.driver_dispatch_events (
    id bigserial primary key,
    airport_code text,
    created_at_local timestamp,
    updated_at_local timestamp,
    driver_id text,
    signal_id integer,
    flight_instance_id text,
    lane integer,
    status text
);

create table if not exists rawdata.flight_instances (
    flight_instance_id text primary key,
    airport_code text,
    flight_no text,
    origin text,
    terminal text,
    gate text,
    sched_arrival_local timestamp,
    est_arrival_local timestamp,
    actual_arrival_local timestamp,
    status text,
    first_seen_at_local timestamp,
    last_seen_at_local timestamp
);

create table if not exists rawdata.flights_raw (
    id bigserial primary key,
    airport_code text,
    captured_at_local timestamp,
    flight_no text,
    origin text,
    sched_arrival_local timestamp,
    est_arrival_local timestamp,
    actual_arrival_local timestamp,
    status text,
    terminal text,
    gate text
);

create table if not exists rawdata.passenger_demand_signals (
    id bigserial primary key,
    airport_code text,
    created_at_local timestamp,
    flight_instance_id text,
    vehicle_type text,
    pax_count integer,
    luggage_count integer,
    status text,
    assigned_lane integer,
    assigned_driver_id text
);

create table if not exists rawdata.taxi_supply_snapshots (
    id bigserial primary key,
    airport_code text,
    captured_at_local timestamp,
    taxis_in_holding integer,
    taxis_at_curb integer,
    active_lanes_json text,
    lane_capacity_per_15m integer
);

create table if not exists rawdata.weather_raw (
    id bigserial primary key,
    airport_code text,
    time_local timestamp,
    rain_mm double precision,
    wind_kmh double precision,
    temp_c double precision
);

create table if not exists mart.ops_kpi_snapshots (
    id bigserial primary key,
    airport_code text,
    captured_at_local timestamp,
    pwt_min numeric,
    waiting_pax integer,
    available_taxis integer,
    active_lanes integer,
    notes text
);

create table if not exists mart.demand_supply_forecasts (
    id bigserial primary key,
    airport_code text,
    generated_at_local timestamp,
    horizon_min integer,
    ts_local timestamp,
    demand_pax integer,
    supply_taxis integer
);

create table if not exists mart.genai_advisory_outputs (
    id bigserial primary key,
    airport_code text,
    created_at_local timestamp,
    deficit_window_start_local timestamp,
    deficit_window_end_local timestamp,
    advisory_text text,
    linked_action text
);

create index if not exists idx_flight_instances_airport_est_arrival
    on rawdata.flight_instances (airport_code, est_arrival_local);

create index if not exists idx_passenger_demand_signals_airport_created
    on rawdata.passenger_demand_signals (airport_code, created_at_local);

create index if not exists idx_taxi_supply_snapshots_airport_captured
    on rawdata.taxi_supply_snapshots (airport_code, captured_at_local);

create index if not exists idx_driver_dispatch_events_airport_created
    on rawdata.driver_dispatch_events (airport_code, created_at_local);

create index if not exists idx_weather_raw_airport_time
    on rawdata.weather_raw (airport_code, time_local);

create index if not exists idx_mart_ops_kpi_snapshots_airport_captured
    on mart.ops_kpi_snapshots (airport_code, captured_at_local);

create index if not exists idx_mart_demand_supply_forecasts_airport_ts
    on mart.demand_supply_forecasts (airport_code, ts_local);

create index if not exists idx_mart_genai_advisory_outputs_airport_created
    on mart.genai_advisory_outputs (airport_code, created_at_local);

with base as (
    select timezone('Asia/Bangkok', now())::timestamp as ts
)
insert into rawdata.flight_instances (
    flight_instance_id,
    airport_code,
    flight_no,
    origin,
    terminal,
    gate,
    sched_arrival_local,
    est_arrival_local,
    actual_arrival_local,
    status,
    first_seen_at_local,
    last_seen_at_local
)
select
    seed.flight_instance_id,
    seed.airport_code,
    seed.flight_no,
    seed.origin,
    seed.terminal,
    seed.gate,
    seed.sched_arrival_local,
    seed.est_arrival_local,
    seed.actual_arrival_local,
    seed.status,
    seed.first_seen_at_local,
    seed.last_seen_at_local
from (
    select
        'BKK_TG401_DEMO'::text as flight_instance_id,
        'BKK'::text as airport_code,
        'TG401'::text as flight_no,
        'Tokyo'::text as origin,
        'T1'::text as terminal,
        'A7'::text as gate,
        (select ts from base) + interval '15 minutes' as sched_arrival_local,
        (select ts from base) + interval '18 minutes' as est_arrival_local,
        null::timestamp as actual_arrival_local,
        'bags_on_belt'::text as status,
        (select ts from base) - interval '70 minutes' as first_seen_at_local,
        (select ts from base) - interval '3 minutes' as last_seen_at_local
    union all
    select
        'BKK_EK374_DEMO',
        'BKK',
        'EK374',
        'Dubai',
        'T1',
        'C3',
        (select ts from base) + interval '30 minutes',
        (select ts from base) + interval '34 minutes',
        null::timestamp,
        'taxiing',
        (select ts from base) - interval '95 minutes',
        (select ts from base) - interval '2 minutes'
    union all
    select
        'BKK_MH782_DEMO',
        'BKK',
        'MH782',
        'Kuala Lumpur',
        'T2',
        'E2',
        (select ts from base) + interval '39 minutes',
        (select ts from base) + interval '41 minutes',
        null::timestamp,
        'landed',
        (select ts from base) - interval '75 minutes',
        (select ts from base) - interval '1 minutes'
    union all
    select
        'BKK_QR833_DEMO',
        'BKK',
        'QR833',
        'Doha',
        'T1',
        'D5',
        (select ts from base) + interval '49 minutes',
        (select ts from base) + interval '52 minutes',
        null::timestamp,
        'on_final',
        (select ts from base) - interval '100 minutes',
        (select ts from base) - interval '1 minutes'
    union all
    select
        'BKK_CX751_DEMO',
        'BKK',
        'CX751',
        'Hong Kong',
        'T2',
        'F1',
        (select ts from base) + interval '55 minutes',
        (select ts from base) + interval '58 minutes',
        null::timestamp,
        'scheduled',
        (select ts from base) - interval '85 minutes',
        (select ts from base) - interval '4 minutes'
) seed
on conflict (flight_instance_id) do update
set
    airport_code = excluded.airport_code,
    flight_no = excluded.flight_no,
    origin = excluded.origin,
    terminal = excluded.terminal,
    gate = excluded.gate,
    sched_arrival_local = excluded.sched_arrival_local,
    est_arrival_local = excluded.est_arrival_local,
    actual_arrival_local = excluded.actual_arrival_local,
    status = excluded.status,
    first_seen_at_local = excluded.first_seen_at_local,
    last_seen_at_local = excluded.last_seen_at_local;

with base as (
    select timezone('Asia/Bangkok', now())::timestamp as ts
)
insert into rawdata.flights_raw (
    id,
    airport_code,
    captured_at_local,
    flight_no,
    origin,
    sched_arrival_local,
    est_arrival_local,
    actual_arrival_local,
    status,
    terminal,
    gate
)
select
    seed.id,
    seed.airport_code,
    seed.captured_at_local,
    seed.flight_no,
    seed.origin,
    seed.sched_arrival_local,
    seed.est_arrival_local,
    seed.actual_arrival_local,
    seed.status,
    seed.terminal,
    seed.gate
from (
    select
        1001::bigint as id,
        'BKK'::text as airport_code,
        (select ts from base) - interval '5 minutes' as captured_at_local,
        'TG401'::text as flight_no,
        'Tokyo'::text as origin,
        (select ts from base) + interval '15 minutes' as sched_arrival_local,
        (select ts from base) + interval '18 minutes' as est_arrival_local,
        null::timestamp as actual_arrival_local,
        'bags_on_belt'::text as status,
        'T1'::text as terminal,
        'A7'::text as gate
    union all
    select
        1002,
        'BKK',
        (select ts from base) - interval '5 minutes',
        'EK374',
        'Dubai',
        (select ts from base) + interval '30 minutes',
        (select ts from base) + interval '34 minutes',
        null::timestamp,
        'taxiing',
        'T1',
        'C3'
    union all
    select
        1003,
        'BKK',
        (select ts from base) - interval '5 minutes',
        'MH782',
        'Kuala Lumpur',
        (select ts from base) + interval '39 minutes',
        (select ts from base) + interval '41 minutes',
        null::timestamp,
        'landed',
        'T2',
        'E2'
    union all
    select
        1004,
        'BKK',
        (select ts from base) - interval '5 minutes',
        'QR833',
        'Doha',
        (select ts from base) + interval '49 minutes',
        (select ts from base) + interval '52 minutes',
        null::timestamp,
        'on_final',
        'T1',
        'D5'
    union all
    select
        1005,
        'BKK',
        (select ts from base) - interval '5 minutes',
        'CX751',
        'Hong Kong',
        (select ts from base) + interval '55 minutes',
        (select ts from base) + interval '58 minutes',
        null::timestamp,
        'scheduled',
        'T2',
        'F1'
) seed
on conflict (id) do update
set
    airport_code = excluded.airport_code,
    captured_at_local = excluded.captured_at_local,
    flight_no = excluded.flight_no,
    origin = excluded.origin,
    sched_arrival_local = excluded.sched_arrival_local,
    est_arrival_local = excluded.est_arrival_local,
    actual_arrival_local = excluded.actual_arrival_local,
    status = excluded.status,
    terminal = excluded.terminal,
    gate = excluded.gate;

with base as (
    select timezone('Asia/Bangkok', now())::timestamp as ts
)
insert into rawdata.passenger_demand_signals (
    id,
    airport_code,
    created_at_local,
    flight_instance_id,
    vehicle_type,
    pax_count,
    luggage_count,
    status,
    assigned_lane,
    assigned_driver_id
)
select
    seed.id,
    seed.airport_code,
    seed.created_at_local,
    seed.flight_instance_id,
    seed.vehicle_type,
    seed.pax_count,
    seed.luggage_count,
    seed.status,
    seed.assigned_lane,
    seed.assigned_driver_id
from (
    select
        2001::bigint as id,
        'BKK'::text as airport_code,
        (select ts from base) - interval '18 minutes' as created_at_local,
        'BKK_TG401_DEMO'::text as flight_instance_id,
        'SUV'::text as vehicle_type,
        4 as pax_count,
        3 as luggage_count,
        'queued'::text as status,
        1 as assigned_lane,
        null::text as assigned_driver_id
    union all
    select
        2002,
        'BKK',
        (select ts from base) - interval '11 minutes',
        'BKK_EK374_DEMO',
        'Sedan',
        3,
        4,
        'dispatching',
        2,
        'DRV-108'
    union all
    select
        2003,
        'BKK',
        (select ts from base) - interval '4 minutes',
        'BKK_QR833_DEMO',
        'Van',
        5,
        6,
        'assigned',
        2,
        'DRV-109'
) seed
on conflict (id) do update
set
    airport_code = excluded.airport_code,
    created_at_local = excluded.created_at_local,
    flight_instance_id = excluded.flight_instance_id,
    vehicle_type = excluded.vehicle_type,
    pax_count = excluded.pax_count,
    luggage_count = excluded.luggage_count,
    status = excluded.status,
    assigned_lane = excluded.assigned_lane,
    assigned_driver_id = excluded.assigned_driver_id;

with base as (
    select timezone('Asia/Bangkok', now())::timestamp as ts
)
insert into rawdata.taxi_supply_snapshots (
    id,
    airport_code,
    captured_at_local,
    taxis_in_holding,
    taxis_at_curb,
    active_lanes_json,
    lane_capacity_per_15m
)
select
    3001,
    'BKK',
    (select ts from base),
    101,
    27,
    '[{"lane":1,"status":"active","terminal":"T1"},{"lane":2,"status":"active","terminal":"T1"},{"lane":3,"status":"standby","terminal":"T2"}]',
    44
on conflict (id) do update
set
    airport_code = excluded.airport_code,
    captured_at_local = excluded.captured_at_local,
    taxis_in_holding = excluded.taxis_in_holding,
    taxis_at_curb = excluded.taxis_at_curb,
    active_lanes_json = excluded.active_lanes_json,
    lane_capacity_per_15m = excluded.lane_capacity_per_15m;

with base as (
    select timezone('Asia/Bangkok', now())::timestamp as ts
)
insert into rawdata.weather_raw (
    id,
    airport_code,
    time_local,
    rain_mm,
    wind_kmh,
    temp_c
)
select
    4001,
    'BKK',
    (select ts from base),
    0.6,
    14.2,
    29.4
on conflict (id) do update
set
    airport_code = excluded.airport_code,
    time_local = excluded.time_local,
    rain_mm = excluded.rain_mm,
    wind_kmh = excluded.wind_kmh,
    temp_c = excluded.temp_c;

with base as (
    select timezone('Asia/Bangkok', now())::timestamp as ts
)
insert into rawdata.driver_dispatch_events (
    id,
    airport_code,
    created_at_local,
    updated_at_local,
    driver_id,
    signal_id,
    flight_instance_id,
    lane,
    status
)
select
    seed.id,
    seed.airport_code,
    seed.created_at_local,
    seed.updated_at_local,
    seed.driver_id,
    seed.signal_id,
    seed.flight_instance_id,
    seed.lane,
    seed.status
from (
    select
        5001::bigint as id,
        'BKK'::text as airport_code,
        (select ts from base) - interval '9 minutes' as created_at_local,
        (select ts from base) - interval '7 minutes' as updated_at_local,
        'DRV-108'::text as driver_id,
        2002::integer as signal_id,
        'BKK_EK374_DEMO'::text as flight_instance_id,
        2 as lane,
        'offer_sent'::text as status
    union all
    select
        5002,
        'BKK',
        (select ts from base) - interval '5 minutes',
        (select ts from base) - interval '2 minutes',
        'DRV-109',
        2003,
        'BKK_QR833_DEMO',
        2,
        'accepted'
) seed
on conflict (id) do update
set
    airport_code = excluded.airport_code,
    created_at_local = excluded.created_at_local,
    updated_at_local = excluded.updated_at_local,
    driver_id = excluded.driver_id,
    signal_id = excluded.signal_id,
    flight_instance_id = excluded.flight_instance_id,
    lane = excluded.lane,
    status = excluded.status;

with base as (
    select timezone('Asia/Bangkok', now())::timestamp as ts
)
insert into mart.ops_kpi_snapshots (
    id,
    airport_code,
    captured_at_local,
    pwt_min,
    waiting_pax,
    available_taxis,
    active_lanes,
    notes
)
select
    6001,
    'BKK',
    (select ts from base),
    18.5,
    342,
    128,
    2,
    'Arrival pressure is building across T1 and T2. EK374 and QR833 drive the largest deficit window over the next hour.'
on conflict (id) do update
set
    airport_code = excluded.airport_code,
    captured_at_local = excluded.captured_at_local,
    pwt_min = excluded.pwt_min,
    waiting_pax = excluded.waiting_pax,
    available_taxis = excluded.available_taxis,
    active_lanes = excluded.active_lanes,
    notes = excluded.notes;

with base as (
    select timezone('Asia/Bangkok', now())::timestamp as ts
)
insert into mart.demand_supply_forecasts (
    id,
    airport_code,
    generated_at_local,
    horizon_min,
    ts_local,
    demand_pax,
    supply_taxis
)
select
    seed.id,
    seed.airport_code,
    seed.generated_at_local,
    seed.horizon_min,
    seed.ts_local,
    seed.demand_pax,
    seed.supply_taxis
from (
    select
        7001::bigint as id,
        'BKK'::text as airport_code,
        (select ts from base) as generated_at_local,
        0 as horizon_min,
        (select ts from base) as ts_local,
        38 as demand_pax,
        54 as supply_taxis
    union all select 7002, 'BKK', (select ts from base), 15, (select ts from base) + interval '15 minutes', 52, 58
    union all select 7003, 'BKK', (select ts from base), 30, (select ts from base) + interval '30 minutes', 74, 56
    union all select 7004, 'BKK', (select ts from base), 45, (select ts from base) + interval '45 minutes', 110, 52
    union all select 7005, 'BKK', (select ts from base), 60, (select ts from base) + interval '60 minutes', 146, 50
    union all select 7006, 'BKK', (select ts from base), 75, (select ts from base) + interval '75 minutes', 122, 54
    union all select 7007, 'BKK', (select ts from base), 90, (select ts from base) + interval '90 minutes', 90, 58
    union all select 7008, 'BKK', (select ts from base), 105, (select ts from base) + interval '105 minutes', 60, 62
    union all select 7009, 'BKK', (select ts from base), 120, (select ts from base) + interval '120 minutes', 52, 61
    union all select 7010, 'BKK', (select ts from base), 135, (select ts from base) + interval '135 minutes', 48, 60
    union all select 7011, 'BKK', (select ts from base), 150, (select ts from base) + interval '150 minutes', 42, 58
    union all select 7012, 'BKK', (select ts from base), 165, (select ts from base) + interval '165 minutes', 36, 56
    union all select 7013, 'BKK', (select ts from base), 180, (select ts from base) + interval '180 minutes', 30, 54
) seed
on conflict (id) do update
set
    airport_code = excluded.airport_code,
    generated_at_local = excluded.generated_at_local,
    horizon_min = excluded.horizon_min,
    ts_local = excluded.ts_local,
    demand_pax = excluded.demand_pax,
    supply_taxis = excluded.supply_taxis;

with base as (
    select timezone('Asia/Bangkok', now())::timestamp as ts
)
insert into mart.genai_advisory_outputs (
    id,
    airport_code,
    created_at_local,
    deficit_window_start_local,
    deficit_window_end_local,
    advisory_text,
    linked_action
)
select
    8001,
    'BKK',
    (select ts from base),
    (select ts from base) + interval '45 minutes',
    (select ts from base) + interval '75 minutes',
    'Activate the Terminal 1 overflow lane and broadcast a 6-minute head start to inbound drivers. Demand is forecast to exceed supply during the EK374 and QR833 overlap window, which is likely to push PWT above the ops guardrail unless supply is staged early.',
    'overflow_lane_activation + nearby_driver_broadcast'
on conflict (id) do update
set
    airport_code = excluded.airport_code,
    created_at_local = excluded.created_at_local,
    deficit_window_start_local = excluded.deficit_window_start_local,
    deficit_window_end_local = excluded.deficit_window_end_local,
    advisory_text = excluded.advisory_text,
    linked_action = excluded.linked_action;

select setval(
    pg_get_serial_sequence('rawdata.driver_dispatch_events', 'id'),
    greatest(coalesce((select max(id) from rawdata.driver_dispatch_events), 1), 1),
    true
);
select setval(
    pg_get_serial_sequence('rawdata.flights_raw', 'id'),
    greatest(coalesce((select max(id) from rawdata.flights_raw), 1), 1),
    true
);
select setval(
    pg_get_serial_sequence('rawdata.passenger_demand_signals', 'id'),
    greatest(coalesce((select max(id) from rawdata.passenger_demand_signals), 1), 1),
    true
);
select setval(
    pg_get_serial_sequence('rawdata.taxi_supply_snapshots', 'id'),
    greatest(coalesce((select max(id) from rawdata.taxi_supply_snapshots), 1), 1),
    true
);
select setval(
    pg_get_serial_sequence('rawdata.weather_raw', 'id'),
    greatest(coalesce((select max(id) from rawdata.weather_raw), 1), 1),
    true
);
select setval(
    pg_get_serial_sequence('mart.ops_kpi_snapshots', 'id'),
    greatest(coalesce((select max(id) from mart.ops_kpi_snapshots), 1), 1),
    true
);
select setval(
    pg_get_serial_sequence('mart.demand_supply_forecasts', 'id'),
    greatest(coalesce((select max(id) from mart.demand_supply_forecasts), 1), 1),
    true
);
select setval(
    pg_get_serial_sequence('mart.genai_advisory_outputs', 'id'),
    greatest(coalesce((select max(id) from mart.genai_advisory_outputs), 1), 1),
    true
);

commit;

-- Relationship guide (soft foreign keys for MVP ingestion):
-- rawdata.passenger_demand_signals.flight_instance_id -> rawdata.flight_instances.flight_instance_id
-- rawdata.driver_dispatch_events.signal_id -> rawdata.passenger_demand_signals.id
-- rawdata.driver_dispatch_events.flight_instance_id -> rawdata.flight_instances.flight_instance_id
--
-- Suggested validation queries:
-- select flight_instance_id, flight_no, terminal, est_arrival_local, status
-- from rawdata.flight_instances
-- where airport_code = 'BKK'
--   and est_arrival_local between timezone('Asia/Bangkok', now())::timestamp
--   and timezone('Asia/Bangkok', now())::timestamp + interval '1 hour'
-- order by est_arrival_local;
--
-- select id, flight_instance_id, created_at_local, pax_count, luggage_count, status
-- from rawdata.passenger_demand_signals
-- where airport_code = 'BKK'
--   and created_at_local >= timezone('Asia/Bangkok', now())::timestamp - interval '20 minutes'
-- order by created_at_local desc;
--
-- select horizon_min, ts_local, demand_pax, supply_taxis
-- from mart.demand_supply_forecasts
-- where airport_code = 'BKK'
-- order by ts_local;
