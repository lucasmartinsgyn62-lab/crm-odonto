import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  // Aceita GET do cron do Vercel ou POST manual do super admin
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.authorization;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  try {
    const [tenants, profiles, clientes, dentistas, origens, agenda, caixa, historico] =
      await Promise.all([
        supabase.from('tenants').select('*'),
        supabase.from('profiles').select('id,nome,email,role,tenant_id,permissions,ativo,created_at'),
        supabase.from('clientes').select('*'),
        supabase.from('dentistas').select('*'),
        supabase.from('origens').select('*'),
        supabase.from('agenda_slots').select('*'),
        supabase.from('caixa_dia').select('*'),
        supabase.from('historico_fechamentos').select('*'),
      ]);

    const backupData = {
      version: '1.0',
      timestamp: new Date().toISOString(),
      tenants: tenants.data || [],
      profiles: profiles.data || [],
      clientes: clientes.data || [],
      dentistas: dentistas.data || [],
      origens: origens.data || [],
      agenda_slots: agenda.data || [],
      caixa_dia: caixa.data || [],
      historico_fechamentos: historico.data || [],
    };

    const sizeKb = Math.round(JSON.stringify(backupData).length / 1024);

    const { error } = await supabase.from('backups').insert({
      data: backupData,
      size_kb: sizeKb,
      tipo: 'automatico',
    });

    if (error) throw error;

    return res.status(200).json({ success: true, timestamp: backupData.timestamp, size_kb: sizeKb });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
