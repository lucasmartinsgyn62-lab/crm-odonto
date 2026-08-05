import { useCRM } from '../context/CRMContext';
import Sidebar from '../components/admin/Sidebar';
import Dashboard from '../components/admin/Dashboard';
import Agenda from '../components/admin/Agenda';
import Clientes from '../components/admin/Clientes';
import ProntuarioInteligente from '../components/admin/ProntuarioInteligente';
import Orcamentos from '../components/admin/Orcamentos';
import Dentistas from '../components/admin/Dentistas';
import Origens from '../components/admin/Origens';
import Procedimentos from '../components/admin/Procedimentos';
import Relatorio from '../components/admin/Relatorio';
import Caixa from '../components/admin/Caixa';
import HistoricoCaixa from '../components/admin/HistoricoCaixa';
import Auditoria from '../components/admin/Auditoria';
import Seguranca from '../components/admin/Seguranca';
import Whatsapp from '../components/admin/Whatsapp';
import VendasPipeline from '../components/admin/VendasPipeline';
import ApiIntegracoes from '../components/admin/ApiIntegracoes';
import CentralWhatsapp from '../components/admin/CentralWhatsapp';
import Calendar from '../components/shared/Calendar';
import ProntuarioModal from '../components/modals/ProntuarioModal';
import CaixaModal from '../components/modals/CaixaModal';
import CaueChat from '../components/CaueChat';
import CaueApresentacao from '../components/CaueApresentacao';

const PANELS = {
  dashboard: Dashboard,
  agenda: Agenda,
  clientes: Clientes,
  prontuario: ProntuarioInteligente,
  orcamentos: Orcamentos,
  dentistas: Dentistas,
  origens: Origens,
  procedimentos: Procedimentos,
  relatorio: Relatorio,
  caixa: Caixa,
  'historico-caixa': HistoricoCaixa,
  auditoria: Auditoria,
  seguranca: Seguranca,
  whatsapp:  Whatsapp,
  pipeline:  VendasPipeline,
  api:       ApiIntegracoes,
  central:   CentralWhatsapp,
};

const PANEL_TITLES = {
  dashboard: 'Dashboard Diária',
  agenda: 'Agenda',
  clientes: 'Pacientes',
  prontuario: 'Prontuário Inteligente',
  orcamentos: 'Orçamentos',
  dentistas: 'Dentistas',
  origens: 'Origens',
  procedimentos: 'Procedimentos',
  relatorio: 'Relatórios',
  caixa: 'Fechamento de Caixa',
  'historico-caixa': 'Histórico de Caixa',
  auditoria: 'Trilha de Auditoria',
  seguranca: 'Segurança da Conta',
  whatsapp: 'WhatsApp & IA',
  pipeline: 'Vendas Pipeline',
  api: 'API & Integrações',
  central: 'Central WhatsApp',
};

// Uma frase embaixo do título dizendo, em português de gente, PARA QUE SERVE a
// tela. Vale para todas — o cliente nunca fica olhando uma tela sem saber o que é.
const PANEL_EXPLICACAO = {
  dashboard: 'O resumo de hoje: quem está marcado, quem já foi atendido e quanto entrou.',
  agenda: 'A agenda do dia. Escolha o dentista, clique na lupa e marque o paciente no horário.',
  clientes: 'Cadastro dos pacientes e a ficha de saúde de cada um.',
  prontuario: 'A boca do paciente: a radiografia em cima e o desenho dos dentes embaixo, para marcar o que vai ser tratado.',
  orcamentos: 'Os tratamentos que o dentista montou, prontos para você cobrar e agendar.',
  dentistas: 'Quem atende na clínica. Cada dentista tem a sua agenda.',
  origens: 'Por onde o paciente conheceu a clínica. É isso que alimenta o relatório de marketing.',
  procedimentos: 'A sua tabela de preços. Dá para importar a tabela do convênio por planilha.',
  relatorio: 'Como foi o mês: faturamento, faltas, origem dos pacientes e desempenho de cada dentista.',
  auditoria: 'Quem fez o quê no sistema, com data e hora.',
  caixa: 'O dinheiro que entrou hoje. Confira e feche o caixa no fim do expediente.',
  'historico-caixa': 'Os caixas que já foram fechados, dia por dia.',
  seguranca: 'Proteja a sua conta com a verificação em duas etapas.',
  whatsapp: 'Mensagens automáticas para confirmar consulta, cobrar e trazer paciente de volta.',
  pipeline: 'Os interessados que ainda não fecharam tratamento, do primeiro contato ao sim.',
  api: 'Ligue o CRM a outros sistemas (site, automações). Área técnica.',
  central: 'As conversas de WhatsApp da clínica, tudo em um lugar só.',
};

// Painéis restritos a admin — o menu esconde, mas isto garante mesmo se o
// activePanel for forçado por outro caminho (devtools, código futuro)
const ADMIN_ONLY_PANELS = ['api'];

export default function Admin() {
  const { activePanel, usuario } = useCRM();
  const bloqueado = ADMIN_ONLY_PANELS.includes(activePanel) && usuario?.role !== 'admin';
  const Panel = bloqueado ? Dashboard : (PANELS[activePanel] || Dashboard);
  const title = bloqueado ? 'Dashboard Diária' : (PANEL_TITLES[activePanel] || 'Dashboard');
  const explicacao = PANEL_EXPLICACAO[bloqueado ? 'dashboard' : activePanel];
  const isRec = usuario?.perfil === 'recepcao';

  return (
    <div className="adm-wrap">
      <Sidebar />
      <div className="adm-main">
        <div className="adm-top">
          <div>
            <h1 id="adm-title">{title}</h1>
            {explicacao && <p className="adm-sub">{explicacao}</p>}
          </div>
          <div className="top-r">
            <Calendar />
            <span style={{ fontSize: 12, color: 'var(--cinza)' }} id="top-perfil-label">
              {isRec ? 'Recepção' : 'CRM Odonto'}
            </span>
          </div>
        </div>
        <div className="adm-body">
          <Panel />
        </div>
      </div>
      <ProntuarioModal />
      <CaixaModal />
      {/* CAUÊ: apresentação ao entrar + chat flutuante com modo guia e ações */}
      <CaueApresentacao usuario={usuario} />
      <CaueChat />
    </div>
  );
}
