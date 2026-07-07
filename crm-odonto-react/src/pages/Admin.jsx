import { useCRM } from '../context/CRMContext';
import Sidebar from '../components/admin/Sidebar';
import Dashboard from '../components/admin/Dashboard';
import Agenda from '../components/admin/Agenda';
import Clientes from '../components/admin/Clientes';
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
import Calendar from '../components/shared/Calendar';
import ProntuarioModal from '../components/modals/ProntuarioModal';
import CaixaModal from '../components/modals/CaixaModal';

const PANELS = {
  dashboard: Dashboard,
  agenda: Agenda,
  clientes: Clientes,
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
};

const PANEL_TITLES = {
  dashboard: 'Dashboard Diária',
  agenda: 'Agenda',
  clientes: 'Pacientes',
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
};

export default function Admin() {
  const { activePanel, usuario } = useCRM();
  const Panel = PANELS[activePanel] || Dashboard;
  const title = PANEL_TITLES[activePanel] || 'Dashboard';
  const isRec = usuario?.perfil === 'recepcao';

  return (
    <div className="adm-wrap">
      <Sidebar />
      <div className="adm-main">
        <div className="adm-top">
          <h1 id="adm-title">{title}</h1>
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
    </div>
  );
}
