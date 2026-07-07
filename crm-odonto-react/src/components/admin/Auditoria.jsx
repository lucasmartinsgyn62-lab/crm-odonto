import { useState, useEffect, useCallback } from 'react';
import { useCRM } from '../../context/CRMContext';
import { supabase } from '../../lib/supabase';

const ACAO_BADGE = {
  criou:        { bg: '#E8F5E9', cor: '#1B5E20', txt: 'Criou' },
  editou:       { bg: '#E3F2FD', cor: '#0D47A1', txt: 'Editou' },
  excluiu:      { bg: '#FFEBEE', cor: '#B71C1C', txt: 'Excluiu' },
  fechou_caixa: { bg: '#F3E5F5', cor: '#6A1B9A', txt: 'Fechou caixa' },
  login:        { bg: '#FFF3E0', cor: '#E65100', txt: 'Login' },
};

const ENTIDADES = ['', 'paciente', 'agenda', 'caixa', 'procedimento', 'dentista', 'configuração', 'sessão'];

function fmtDataHora(iso) {
  const d = new Date(iso);
  const p = n => String(n).padStart(2, '0');
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

export default function Auditoria() {
  const { usuario } = useCRM();
  const [eventos, setEventos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');
  const [fEntidade, setFEntidade] = useState('');
  const [fUsuario, setFUsuario] = useState('');
  const [fBusca, setFBusca] = useState('');
  const [limite, setLimite] = useState(200);

  const carregar = useCallback(async () => {
    setLoading(true); setErro('');
    let q = supabase.from('audit_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limite);
    if (fEntidade) q = q.eq('entidade', fEntidade);
    const { data, error } = await q;
    if (error) { setErro(error.message); setEventos([]); }
    else setEventos(data || []);
    setLoading(false);
  }, [fEntidade, limite]);

  useEffect(() => { carregar(); }, [carregar]);

  const usuariosUnicos = [...new Set(eventos.map(e => e.usuario).filter(Boolean))];

  const filtrados = eventos.filter(e => {
    if (fUsuario && e.usuario !== fUsuario) return false;
    if (fBusca) {
      const q = fBusca.toLowerCase();
      if (!(e.descricao || '').toLowerCase().includes(q) && !(e.usuario || '').toLowerCase().includes(q)) return false;
    }
    return true;
  });

  return (
    <div>
      <div style={{ marginBottom: '1rem' }}>
        <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--v1)', marginBottom: 2 }}>Trilha de Auditoria</h2>
        <p style={{ fontSize: 12, color: 'var(--cinza)' }}>Registro de quem fez o quê no sistema — visível apenas para administradores.</p>
      </div>

      <div className="tc">
        <div className="th" style={{ gap: '.6rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <i className="ti ti-search" style={{ color: 'var(--v2)', fontSize: 14 }}></i>
            <input className="inf" style={{ width: 220 }} placeholder="Buscar por descrição ou usuário..."
                   value={fBusca} onChange={e => setFBusca(e.target.value)} />
          </div>
          <div className="th-r" style={{ gap: '.5rem' }}>
            <select className="sel" value={fEntidade} onChange={e => setFEntidade(e.target.value)}>
              {ENTIDADES.map(en => <option key={en} value={en}>{en ? en[0].toUpperCase() + en.slice(1) : 'Todas as áreas'}</option>)}
            </select>
            <select className="sel" value={fUsuario} onChange={e => setFUsuario(e.target.value)}>
              <option value="">Todos os usuários</option>
              {usuariosUnicos.map(u => <option key={u}>{u}</option>)}
            </select>
            <select className="sel" value={limite} onChange={e => setLimite(parseInt(e.target.value))}>
              <option value={200}>Últimos 200</option>
              <option value={500}>Últimos 500</option>
              <option value={2000}>Últimos 2000</option>
            </select>
            <button className="btn-pront" onClick={carregar}><i className="ti ti-refresh"></i> Atualizar</button>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="tbl">
            <thead>
              <tr><th style={{ width: 150 }}>DATA / HORA</th><th style={{ width: 150 }}>USUÁRIO</th><th style={{ width: 120 }}>AÇÃO</th><th style={{ width: 110 }}>ÁREA</th><th>O QUE FOI FEITO</th></tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--cinza-cl)', padding: '1.2rem' }}>Carregando…</td></tr>}
              {!loading && erro && <tr><td colSpan={5} style={{ textAlign: 'center', color: '#c62828', padding: '1.2rem' }}>Erro ao carregar: {erro}</td></tr>}
              {!loading && !erro && filtrados.length === 0 && <tr><td colSpan={5} style={{ textAlign: 'center', color: '#bbb', padding: '1.2rem' }}>Nenhum registro encontrado.</td></tr>}
              {!loading && filtrados.map(e => {
                const b = ACAO_BADGE[e.acao] || { bg: '#eee', cor: '#555', txt: e.acao };
                return (
                  <tr key={e.id}>
                    <td style={{ fontSize: 12, whiteSpace: 'nowrap' }}>{fmtDataHora(e.created_at)}</td>
                    <td style={{ fontSize: 12, fontWeight: 600 }}>{e.usuario || '—'}</td>
                    <td><span className="badge" style={{ background: b.bg, color: b.cor }}>{b.txt}</span></td>
                    <td style={{ fontSize: 11, textTransform: 'capitalize' }}>{e.entidade}</td>
                    <td style={{ fontSize: 13 }}>{e.descricao || '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div style={{ padding: '.6rem 1.3rem', fontSize: 11, color: 'var(--cinza-cl)' }}>
          {filtrados.length} registro(s) exibido(s). Os registros não podem ser apagados por usuários.
        </div>
      </div>
    </div>
  );
}
