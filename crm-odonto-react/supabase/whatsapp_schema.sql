-- =============================================================
-- CRM Odontológico — Tabelas WhatsApp API + IA (rodar no SQL Editor)
-- =============================================================

-- 1. Configurações (chave/valor por tenant: whatsapp_config, openai_config, automacao_config)
CREATE TABLE IF NOT EXISTS public.configuracoes (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id  UUID NOT NULL REFERENCES public.tenants(id),
  chave      TEXT NOT NULL,
  valor      JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, chave)
);

-- 2. Logs de mensagens (recebidas/enviadas, automação e IA)
CREATE TABLE IF NOT EXISTS public.whatsapp_logs (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      UUID NOT NULL REFERENCES public.tenants(id),
  contato        TEXT NOT NULL,
  telefone       TEXT,
  mensagem       TEXT,
  direcao        TEXT NOT NULL CHECK (direcao IN ('recebida','enviada')),
  respondido_por TEXT CHECK (respondido_por IN ('ia','humano')),
  created_at     TIMESTAMPTZ DEFAULT now()
);

-- 3. Disparos em massa (histórico de envio de campanhas)
CREATE TABLE IF NOT EXISTS public.disparos_massa (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id  UUID NOT NULL REFERENCES public.tenants(id),
  campanha   TEXT NOT NULL,
  contato    TEXT NOT NULL,
  telefone   TEXT NOT NULL,
  status     TEXT NOT NULL CHECK (status IN ('enviado','falhou')),
  erro       TEXT,
  enviado_em TIMESTAMPTZ DEFAULT now()
);

-- 4. Sequências de follow-up
CREATE TABLE IF NOT EXISTS public.followup_sequencias (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id  UUID NOT NULL REFERENCES public.tenants(id),
  nome       TEXT NOT NULL,
  ativo      BOOLEAN DEFAULT true,
  config     JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Envios agendados de cada sequência
CREATE TABLE IF NOT EXISTS public.followup_envios (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      UUID NOT NULL REFERENCES public.tenants(id),
  sequencia_id   UUID NOT NULL REFERENCES public.followup_sequencias(id) ON DELETE CASCADE,
  contato        TEXT NOT NULL,
  telefone       TEXT NOT NULL,
  etapa          INTEGER NOT NULL,
  status         TEXT NOT NULL DEFAULT 'agendado' CHECK (status IN ('agendado','enviado','respondeu','concluido','cancelado','falhou')),
  agendado_para  TIMESTAMPTZ NOT NULL,
  enviado_em     TIMESTAMPTZ,
  created_at     TIMESTAMPTZ DEFAULT now()
);

-- =============================================================
-- RLS
-- =============================================================
ALTER TABLE public.configuracoes        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_logs        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.disparos_massa       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.followup_sequencias  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.followup_envios      ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "configuracoes_iso" ON public.configuracoes;
CREATE POLICY "configuracoes_iso" ON public.configuracoes FOR ALL USING (
  tenant_id = get_my_tenant() OR get_my_role() = 'super_admin'
);

DROP POLICY IF EXISTS "whatsapp_logs_iso" ON public.whatsapp_logs;
CREATE POLICY "whatsapp_logs_iso" ON public.whatsapp_logs FOR ALL USING (
  tenant_id = get_my_tenant() OR get_my_role() = 'super_admin'
);

DROP POLICY IF EXISTS "disparos_massa_iso" ON public.disparos_massa;
CREATE POLICY "disparos_massa_iso" ON public.disparos_massa FOR ALL USING (
  tenant_id = get_my_tenant() OR get_my_role() = 'super_admin'
);

DROP POLICY IF EXISTS "followup_sequencias_iso" ON public.followup_sequencias;
CREATE POLICY "followup_sequencias_iso" ON public.followup_sequencias FOR ALL USING (
  tenant_id = get_my_tenant() OR get_my_role() = 'super_admin'
);

DROP POLICY IF EXISTS "followup_envios_iso" ON public.followup_envios;
CREATE POLICY "followup_envios_iso" ON public.followup_envios FOR ALL USING (
  tenant_id = get_my_tenant() OR get_my_role() = 'super_admin'
);
