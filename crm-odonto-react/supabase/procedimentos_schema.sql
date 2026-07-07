-- =============================================================
-- CRM Odontológico — Tabela de Procedimentos (rodar no SQL Editor)
-- =============================================================

CREATE TABLE IF NOT EXISTS public.procedimentos (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id  UUID NOT NULL REFERENCES public.tenants(id),
  nome       TEXT NOT NULL,
  valor      NUMERIC NOT NULL DEFAULT 0,
  cor        TEXT,            -- hex ex: #7C3AED (procedimentos de convênio)
  convenio   TEXT,            -- nome do convênio ex: AMIL (null = particular)
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, nome)
);

ALTER TABLE public.procedimentos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "procedimentos_iso" ON public.procedimentos;
CREATE POLICY "procedimentos_iso" ON public.procedimentos FOR ALL USING (
  tenant_id = get_my_tenant() OR get_my_role() = 'super_admin'
);
