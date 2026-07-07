import { useState, useMemo, useRef } from 'react';
import { useCRM } from '../../context/CRMContext';

function loadXLSX() {
  return new Promise((resolve, reject) => {
    if (window.XLSX) { resolve(window.XLSX); return; }
    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/xlsx/dist/xlsx.full.min.js';
    s.onload  = () => resolve(window.XLSX);
    s.onerror = reject;
    document.head.appendChild(s);
  });
}

const fmtR = v => `R$ ${(parseFloat(v) || 0).toFixed(2)}`;

// Paleta fixa de 20 cores básicas
const CORES_20 = [
  '#E53935', '#D81B60', '#8E24AA', '#5E35B1', '#3949AB',
  '#1E88E5', '#039BE5', '#00ACC1', '#00897B', '#43A047',
  '#7CB342', '#C0CA33', '#FDD835', '#FFB300', '#FB8C00',
  '#F4511E', '#6D4C41', '#757575', '#546E7A', '#212121',
];

function PaletaCores({ value, onChange, allowClear }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, maxWidth: 240, alignItems: 'center' }}>
      {CORES_20.map(c => (
        <span
          key={c}
          onClick={() => onChange(c)}
          title={c}
          style={{
            width: 18, height: 18, borderRadius: 5, background: c, cursor: 'pointer',
            border: value === c ? '2.5px solid #111' : '1.5px solid rgba(0,0,0,.15)',
            boxSizing: 'border-box',
          }}
        />
      ))}
      {allowClear && (
        <span
          onClick={() => onChange('')}
          title="Sem cor"
          style={{
            width: 18, height: 18, borderRadius: 5, background: '#fff', cursor: 'pointer',
            border: !value ? '2.5px solid #111' : '1.5px solid rgba(0,0,0,.2)',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 10, color: '#c00', fontWeight: 700, boxSizing: 'border-box',
          }}
        >✕</span>
      )}
    </div>
  );
}

export default function Procedimentos() {
  const { state, dispatch, showToast } = useCRM();
  const procs = state.procedimentos;

  const [busca, setBusca]       = useState('');
  const [novo, setNovo]         = useState({ nome: '', valor: '', cor: '' });
  const [editId, setEditId]     = useState(null);
  const [editRow, setEditRow]   = useState({ nome: '', valor: '', cor: '' });
  const [showImport, setShowImport] = useState(false);
  const [convNome, setConvNome] = useState('');
  const [convCor, setConvCor]   = useState('#8E24AA');
  const [importando, setImportando] = useState(false);
  const fileRef = useRef(null);

  const isLocal = procs.some(p => p._local);

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (!q) return procs;
    return procs.filter(p =>
      p.nome.toLowerCase().includes(q) || (p.convenio || '').toLowerCase().includes(q)
    );
  }, [procs, busca]);

  async function addNovo() {
    const nome = novo.nome.trim();
    const valor = parseFloat(String(novo.valor).replace(',', '.'));
    if (!nome) { showToast('Informe o nome do procedimento', 'warning'); return; }
    if (isNaN(valor) || valor < 0) { showToast('Informe um valor válido', 'warning'); return; }
    if (procs.some(p => p.nome.toLowerCase() === nome.toLowerCase())) {
      showToast('Já existe um procedimento com esse nome', 'warning'); return;
    }
    const r = await dispatch({ type: 'ADD_PROCEDIMENTO', payload: { nome, valor, cor: novo.cor || null, convenio: null } });
    if (r?.error) { showToast('Erro ao salvar: ' + r.error.message, 'error'); return; }
    setNovo({ nome: '', valor: '', cor: '' });
    showToast('Procedimento cadastrado!');
  }

  function startEdit(p) {
    setEditId(p.id);
    setEditRow({ nome: p.nome, valor: p.valor, cor: p.cor || '' });
  }

  async function saveEdit(p) {
    const nome = editRow.nome.trim();
    const valor = parseFloat(String(editRow.valor).replace(',', '.'));
    if (!nome || isNaN(valor)) { showToast('Nome e valor válidos são obrigatórios', 'warning'); return; }
    await dispatch({
      type: 'UPDATE_PROCEDIMENTO',
      payload: { id: p.id, nome, valor, cor: editRow.cor || null },
    });
    setEditId(null);
    showToast('Procedimento atualizado!');
  }

  async function remover(p) {
    if (!window.confirm(`Excluir "${p.nome}"?`)) return;
    await dispatch({ type: 'DELETE_PROCEDIMENTO', payload: p.id });
    showToast('Procedimento excluído');
  }

  async function importarXLS(file) {
    const conv = convNome.trim().toUpperCase();
    if (!conv) { showToast('Informe o nome do convênio antes de importar', 'warning'); return; }
    setImportando(true);
    try {
      const XLSX = await loadXLSX();
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf);
      const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);

      const parseValor = v => {
        if (typeof v === 'number') return v;
        let s = String(v).replace(/[R$\s]/g, '');
        if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.'); // 1.234,56 → 1234.56
        return parseFloat(s);
      };
      const parsed = rows.map(r => {
        const keys = Object.keys(r);
        const find = re => r[keys.find(k => re.test(k)) ?? ''] ?? '';
        const nome  = String(find(/nome|procedimento|descri/i)).trim();
        const valor = parseValor(find(/valor|pre[cç]o|price/i));
        return { nome, valor };
      }).filter(r => r.nome && !isNaN(r.valor));

      if (parsed.length === 0) {
        showToast('Nenhuma linha válida — a planilha precisa das colunas "Nome procedimento" e "Valor"', 'error');
        setImportando(false);
        return;
      }

      const payload = parsed.map(r => ({
        nome: `${conv} — ${r.nome}`,
        valor: r.valor,
        cor: convCor,
        convenio: conv,
      }));

      const r = await dispatch({ type: 'IMPORT_PROCEDIMENTOS', payload });
      if (r?.error) { showToast('Erro na importação: ' + r.error.message, 'error'); setImportando(false); return; }
      showToast(`${payload.length} procedimentos do convênio ${conv} importados!`);
      setShowImport(false);
      setConvNome('');
    } catch (e) {
      showToast('Falha ao ler a planilha: ' + e.message, 'error');
    }
    setImportando(false);
    if (fileRef.current) fileRef.current.value = '';
  }

  return (
    <div>
      {isLocal && (
        <div style={{ background: '#FFF6E5', border: '1px solid #F0C36D', borderRadius: 8, padding: '.7rem 1rem', marginBottom: '1rem', fontSize: 12, color: '#8a6d3b' }}>
          ⚠️ A tabela <code>procedimentos</code> ainda não existe no banco — exibindo a lista padrão (edições não serão salvas). Rode a migração no Supabase.
        </div>
      )}

      {/* Cadastro rápido */}
      <div className="tc">
        <div className="th"><h3>Novo Procedimento</h3></div>
        <div style={{ display: 'flex', gap: '.6rem', padding: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <input className="inf" style={{ flex: 2, minWidth: 220 }} placeholder="Nome do procedimento"
                 value={novo.nome} onChange={e => setNovo({ ...novo, nome: e.target.value })} />
          <input className="inf" style={{ width: 120 }} placeholder="Valor (R$)" inputMode="decimal"
                 value={novo.valor} onChange={e => setNovo({ ...novo, valor: e.target.value })} />
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--cinza)' }}>
            Cor:
            <PaletaCores value={novo.cor} onChange={cor => setNovo({ ...novo, cor })} allowClear />
          </label>
          <button className="btsv" onClick={addNovo}>+ Cadastrar</button>
          <button className="btsv" style={{ background: '#7C3AED' }} onClick={() => setShowImport(true)}>
            📥 Importar convênio (XLS)
          </button>
        </div>
      </div>

      {/* Lista */}
      <div className="tc">
        <div className="th">
          <h3>Procedimentos ({filtrados.length})</h3>
          <div className="th-r" style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <i className="ti ti-search" style={{ color: 'var(--v2)', fontSize: 14 }}></i>
            <input className="inf" style={{ width: 220 }} placeholder="Pesquisar procedimento..."
                   value={busca} onChange={e => setBusca(e.target.value)} />
          </div>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className="tbl">
            <thead>
              <tr><th style={{width:36}}></th><th>PROCEDIMENTO</th><th>CONVÊNIO</th><th style={{width:130}}>VALOR</th><th style={{width:170}}>AÇÕES</th></tr>
            </thead>
            <tbody>
              {filtrados.map(p => (
                <tr key={p.id} style={p.cor ? { background: `${p.cor}18` } : undefined}>
                  <td style={editId === p.id ? { minWidth: 250 } : undefined}>
                    {editId === p.id ? (
                      <PaletaCores value={editRow.cor} onChange={cor => setEditRow({ ...editRow, cor })} allowClear />
                    ) : (
                      <span title={p.cor || 'sem cor'} style={{
                        display: 'inline-block', width: 14, height: 14, borderRadius: 4,
                        background: p.cor || '#e8e8e8', border: '1px solid rgba(0,0,0,.12)',
                      }} />
                    )}
                  </td>
                  <td>
                    {editId === p.id ? (
                      <input className="inf" style={{ width: '100%' }} value={editRow.nome}
                             onChange={e => setEditRow({ ...editRow, nome: e.target.value })} />
                    ) : (
                      <span style={{ fontWeight: p.convenio ? 600 : 400 }}>{p.nome}</span>
                    )}
                  </td>
                  <td style={{ fontSize: 11 }}>
                    {p.convenio
                      ? <span className="badge" style={{ background: p.cor || '#7C3AED', color: '#fff' }}>{p.convenio}</span>
                      : <span style={{ color: '#bbb' }}>particular</span>}
                  </td>
                  <td style={{ fontWeight: 700, color: 'var(--v2)', whiteSpace: 'nowrap' }}>
                    {editId === p.id ? (
                      <input className="inf" style={{ width: 100 }} inputMode="decimal" value={editRow.valor}
                             onChange={e => setEditRow({ ...editRow, valor: e.target.value })} />
                    ) : fmtR(p.valor)}
                  </td>
                  <td>
                    {editId === p.id ? (
                      <>
                        <button className="btn-pront" style={{ background: 'var(--v2)', color: '#fff' }} onClick={() => saveEdit(p)}>Salvar</button>{' '}
                        <button className="btn-pront" onClick={() => setEditId(null)}>Cancelar</button>
                        {editRow.cor && (
                          <>{' '}<button className="btn-pront" onClick={() => setEditRow({ ...editRow, cor: '' })}>sem cor</button></>
                        )}
                      </>
                    ) : (
                      <>
                        <button className="btn-pront" onClick={() => startEdit(p)}><i className="ti ti-pencil"></i> Editar</button>{' '}
                        <button className="btn-pront" style={{ color: '#c0392b' }} onClick={() => remover(p)}><i className="ti ti-trash"></i></button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
              {filtrados.length === 0 && <tr><td colSpan={5} style={{ textAlign: 'center', color: '#bbb', padding: '1.2rem' }}>Nenhum procedimento encontrado</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal importação convênio */}
      {showImport && (
        <div className="mpront-ov" onClick={e => { if (e.target === e.currentTarget) setShowImport(false); }}>
          <div style={{ background: '#fff', borderRadius: 14, padding: '1.6rem', width: 440, maxWidth: '94vw', marginTop: '8vh' }}>
            <h3 style={{ marginBottom: 4 }}>📥 Importar tabela de convênio</h3>
            <p style={{ fontSize: 12, color: 'var(--cinza)', marginBottom: '1rem' }}>
              Planilha .xls/.xlsx com as colunas <strong>Nome procedimento</strong> e <strong>Valor</strong>.
              Cada item entra como "<strong>{convNome.trim().toUpperCase() || 'CONVÊNIO'}</strong> — nome" com a cor escolhida.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '.7rem' }}>
              <input className="inf" placeholder="Nome do convênio (ex: AMIL)" value={convNome}
                     onChange={e => setConvNome(e.target.value)} autoFocus />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13 }}>
                <span>Cor do convênio: <span className="badge" style={{ background: convCor, color: '#fff' }}>{convNome.trim().toUpperCase() || 'PRÉVIA'}</span></span>
                <PaletaCores value={convCor} onChange={setConvCor} />
              </div>
              <input ref={fileRef} type="file" accept=".xls,.xlsx" className="inf"
                     onChange={e => { if (e.target.files?.[0]) importarXLS(e.target.files[0]); }} />
              {importando && <span style={{ fontSize: 12, color: 'var(--v2)' }}>Importando…</span>}
              <button className="btn-pront" onClick={() => setShowImport(false)}>Fechar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
