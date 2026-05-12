-- Hello Ride Platform
-- Ops AI chat and advisory schema additions for Supabase / Postgres

begin;

create schema if not exists mart;

create table if not exists mart.ops_ai_chat_sessions (
    id bigserial primary key,
    airport_code text not null default 'BKK',
    terminal text null,
    mode text not null default 'ai_advisory',
    created_at_local timestamp default now()
);

create table if not exists mart.ops_ai_chat_messages (
    id bigserial primary key,
    session_id bigint references mart.ops_ai_chat_sessions(id),
    role text not null,
    content text not null,
    context_json text null,
    created_at_local timestamp default now()
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

create index if not exists idx_ops_ai_chat_sessions_airport_created
    on mart.ops_ai_chat_sessions (airport_code, created_at_local);

create index if not exists idx_ops_ai_chat_messages_session_created
    on mart.ops_ai_chat_messages (session_id, created_at_local);

create index if not exists idx_ops_ai_chat_messages_role
    on mart.ops_ai_chat_messages (role);

with seeded_session as (
    insert into mart.ops_ai_chat_sessions (
        airport_code,
        terminal,
        mode,
        created_at_local
    )
    select
        'BKK',
        'ALL',
        'ai_advisory',
        timezone('Asia/Bangkok', now())::timestamp
    where not exists (
        select 1
        from mart.ops_ai_chat_sessions
        where airport_code = 'BKK'
          and terminal = 'ALL'
          and mode = 'ai_advisory'
    )
    returning id
),
resolved_session as (
    select id from seeded_session
    union all
    select id
    from mart.ops_ai_chat_sessions
    where airport_code = 'BKK'
      and terminal = 'ALL'
      and mode = 'ai_advisory'
    order by id
    limit 1
)
insert into mart.ops_ai_chat_messages (
    session_id,
    role,
    content,
    context_json,
    created_at_local
)
select
    resolved_session.id,
    'assistant',
    'Hello Ride AI Advisory is ready. Ask about deficit risk, arrival-wave pressure, lane activation, or the next 15 minutes of BKK operations.',
    '{"airport_code":"BKK","terminal":"ALL","mode":"ai_advisory"}',
    timezone('Asia/Bangkok', now())::timestamp
from resolved_session
where not exists (
    select 1
    from mart.ops_ai_chat_messages
    where session_id = resolved_session.id
      and role = 'assistant'
      and content = 'Hello Ride AI Advisory is ready. Ask about deficit risk, arrival-wave pressure, lane activation, or the next 15 minutes of BKK operations.'
);

select setval(
    pg_get_serial_sequence('mart.ops_ai_chat_sessions', 'id'),
    greatest(coalesce((select max(id) from mart.ops_ai_chat_sessions), 1), 1),
    true
);

select setval(
    pg_get_serial_sequence('mart.ops_ai_chat_messages', 'id'),
    greatest(coalesce((select max(id) from mart.ops_ai_chat_messages), 1), 1),
    true
);

select setval(
    pg_get_serial_sequence('mart.genai_advisory_outputs', 'id'),
    greatest(coalesce((select max(id) from mart.genai_advisory_outputs), 1), 1),
    true
);

commit;

-- Suggested validation queries:
-- select * from mart.ops_ai_chat_sessions order by created_at_local desc;
-- select * from mart.ops_ai_chat_messages order by created_at_local desc;
