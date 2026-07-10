// Documentação pública da API v1 do AvancerCRM — /api-docs
// Página estática, sem login: é ela que o cliente entrega ao integrador.
const BASE = 'https://avancercrm.com.br/api/v1';

const S = {
  page: { background: '#0d0d14', minHeight: '100vh', color: '#e5e2f0', fontFamily: 'Inter, sans-serif', padding: '2.5rem 1rem' },
  wrap: { maxWidth: 880, margin: '0 auto' },
  h1: { fontSize: 30, fontWeight: 800, marginBottom: 4, background: 'linear-gradient(90deg,#a78bfa,#7c3aed)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' },
  h2: { fontSize: 20, fontWeight: 800, margin: '2.4rem 0 .6rem', color: '#c4b5fd' },
  h3: { fontSize: 15, fontWeight: 700, margin: '1.4rem 0 .4rem', color: '#a78bfa' },
  p: { fontSize: 14, lineHeight: 1.8, color: '#b9b4cc' },
  code: { background: '#1a1a26', border: '1px solid #2c2c3d', borderRadius: 6, padding: '2px 7px', fontSize: 12.5, fontFamily: 'ui-monospace, monospace', color: '#c4b5fd' },
  pre: { background: '#12121c', border: '1px solid #2c2c3d', borderRadius: 10, padding: '1rem 1.2rem', fontSize: 12.5, fontFamily: 'ui-monospace, monospace', lineHeight: 1.7, overflowX: 'auto', color: '#cdd6f4', whiteSpace: 'pre', margin: '.6rem 0 1.2rem' },
  tag: m => ({ display: 'inline-block', minWidth: 52, textAlign: 'center', fontWeight: 800, fontSize: 11, borderRadius: 6, padding: '2px 8px', marginRight: 8, background: { GET: '#14532d', POST: '#1e3a8a', PATCH: '#713f12', PUT: '#5b21b6', DELETE: '#7f1d1d' }[m], color: '#fff' }),
  row: { display: 'flex', alignItems: 'center', gap: 4, margin: '.9rem 0 .2rem', fontFamily: 'ui-monospace, monospace', fontSize: 13.5, fontWeight: 700, flexWrap: 'wrap' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 13, margin: '.5rem 0 1rem' },
  th: { textAlign: 'left', padding: '.45rem .6rem', borderBottom: '1px solid #2c2c3d', color: '#a78bfa', fontWeight: 700 },
  td: { padding: '.45rem .6rem', borderBottom: '1px solid #1f1f2e', color: '#b9b4cc', verticalAlign: 'top' },
};

function Ep({ m, path, children }) {
  return (
    <>
      <div style={S.row}><span style={S.tag(m)}>{m}</span><span>{path}</span></div>
      <div style={{ ...S.p, marginLeft: 2 }}>{children}</div>
    </>
  );
}

export default function ApiDocs() {
  return (
    <div style={S.page}>
      <div style={S.wrap}>
        <h1 style={S.h1}>AvancerCRM — API Pública v1</h1>
        <p style={S.p}>Integre disparos de WhatsApp, automações (n8n, Make, Zapier) e sites de captação diretamente ao funil de vendas do CRM.</p>

        <h2 style={S.h2}>Autenticação</h2>
        <p style={S.p}>Toda requisição leva a chave de API (fornecida pelo dono da conta no CRM, em <em>API &amp; Integrações</em>) no header:</p>
        <pre style={S.pre}>{`Authorization: Bearer avancer_live_xxxxxxxxxxxxxxxx`}</pre>
        <p style={S.p}>URL base: <code style={S.code}>{BASE}</code>. Respostas em JSON. Erros vêm como <code style={S.code}>{`{ "error": { "code", "message" } }`}</code>. Chaves podem ser <em>somente leitura</em> (métodos de escrita retornam 403).</p>
        <pre style={S.pre}>{`# Teste rápido
curl ${BASE}/ping -H "Authorization: Bearer SUA_CHAVE"`}</pre>

        <h2 style={S.h2}>Etapas do funil (Kanban)</h2>
        <Ep m="GET" path="/stages">Lista as etapas do funil do cliente (id, nome, cor, ordem). Use o <code style={S.code}>id</code> para criar ou mover leads.</Ep>

        <h2 style={S.h2}>Leads</h2>
        <Ep m="GET" path="/leads">Lista leads. Filtros: <code style={S.code}>?stage_id=</code>, <code style={S.code}>?telefone=</code>, <code style={S.code}>?search=</code> (nome), paginação <code style={S.code}>?limit=&amp;offset=</code> (máx. 200).</Ep>
        <Ep m="POST" path="/leads">Cria um lead no funil. Sem etapa informada, entra na coluna LEADS. Com <code style={S.code}>?skip_duplicates=true</code>, telefone já existente não duplica.</Ep>
        <pre style={S.pre}>{`curl -X POST ${BASE}/leads \\
  -H "Authorization: Bearer SUA_CHAVE" \\
  -H "Content-Type: application/json" \\
  -d '{
    "nome": "Maria Silva",
    "telefone": "5562999990000",
    "email": "maria@email.com",
    "valor": 1500,
    "origem": "Instagram",
    "anotacoes": "Veio do anúncio de lentes",
    "stage_nome": "LEADS"
  }'`}</pre>
        <table style={S.table}>
          <thead><tr><th style={S.th}>Campo</th><th style={S.th}>Tipo</th><th style={S.th}>Obs</th></tr></thead>
          <tbody>
            <tr><td style={S.td}>nome</td><td style={S.td}>string</td><td style={S.td}>obrigatório</td></tr>
            <tr><td style={S.td}>telefone</td><td style={S.td}>string</td><td style={S.td}>só dígitos, com DDI (5562…)</td></tr>
            <tr><td style={S.td}>email, origem, responsavel, anotacoes</td><td style={S.td}>string</td><td style={S.td}>opcionais</td></tr>
            <tr><td style={S.td}>valor</td><td style={S.td}>number</td><td style={S.td}>valor do negócio em R$</td></tr>
            <tr><td style={S.td}>stage_id / stage_nome</td><td style={S.td}>string</td><td style={S.td}>etapa inicial (opcional; stage_nome aceita busca parcial)</td></tr>
          </tbody>
        </table>
        <Ep m="GET" path="/leads/:id">Busca um lead pelo id.</Ep>
        <Ep m="PATCH" path="/leads/:id">Atualiza campos do lead (mesmos campos do POST, exceto etapa).</Ep>
        <Ep m="PUT" path="/leads/:id/stage">Move o lead de etapa no Kanban. Corpo: <code style={S.code}>{`{ "stage_id": "..." }`}</code> ou <code style={S.code}>{`{ "stage_nome": "PROPOSTA" }`}</code>.</Ep>
        <Ep m="DELETE" path="/leads/:id">Exclui o lead.</Ep>

        <h2 style={S.h2}>Contatos (pacientes)</h2>
        <Ep m="GET" path="/contacts">Lista os pacientes/contatos do CRM (somente leitura). Filtros: <code style={S.code}>?search=</code>, <code style={S.code}>?limit=&amp;offset=</code>.</Ep>

        <h2 style={S.h2}>Webhooks (avisos em tempo real)</h2>
        <p style={S.p}>O CRM envia um <code style={S.code}>POST</code> para a URL cadastrada quando algo acontece no funil — ideal para acionar o disparo de WhatsApp na hora em que o lead entra na etapa configurada. Cadastre pela tela <em>API &amp; Integrações</em> ou pela própria API:</p>
        <Ep m="GET" path="/webhooks">Lista os webhooks cadastrados.</Ep>
        <Ep m="POST" path="/webhooks">Cadastra. Corpo: <code style={S.code}>{`{ "url": "https://...", "eventos": ["lead.created","lead.stage_changed"], "descricao": "..." }`}</code>. A resposta traz o <code style={S.code}>secret</code> <strong>uma única vez</strong>.</Ep>
        <Ep m="DELETE" path="/webhooks/:id">Remove o webhook.</Ep>

        <h3 style={S.h3}>Eventos disponíveis</h3>
        <table style={S.table}>
          <thead><tr><th style={S.th}>Evento</th><th style={S.th}>Quando dispara</th></tr></thead>
          <tbody>
            <tr><td style={S.td}>lead.created</td><td style={S.td}>lead novo entrou no funil (pela API ou pela tela)</td></tr>
            <tr><td style={S.td}>lead.updated</td><td style={S.td}>dados do lead alterados</td></tr>
            <tr><td style={S.td}>lead.stage_changed</td><td style={S.td}>lead movido de etapa (arrastado no Kanban ou via API)</td></tr>
            <tr><td style={S.td}>lead.deleted</td><td style={S.td}>lead excluído</td></tr>
            <tr><td style={S.td}>webhook.test</td><td style={S.td}>teste manual disparado pela tela do CRM</td></tr>
          </tbody>
        </table>

        <h3 style={S.h3}>Formato do aviso</h3>
        <pre style={S.pre}>{`POST (sua URL)
X-Avancer-Event: lead.stage_changed
X-Avancer-Signature: sha256=hex(HMAC-SHA256(secret, corpo))
X-Avancer-Delivery: <uuid da entrega>

{
  "event": "lead.stage_changed",
  "created_at": "2026-07-09T14:22:00Z",
  "data": {
    "id": "…",
    "nome": "Maria Silva",
    "telefone": "5562999990000",
    "valor": 1500,
    "coluna_id": "…",
    "stage_nome": "💰 PROPOSTA ENVIADA",
    "stage_anterior_id": "…",
    "stage_anterior_nome": "📞 CONTATO FEITO"
  }
}`}</pre>
        <p style={S.p}>Valide a assinatura calculando o HMAC-SHA256 do corpo bruto com o secret e comparando com o header. Responda <code style={S.code}>2xx</code> em até 8s; caso contrário reenviamos até 5 vezes com backoff crescente (a partir de 1min, 5min, 30min, 2h, 6h — a fila de reenvio é processada a cada 5 minutos). Webhooks pausados não perdem eventos: eles ficam na fila e são entregues quando você reativar.</p>

        <h3 style={S.h3}>Exemplo: validar assinatura (Node.js)</h3>
        <pre style={S.pre}>{`const crypto = require('crypto');
app.post('/webhook/avancer', express.raw({ type: '*/*' }), (req, res) => {
  const esperado = 'sha256=' + crypto.createHmac('sha256', process.env.AVANCER_SECRET)
    .update(req.body).digest('hex');
  if (req.headers['x-avancer-signature'] !== esperado) return res.status(401).end();
  const evento = JSON.parse(req.body);
  // ... dispara o WhatsApp, atualiza planilha, etc.
  res.status(200).end();
});`}</pre>

        <h2 style={S.h2}>Receita pronta: disparo de WhatsApp por etapa</h2>
        <p style={S.p}>1. Cadastre um webhook com o evento <code style={S.code}>lead.stage_changed</code> apontando para o seu n8n/Make/sistema.<br />
        2. No fluxo, filtre por <code style={S.code}>data.stage_nome</code> igual à etapa desejada.<br />
        3. Dispare o template aprovado da Meta usando <code style={S.code}>data.telefone</code>.<br />
        4. Se quiser mover o lead após o disparo, chame <code style={S.code}>PUT /leads/:id/stage</code>.</p>

        <p style={{ ...S.p, marginTop: '2.5rem', borderTop: '1px solid #2c2c3d', paddingTop: '1.2rem', fontSize: 12.5 }}>
          AvancerCRM Soluções Digitais · Suporte: <a href="https://wa.me/5562981949053" style={{ color: '#a78bfa' }}>WhatsApp</a>
        </p>
      </div>
    </div>
  );
}
