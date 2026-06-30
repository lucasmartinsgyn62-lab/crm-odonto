-- =============================================================
-- CRM Odontológico — Schema Supabase (rodar no SQL Editor)
-- =============================================================

-- 1. Tenants (clínicas)
CREATE TABLE IF NOT EXISTS public.tenants (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome          TEXT NOT NULL,
  email_contato TEXT,
  ativo         BOOLEAN DEFAULT true,
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- 2. Profiles (estende auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome        TEXT NOT NULL,
  email       TEXT NOT NULL,
  role        TEXT NOT NULL DEFAULT 'recepcao'
                CHECK (role IN ('super_admin','admin','recepcao')),
  tenant_id   UUID REFERENCES public.tenants(id),
  permissions JSONB NOT NULL DEFAULT
    '{"dashboard":true,"agenda":true,"clientes":true,"dentistas":true,
      "origens":true,"relatorio":true,"caixa":true,"historico_caixa":true}'::jsonb,
  ativo       BOOLEAN DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- 3. Clientes
CREATE TABLE IF NOT EXISTS public.clientes (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id  UUID NOT NULL REFERENCES public.tenants(id),
  nome       TEXT NOT NULL,
  wpp        TEXT,
  orig       TEXT,
  tipo       TEXT DEFAULT 'NOVO',
  areas      JSONB DEFAULT '[]'::jsonb,
  neg        TEXT,
  obs        TEXT,
  prontuario JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Dentistas
CREATE TABLE IF NOT EXISTS public.dentistas (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id  UUID NOT NULL REFERENCES public.tenants(id),
  nome       TEXT NOT NULL,
  esp        TEXT,
  cro        TEXT,
  tel        TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Origens
CREATE TABLE IF NOT EXISTS public.origens (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  nome      TEXT NOT NULL,
  UNIQUE(tenant_id, nome)
);

-- 6. Agenda slots
CREATE TABLE IF NOT EXISTS public.agenda_slots (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id  UUID NOT NULL REFERENCES public.tenants(id),
  ag_key     TEXT NOT NULL,
  horario    TEXT NOT NULL,
  slot_data  JSONB,
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, ag_key, horario)
);

-- 7. Caixa do dia
CREATE TABLE IF NOT EXISTS public.caixa_dia (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id  UUID NOT NULL REFERENCES public.tenants(id),
  mes        TEXT,
  h          TEXT,
  data       JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, mes, h)
);

-- 8. Histórico de fechamentos
CREATE TABLE IF NOT EXISTS public.historico_fechamentos (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id  UUID NOT NULL REFERENCES public.tenants(id),
  fechamento JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================================
-- Ativar RLS em todas as tabelas
-- =============================================================
ALTER TABLE public.tenants              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clientes             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dentistas            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.origens              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agenda_slots         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.caixa_dia            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.historico_fechamentos ENABLE ROW LEVEL SECURITY;

-- =============================================================
-- Funções auxiliares (SECURITY DEFINER evita recursão no RLS)
-- =============================================================
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS TEXT LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.get_my_tenant()
RETURNS UUID LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT tenant_id FROM public.profiles WHERE id = auth.uid();
$$;

-- =============================================================
-- Políticas RLS — profiles
-- =============================================================
DROP POLICY IF EXISTS "profiles_select" ON public.profiles;
CREATE POLICY "profiles_select" ON public.profiles FOR SELECT USING (
  id = auth.uid() OR get_my_role() = 'super_admin'
);

DROP POLICY IF EXISTS "profiles_insert" ON public.profiles;
CREATE POLICY "profiles_insert" ON public.profiles FOR INSERT WITH CHECK (
  get_my_role() = 'super_admin'
);

DROP POLICY IF EXISTS "profiles_update" ON public.profiles;
CREATE POLICY "profiles_update" ON public.profiles FOR UPDATE USING (
  id = auth.uid() OR get_my_role() = 'super_admin'
);

DROP POLICY IF EXISTS "profiles_delete" ON public.profiles;
CREATE POLICY "profiles_delete" ON public.profiles FOR DELETE USING (
  get_my_role() = 'super_admin'
);

-- =============================================================
-- Políticas RLS — tenants
-- =============================================================
DROP POLICY IF EXISTS "tenants_select" ON public.tenants;
CREATE POLICY "tenants_select" ON public.tenants FOR SELECT USING (
  get_my_role() = 'super_admin' OR id = get_my_tenant()
);

DROP POLICY IF EXISTS "tenants_insert" ON public.tenants;
CREATE POLICY "tenants_insert" ON public.tenants FOR INSERT WITH CHECK (
  get_my_role() = 'super_admin'
);

DROP POLICY IF EXISTS "tenants_update" ON public.tenants;
CREATE POLICY "tenants_update" ON public.tenants FOR UPDATE USING (
  get_my_role() = 'super_admin'
);

-- =============================================================
-- Políticas RLS — tabelas de dados (isolamento por tenant)
-- =============================================================
DROP POLICY IF EXISTS "clientes_iso" ON public.clientes;
CREATE POLICY "clientes_iso" ON public.clientes FOR ALL USING (
  tenant_id = get_my_tenant() OR get_my_role() = 'super_admin'
);

DROP POLICY IF EXISTS "dentistas_iso" ON public.dentistas;
CREATE POLICY "dentistas_iso" ON public.dentistas FOR ALL USING (
  tenant_id = get_my_tenant() OR get_my_role() = 'super_admin'
);

DROP POLICY IF EXISTS "origens_iso" ON public.origens;
CREATE POLICY "origens_iso" ON public.origens FOR ALL USING (
  tenant_id = get_my_tenant() OR get_my_role() = 'super_admin'
);

DROP POLICY IF EXISTS "agenda_slots_iso" ON public.agenda_slots;
CREATE POLICY "agenda_slots_iso" ON public.agenda_slots FOR ALL USING (
  tenant_id = get_my_tenant() OR get_my_role() = 'super_admin'
);

DROP POLICY IF EXISTS "caixa_dia_iso" ON public.caixa_dia;
CREATE POLICY "caixa_dia_iso" ON public.caixa_dia FOR ALL USING (
  tenant_id = get_my_tenant() OR get_my_role() = 'super_admin'
);

DROP POLICY IF EXISTS "historico_iso" ON public.historico_fechamentos;
CREATE POLICY "historico_iso" ON public.historico_fechamentos FOR ALL USING (
  tenant_id = get_my_tenant() OR get_my_role() = 'super_admin'
);
