-- Sistema de Ponto Pro - Estrutura ERP opcional para Supabase/PostgreSQL
-- Uso: cole este arquivo no SQL Editor do Supabase e execute.
-- Importante:
-- 1. Este SQL é ADITIVO: não altera nem apaga tabelas atuais.
-- 2. As tabelas usam funcionario_id como bigint sem FK obrigatória para evitar falhas caso
--    sua tabela de funcionários tenha outro nome ou tipo. Se sua tabela for public.funcionarios(id),
--    você pode adicionar FKs depois com segurança.
-- 3. O frontend atual funciona sem este SQL. Ele prepara a base para backend futuro calcular
--    absenteísmo, banco de horas, ocorrências, auditoria e regras de jornada oficialmente.

begin;

create table if not exists public.departamentos_ponto (
    id bigserial primary key,
    nome text not null unique,
    descricao text,
    ativo boolean not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table if not exists public.cargos_ponto (
    id bigserial primary key,
    nome text not null unique,
    descricao text,
    ativo boolean not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table if not exists public.jornadas_ponto (
    id bigserial primary key,
    nome text not null unique,
    carga_diaria_horas numeric(5,2) not null default 8.00 check (carga_diaria_horas > 0),
    carga_semanal_horas numeric(5,2) not null default 44.00 check (carga_semanal_horas > 0),
    entrada_prevista time not null default '08:00',
    saida_prevista time not null default '18:00',
    intervalo_minutos integer not null default 60 check (intervalo_minutos >= 0),
    tolerancia_atraso_minutos integer not null default 10 check (tolerancia_atraso_minutos >= 0),
    tolerancia_saida_minutos integer not null default 10 check (tolerancia_saida_minutos >= 0),
    considera_sabado boolean not null default false,
    considera_domingo boolean not null default false,
    ativo boolean not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

insert into public.jornadas_ponto (
    nome,
    carga_diaria_horas,
    carga_semanal_horas,
    entrada_prevista,
    saida_prevista,
    intervalo_minutos,
    tolerancia_atraso_minutos,
    tolerancia_saida_minutos
)
values (
    'Jornada padrão 8h',
    8.00,
    44.00,
    '08:00',
    '18:00',
    60,
    10,
    10
)
on conflict (nome) do nothing;

create table if not exists public.funcionarios_config_ponto (
    id bigserial primary key,
    funcionario_id bigint not null unique,
    departamento_id bigint references public.departamentos_ponto(id) on delete set null,
    cargo_id bigint references public.cargos_ponto(id) on delete set null,
    jornada_id bigint references public.jornadas_ponto(id) on delete set null,
    banco_horas_ativo boolean not null default true,
    saldo_inicial_horas numeric(10,2) not null default 0.00,
    data_inicio_controle date not null default current_date,
    ativo boolean not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table if not exists public.feriados_ponto (
    id bigserial primary key,
    data date not null,
    nome text not null,
    tipo text not null default 'nacional' check (tipo in ('nacional', 'estadual', 'municipal', 'empresa')),
    recorrente_anual boolean not null default false,
    ativo boolean not null default true,
    created_at timestamptz not null default now(),
    unique (data, nome)
);

create table if not exists public.ocorrencias_ponto (
    id bigserial primary key,
    funcionario_id bigint not null,
    data_ocorrencia date not null,
    tipo text not null check (
        tipo in (
            'falta',
            'atraso',
            'saida_antecipada',
            'ponto_incompleto',
            'ajuste_manual',
            'jornada_excedida',
            'banco_horas',
            'observacao'
        )
    ),
    severidade text not null default 'atencao' check (severidade in ('info', 'atencao', 'critica')),
    descricao text not null,
    minutos_impacto integer not null default 0,
    status text not null default 'pendente' check (status in ('pendente', 'em_revisao', 'aprovada', 'rejeitada', 'resolvida')),
    origem text not null default 'sistema' check (origem in ('sistema', 'rh', 'colaborador', 'integracao')),
    criado_por_funcionario_id bigint,
    revisado_por_funcionario_id bigint,
    revisado_em timestamptz,
    observacao_revisao text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table if not exists public.banco_horas_lancamentos (
    id bigserial primary key,
    funcionario_id bigint not null,
    data_referencia date not null,
    tipo text not null check (tipo in ('credito', 'debito', 'ajuste', 'saldo_inicial')),
    origem text not null default 'sistema' check (origem in ('sistema', 'rh', 'fechamento', 'importacao')),
    horas numeric(10,2) not null,
    descricao text,
    ocorrencia_id bigint references public.ocorrencias_ponto(id) on delete set null,
    aprovado_por_funcionario_id bigint,
    aprovado_em timestamptz,
    created_at timestamptz not null default now()
);

create table if not exists public.fechamentos_ponto (
    id bigserial primary key,
    funcionario_id bigint,
    competencia date not null,
    data_inicio date not null,
    data_fim date not null,
    horas_previstas numeric(10,2) not null default 0,
    horas_trabalhadas numeric(10,2) not null default 0,
    horas_extras numeric(10,2) not null default 0,
    horas_negativas numeric(10,2) not null default 0,
    saldo_periodo numeric(10,2) not null default 0,
    faltas integer not null default 0,
    atrasos integer not null default 0,
    saidas_antecipadas integer not null default 0,
    ajustes_manuais integer not null default 0,
    status text not null default 'aberto' check (status in ('aberto', 'em_revisao', 'fechado', 'reaberto')),
    fechado_por_funcionario_id bigint,
    fechado_em timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (funcionario_id, competencia)
);

create table if not exists public.auditoria_ponto (
    id bigserial primary key,
    funcionario_alvo_id bigint,
    usuario_acao_id bigint,
    acao text not null,
    entidade text not null,
    entidade_id bigint,
    valor_anterior jsonb,
    valor_novo jsonb,
    ip inet,
    user_agent text,
    created_at timestamptz not null default now()
);

create index if not exists idx_funcionarios_config_ponto_funcionario_id
    on public.funcionarios_config_ponto (funcionario_id);

create index if not exists idx_ocorrencias_ponto_funcionario_data
    on public.ocorrencias_ponto (funcionario_id, data_ocorrencia);

create index if not exists idx_ocorrencias_ponto_status
    on public.ocorrencias_ponto (status);

create index if not exists idx_banco_horas_funcionario_data
    on public.banco_horas_lancamentos (funcionario_id, data_referencia);

create index if not exists idx_fechamentos_ponto_competencia
    on public.fechamentos_ponto (competencia);

create index if not exists idx_auditoria_ponto_funcionario_alvo
    on public.auditoria_ponto (funcionario_alvo_id, created_at desc);

create or replace view public.v_erp_ponto_ocorrencias_resumo as
select
    funcionario_id,
    date_trunc('month', data_ocorrencia)::date as competencia,
    count(*) filter (where tipo = 'falta') as faltas,
    count(*) filter (where tipo = 'atraso') as atrasos,
    count(*) filter (where tipo = 'saida_antecipada') as saidas_antecipadas,
    count(*) filter (where tipo = 'ponto_incompleto') as pontos_incompletos,
    count(*) filter (where tipo = 'ajuste_manual') as ajustes_manuais,
    count(*) filter (where status = 'pendente') as pendentes,
    sum(minutos_impacto) as minutos_impacto_total
from public.ocorrencias_ponto
group by funcionario_id, date_trunc('month', data_ocorrencia)::date;

create or replace view public.v_erp_ponto_banco_horas_resumo as
select
    funcionario_id,
    sum(case when tipo in ('credito', 'saldo_inicial') then horas else 0 end) as creditos,
    sum(case when tipo = 'debito' then horas else 0 end) as debitos,
    sum(case
        when tipo in ('credito', 'saldo_inicial') then horas
        when tipo = 'debito' then -horas
        when tipo = 'ajuste' then horas
        else 0
    end) as saldo_atual
from public.banco_horas_lancamentos
group by funcionario_id;


-- Controle opcional de permissão administrativa.
-- O backend deve consultar esta tabela para liberar telas e endpoints de RH/ERP.
-- Não armazene senha em texto puro no banco. A senha deve continuar sendo validada
-- pelo mecanismo de autenticação já existente no backend/Supabase Auth.
create table if not exists public.admins_ponto_autorizados (
    id bigserial primary key,
    email text not null unique,
    nome text,
    ativo boolean not null default true,
    observacao text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

insert into public.admins_ponto_autorizados (
    email,
    nome,
    ativo,
    observacao
)
values (
    'joao@empresa.com',
    'João',
    true,
    'Administrador principal autorizado para acesso RH/ERP.'
)
on conflict (email) do update set
    ativo = excluded.ativo,
    nome = excluded.nome,
    observacao = excluded.observacao,
    updated_at = now();


commit;
