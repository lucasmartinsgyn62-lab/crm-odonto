import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useCRM } from '../../context/CRMContext';

const BASE_URL = 'https://avancercrm.com.br/api/v1';
const EVENTOS = [
  { id: 'lead.created',       label: 'Lead criado' },
  { id: 'lead.updated',       label: 'Lead atualizado' },
  { id: 'lead.stage_changed', label: 'Lead mudou de etapa' },
  { id: 'lead.deleted',       label: 'Lead excluído' },
];

function hex(buf) { return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join(''); }
function randHex(bytes) { const a = new Uint8Array(bytes); crypto.getRandomValues(a); return hex(a.buffer); }
async function sha256hex(txt) { return hex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(txt))); }
function fmtDt(d) { return d ? new Date(d).toLocaleString('pt-BR') : '—'; }

export default function ApiIntegracoes() {
  const { usuario, showToast } = useCRM();
  const tenantId = usuario?.tenant_id;

  const [keys, setKeys] = useState([]);
  const [hooks, setHooks] = useState([]);
  const [deliveries, setDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);

  // criação de chave
  const [novaChave, setNovaChave] = useState(null);      // { nome, permissao } form | null
  const [chaveGerada, setChaveGerada] = useState(null);  // string exibida uma única vez
  // criação de webhook
  const [novoHook, setNovoHook] = useState(null);        // form | null
  const [secretGerado, setSecretGerado] = useState(null);

  useEffect(() => { if (tenantId) loadAll(); }, [tenantId]);

  async function loadDeliveries() {
    // secret NUNCA é selecionado — só existe no banco e no modal de criação (uma vez)
    const { data } = await supabase.from('webhook_deliveries')
      .select('id, evento, status, tentativas, http_status, ultimo_erro, created_at, delivered_at, endpoint_id')
      .eq('tenant_id', tenantId).order('created_at', { ascending: false }).limit(50);
    setDeliveries(data || []);
  }

  async function loadAll() {
    setLoading(true);
    const [k, h] = await Promise.all([
      supabase.from('api_keys')
        .select('id, nome, prefix, permissao, ativo, last_used_at, created_at')
        .eq('tenant_id', tenantId).order('created_at', { ascending: false }),
      supabase.from('webhook_endpoints')
        .select('id, url, descricao, eventos, ativo, created_at')
        .eq('tenant_id', tenantId).order('created_at', { ascending: false }),
    ]);
    if (k.error || h.error) showToast('Erro ao carregar: ' + (k.error || h.error).message, 'error');
    setKeys(k.data || []); setHooks(h.data || []);
    await loadDeliveries();
    setLoading(false);
  }

  function copiar(txt, msg = 'Copiado!') {
    navigator.clipboard.writeText(txt)
      .then(() => showToast('✔ ' + msg, 'success'))
      .catch(() => showToast('Não consegui copiar automaticamente — selecione o texto e use Ctrl+C', 'warning'));
  }

  // ── Chaves ──────────────────────────────────────────────────
  async function gerarChave() {
    if (!novaChave?.nome?.trim()) { showToast('Dê um nome à chave (ex: Integração Disparos)', 'warning'); return; }
    let chave, key_hash;
    try {
      chave = 'avancer_live_' + randHex(24);
      key_hash = await sha256hex(chave); // crypto.subtle exige HTTPS/localhost
    } catch {
      showToast('Geração de chave requer conexão segura (HTTPS). Acesse pelo endereço oficial.', 'error');
      return;
    }
    const { data, error } = await supabase.from('api_keys').insert({
      tenant_id: tenantId, nome: novaChave.nome.trim(),
      prefix: chave.slice(0, 21) + '…',
      key_hash, permissao: novaChave.permissao || 'full',
      created_by: usuario?.nome || usuario?.email,
    }).select().single();
    if (error) { showToast('Erro: ' + error.message, 'error'); return; }
    setKeys(p => [data, ...p]);
    setNovaChave(null);
    setChaveGerada(chave);
  }

  async function revogarChave(k) {
    if (!confirm(`Revogar a chave "${k.nome}"? Integrações que a usam vão parar imediatamente.`)) return;
    const { error } = await supabase.from('api_keys').update({ ativo: false }).eq('id', k.id);
    if (error) { showToast('ERRO ao revogar — a chave AINDA ESTÁ ATIVA: ' + error.message, 'error'); return; }
    setKeys(p => p.map(x => x.id === k.id ? { ...x, ativo: false } : x));
    showToast('Chave revogada', 'success');
  }

  async function excluirChave(k) {
    if (!confirm(`Excluir definitivamente a chave "${k.nome}"?`)) return;
    const { error } = await supabase.from('api_keys').delete().eq('id', k.id);
    if (error) { showToast('Erro ao excluir: ' + error.message, 'error'); return; }
    setKeys(p => p.filter(x => x.id !== k.id));
  }

  // ── Webhooks ────────────────────────────────────────────────
  async function criarHook() {
    if (!/^https?:\/\//.test(novoHook?.url || '')) { showToast('Informe uma URL http(s) válida', 'warning'); return; }
    const eventos = EVENTOS.filter(e => novoHook.eventos?.[e.id]).map(e => e.id);
    if (!eventos.length) { showToast('Selecione ao menos 1 evento', 'warning'); return; }
    const secret = 'whsec_' + randHex(24);
    const { data, error } = await supabase.from('webhook_endpoints').insert({
      tenant_id: tenantId, url: novoHook.url.trim(), descricao: novoHook.descricao?.trim() || null, eventos, secret,
    }).select('id, url, descricao, eventos, ativo, created_at').single(); // sem o secret no estado
    if (error) { showToast('Erro: ' + error.message, 'error'); return; }
    setHooks(p => [data, ...p]);
    setNovoHook(null);
    setSecretGerado(secret);
  }

  async function toggleHook(h) {
    const { error } = await supabase.from('webhook_endpoints').update({ ativo: !h.ativo }).eq('id', h.id);
    if (error) { showToast('Erro: ' + error.message, 'error'); return; }
    setHooks(p => p.map(x => x.id === h.id ? { ...x, ativo: !h.ativo } : x));
  }

  async function excluirHook(h) {
    if (!confirm('Excluir este webhook? O histórico de entregas dele também será removido.')) return;
    const { error } = await supabase.from('webhook_endpoints').delete().eq('id', h.id);
    if (error) { showToast('Erro ao excluir: ' + error.message, 'error'); return; }
    setHooks(p => p.filter(x => x.id !== h.id));
  }

  async function testarHook(h) {
    const { error } = await supabase.rpc('emitir_webhook_teste', { p_endpoint: h.id });
    if (error) showToast('Erro: ' + error.message, 'error');
    // atualiza só o log de entregas — não desmonta a tela nem fecha modais abertos
    else { showToast('✔ Teste enviado! Veja o log abaixo em alguns segundos.', 'success'); setTimeout(loadDeliveries, 4000); }
  }

  if (loading) return <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--cinza)' }}>Carregando…</div>;

  const stBadge = s => s === 'sucesso'
    ? <span style={{ background: '#e8f5e9', color: '#2e7d32', fontWeight: 700, fontSize: 10, padding: '2px 8px', borderRadius: 10 }}>SUCESSO</span>
    : s === 'falha'
      ? <span style={{ background: '#ffebee', color: '#c62828', fontWeight: 700, fontSize: 10, padding: '2px 8px', borderRadius: 10 }}>FALHA</span>
      : <span style={{ background: '#fff8e1', color: '#e65100', fontWeight: 700, fontSize: 10, padding: '2px 8px', borderRadius: 10 }}>PENDENTE</span>;

  return (
    <div style={{ display: 'grid', gap: '1.25rem' }}>

      {/* ── Cabeçalho / URL base ── */}
      <div className="fp">
        <h3 style={{ color: 'var(--v2)', marginBottom: '.4rem' }}>🔌 API Pública do AvancerCRM</h3>
        <p style={{ fontSize: 13, color: 'var(--cinza)', lineHeight: 1.7, marginBottom: '.8rem' }}>
          Integre qualquer sistema externo (disparo de WhatsApp, automações n8n/Make/Zapier, sites de captação) ao seu funil de vendas.
          Gere uma chave, entregue ao integrador junto com a <a href="/api-docs" target="_blank" style={{ color: 'var(--v2)', fontWeight: 700 }}>documentação</a>, e pronto.
        </p>
        <div style={{ display: 'flex', gap: '.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <code style={{ background: 'var(--b2)', border: '1px solid var(--borda)', borderRadius: 8, padding: '.45rem .8rem', fontSize: 12, fontWeight: 700 }}>{BASE_URL}</code>
          <button className="btn-pront" onClick={() => copiar(BASE_URL, 'URL base copiada')}>📋 Copiar</button>
          <button className="btn-pront" onClick={() => window.open('/api-docs', '_blank')}>📖 Documentação da API</button>
        </div>
      </div>

      {/* ── Chaves de API ── */}
      <div className="fp">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '.9rem' }}>
          <h3 style={{ color: 'var(--v2)', margin: 0 }}>🔑 Chaves de API</h3>
          <button className="btn-salvar-atualiz" onClick={() => setNovaChave({ nome: '', permissao: 'full' })}>＋ Gerar nova chave</button>
        </div>
        {keys.length === 0 && <div style={{ fontSize: 13, color: 'var(--cinza)' }}>Nenhuma chave gerada ainda.</div>}
        {keys.length > 0 && (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead><tr style={{ background: 'var(--b2)' }}>
                {['Nome', 'Chave', 'Permissão', 'Status', 'Último uso', 'Criada em', ''].map(h => <th key={h} style={{ padding: '.5rem .7rem', textAlign: 'left', fontWeight: 700 }}>{h}</th>)}
              </tr></thead>
              <tbody>{keys.map(k => (
                <tr key={k.id} style={{ borderBottom: '1px solid var(--borda)', opacity: k.ativo ? 1 : .5 }}>
                  <td style={{ padding: '.5rem .7rem', fontWeight: 700 }}>{k.nome}</td>
                  <td style={{ padding: '.5rem .7rem', fontFamily: 'monospace' }}>{k.prefix}</td>
                  <td style={{ padding: '.5rem .7rem' }}>{k.permissao === 'full' ? 'Leitura + Escrita' : 'Somente leitura'}</td>
                  <td style={{ padding: '.5rem .7rem' }}>{k.ativo ? '🟢 Ativa' : '🔴 Revogada'}</td>
                  <td style={{ padding: '.5rem .7rem', color: 'var(--cinza)' }}>{fmtDt(k.last_used_at)}</td>
                  <td style={{ padding: '.5rem .7rem', color: 'var(--cinza)' }}>{fmtDt(k.created_at)}</td>
                  <td style={{ padding: '.5rem .7rem', whiteSpace: 'nowrap' }}>
                    {k.ativo
                      ? <button className="btn-pront" style={{ color: '#e65100', fontSize: 11 }} onClick={() => revogarChave(k)}>Revogar</button>
                      : <button className="btn-pront" style={{ color: '#c62828', fontSize: 11 }} onClick={() => excluirChave(k)}>Excluir</button>}
                  </td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Webhooks ── */}
      <div className="fp">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '.4rem' }}>
          <h3 style={{ color: 'var(--v2)', margin: 0 }}>📡 Webhooks (avisos automáticos)</h3>
          <button className="btn-salvar-atualiz" onClick={() => setNovoHook({ url: '', descricao: '', eventos: { 'lead.created': true, 'lead.stage_changed': true } })}>＋ Adicionar webhook</button>
        </div>
        <p style={{ fontSize: 12, color: 'var(--cinza)', marginBottom: '.9rem' }}>
          O CRM envia um POST para a URL cadastrada sempre que o evento acontecer no funil — é assim que o sistema de disparo do integrador fica sabendo na hora.
        </p>
        {hooks.length === 0 && <div style={{ fontSize: 13, color: 'var(--cinza)' }}>Nenhum webhook cadastrado.</div>}
        <div style={{ display: 'grid', gap: '.6rem' }}>
          {hooks.map(h => (
            <div key={h.id} style={{ border: '1px solid var(--borda)', borderRadius: 'var(--r)', padding: '.75rem .9rem', display: 'flex', flexWrap: 'wrap', gap: '.6rem', alignItems: 'center', opacity: h.ativo ? 1 : .55 }}>
              <div style={{ flex: 1, minWidth: 220 }}>
                <div style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 700, wordBreak: 'break-all' }}>{h.url}</div>
                <div style={{ fontSize: 11, color: 'var(--cinza)', marginTop: 2 }}>
                  {h.descricao ? h.descricao + ' · ' : ''}{(h.eventos || []).join(', ')}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '.4rem', flexWrap: 'wrap' }}>
                <button className="btn-pront" style={{ fontSize: 11 }} onClick={() => testarHook(h)}>🧪 Testar</button>
                <button className="btn-pront" style={{ fontSize: 11 }} onClick={() => toggleHook(h)}>{h.ativo ? '⏸ Pausar' : '▶ Ativar'}</button>
                <button className="btn-pront" style={{ fontSize: 11, color: '#c62828' }} onClick={() => excluirHook(h)}>🗑</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Log de entregas ── */}
      <div className="fp">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '.9rem' }}>
          <h3 style={{ color: 'var(--v2)', margin: 0 }}>📜 Últimas entregas de webhook</h3>
          <button className="btn-pront" onClick={loadAll}>🔄 Atualizar</button>
        </div>
        {deliveries.length === 0 && <div style={{ fontSize: 13, color: 'var(--cinza)' }}>Nenhuma entrega registrada ainda.</div>}
        {deliveries.length > 0 && (
          <div style={{ overflowX: 'auto', maxHeight: 320, overflowY: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead><tr style={{ background: 'var(--b2)' }}>
                {['Evento', 'Status', 'HTTP', 'Tentativas', 'Erro', 'Quando'].map(h => <th key={h} style={{ padding: '.5rem .7rem', textAlign: 'left', fontWeight: 700 }}>{h}</th>)}
              </tr></thead>
              <tbody>{deliveries.map(d => (
                <tr key={d.id} style={{ borderBottom: '1px solid var(--borda)' }}>
                  <td style={{ padding: '.45rem .7rem', fontFamily: 'monospace' }}>{d.evento}</td>
                  <td style={{ padding: '.45rem .7rem' }}>{stBadge(d.status)}</td>
                  <td style={{ padding: '.45rem .7rem' }}>{d.http_status || '—'}</td>
                  <td style={{ padding: '.45rem .7rem' }}>{d.tentativas}</td>
                  <td style={{ padding: '.45rem .7rem', color: '#c62828', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={d.ultimo_erro || ''}>{d.ultimo_erro || '—'}</td>
                  <td style={{ padding: '.45rem .7rem', color: 'var(--cinza)', whiteSpace: 'nowrap' }}>{fmtDt(d.created_at)}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Modal: nova chave ── */}
      {novaChave && (
        <Overlay onClose={() => setNovaChave(null)}>
          <ModalBox title="Gerar nova chave de API" onClose={() => setNovaChave(null)}>
            <div style={{ display: 'grid', gap: '.7rem' }}>
              <div className="fgg"><label>Nome (pra quem/pra quê é a chave) *</label>
                <input className="inf" autoFocus value={novaChave.nome} placeholder="Ex: Integração disparo WhatsApp — Agência X" onChange={e => setNovaChave(p => ({ ...p, nome: e.target.value }))} />
              </div>
              <div className="fgg"><label>Permissão</label>
                <select className="inf" value={novaChave.permissao} onChange={e => setNovaChave(p => ({ ...p, permissao: e.target.value }))}>
                  <option value="full">Leitura + Escrita (criar/mover leads)</option>
                  <option value="read">Somente leitura</option>
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '.75rem', marginTop: '1rem' }}>
              <button className="btn-salvar-atualiz" onClick={gerarChave}>🔑 Gerar chave</button>
              <button className="btn-pront" onClick={() => setNovaChave(null)}>Cancelar</button>
            </div>
          </ModalBox>
        </Overlay>
      )}

      {/* ── Modal: chave gerada (exibida UMA vez) ── */}
      {chaveGerada && (
        <Overlay onClose={() => setChaveGerada(null)}>
          <ModalBox title="✅ Chave gerada — copie AGORA" onClose={() => setChaveGerada(null)}>
            <p style={{ fontSize: 13, color: 'var(--cinza)', marginBottom: '.7rem' }}>
              Por segurança, esta chave <strong>não será mostrada de novo</strong>. Copie e entregue ao integrador.
            </p>
            <code style={{ display: 'block', background: '#1e1e2e', color: '#cdd6f4', borderRadius: 8, padding: '.8rem', fontSize: 12, wordBreak: 'break-all', marginBottom: '.8rem' }}>{chaveGerada}</code>
            <button className="btn-salvar-atualiz" onClick={() => copiar(chaveGerada, 'Chave copiada')}>📋 Copiar chave</button>
          </ModalBox>
        </Overlay>
      )}

      {/* ── Modal: novo webhook ── */}
      {novoHook && (
        <Overlay onClose={() => setNovoHook(null)}>
          <ModalBox title="Adicionar webhook" onClose={() => setNovoHook(null)}>
            <div style={{ display: 'grid', gap: '.7rem' }}>
              <div className="fgg"><label>URL de destino *</label>
                <input className="inf" autoFocus value={novoHook.url} placeholder="https://meusistema.com/webhook/avancer" onChange={e => setNovoHook(p => ({ ...p, url: e.target.value }))} />
              </div>
              <div className="fgg"><label>Descrição</label>
                <input className="inf" value={novoHook.descricao} placeholder="Ex: n8n do integrador João" onChange={e => setNovoHook(p => ({ ...p, descricao: e.target.value }))} />
              </div>
              <div className="fgg"><label>Eventos que disparam o aviso</label>
                <div style={{ display: 'grid', gap: '.3rem', fontSize: 13 }}>
                  {EVENTOS.map(ev => (
                    <label key={ev.id} style={{ display: 'flex', gap: '.5rem', alignItems: 'center', cursor: 'pointer' }}>
                      <input type="checkbox" checked={!!novoHook.eventos?.[ev.id]} onChange={e => setNovoHook(p => ({ ...p, eventos: { ...p.eventos, [ev.id]: e.target.checked } }))} />
                      <code style={{ fontSize: 11 }}>{ev.id}</code> — {ev.label}
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '.75rem', marginTop: '1rem' }}>
              <button className="btn-salvar-atualiz" onClick={criarHook}>📡 Cadastrar webhook</button>
              <button className="btn-pront" onClick={() => setNovoHook(null)}>Cancelar</button>
            </div>
          </ModalBox>
        </Overlay>
      )}

      {/* ── Modal: secret do webhook (exibido UMA vez) ── */}
      {secretGerado && (
        <Overlay onClose={() => setSecretGerado(null)}>
          <ModalBox title="✅ Webhook cadastrado — secret de assinatura" onClose={() => setSecretGerado(null)}>
            <p style={{ fontSize: 13, color: 'var(--cinza)', marginBottom: '.7rem' }}>
              Todo aviso vai assinado com HMAC-SHA256 no header <code>X-Avancer-Signature</code>.
              Entregue este secret ao integrador para ele validar que o aviso veio mesmo do seu CRM.
            </p>
            <code style={{ display: 'block', background: '#1e1e2e', color: '#cdd6f4', borderRadius: 8, padding: '.8rem', fontSize: 12, wordBreak: 'break-all', marginBottom: '.8rem' }}>{secretGerado}</code>
            <button className="btn-salvar-atualiz" onClick={() => copiar(secretGerado, 'Secret copiado')}>📋 Copiar secret</button>
          </ModalBox>
        </Overlay>
      )}
    </div>
  );
}

function Overlay({ children, onClose }) {
  return (
    <div onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      {children}
    </div>
  );
}

function ModalBox({ title, onClose, children }) {
  return (
    <div style={{ background: '#fff', borderRadius: 'var(--r)', boxShadow: '0 24px 60px rgba(0,0,0,.25)', width: '100%', maxWidth: 560, maxHeight: '90vh', overflowY: 'auto', padding: '1.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.2rem' }}>
        <div style={{ fontWeight: 800, fontSize: 15, color: 'var(--v2)' }}>{title}</div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: 'var(--cinza)', lineHeight: 1 }}>✕</button>
      </div>
      {children}
    </div>
  );
}
