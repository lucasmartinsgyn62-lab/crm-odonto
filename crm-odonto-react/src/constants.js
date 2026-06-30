export const STATUS_LIST = [
  'AGENDADO','AGENDADO AVALIAÇÃO','CONFIRMADO','CONFIRMADO AVALIAÇÃO',
  'AGUARDANDO','RECEPÇÃO','EM ATENDIMENTO','ATENDIDO',
  'AVALIAÇÃO','FALTOU SEM AVISO','FALTOU COM AVISO','REAGENDOU'
];

export const STATUS_BADGE = {
  'AGENDADO':'b-agendado','AGENDADO AVALIAÇÃO':'b-agendado-av',
  'CONFIRMADO':'b-confirmado','CONFIRMADO AVALIAÇÃO':'b-confirmado-av',
  'AGUARDANDO':'b-agu','RECEPÇÃO':'b-rec','EM ATENDIMENTO':'b-atm',
  'ATENDIDO':'b-fin','FINALIZADO':'b-fin',
  'FALTOU SEM AVISO':'b-flt','FALTOU COM AVISO':'b-flt',
  'REAGENDOU':'b-re','AVALIAÇÃO':'b-aval'
};

// retrocompatibilidade: dados antigos salvos como "FINALIZADO" tratados igual a "ATENDIDO"
export const isAtendido = (st) => st === 'ATENDIDO' || st === 'FINALIZADO';
export const normStatus = (st) => (st === 'FINALIZADO' ? 'ATENDIDO' : st);

export const NEG_LIST = ['SEM DESCONTO','DESCONTO %','PACOTE FECHADO','CORTESIA','PERMUTA'];
export const TIPO_LIST = ['NOVO','RETORNO'];
export const ORIGENS_DEF = [
  'Instagram','Indicação de amigo','Google','Facebook',
  'TikTok','Panfleto/Outdoor','Passou na frente','Outros'
];

export const AREAS_LIST = [
  'Consulta Odontológica','Avaliação Completa','Limpeza (Profilaxia)','Aplicação de Flúor',
  'Raspagem Periodontal','Clareamento Dental Caseiro','Clareamento Dental em Consultório',
  'Clareamento Interno','Restauração em Resina','Restauração Estética','Faceta em Resina',
  'Faceta em Porcelana','Lente de Contato Dental','Tratamento de Canal (Incisivo)',
  'Tratamento de Canal (Pré-Molar)','Tratamento de Canal (Molar)','Retratamento de Canal',
  'Extração Simples','Extração de Siso Simples','Extração de Siso Incluso','Frenectomia',
  'Biópsia Bucal','Gengivoplastia','Enxerto Gengival','Cirurgia Periodontal',
  'Implante Dentário Unitário','Coroa sobre Implante','Prótese Protocolo','Enxerto Ósseo',
  'Levantamento de Seio Maxilar','Coroa Metálica','Coroa em Porcelana','Coroa em Zircônia',
  'Ponte Fixa (por elemento)','Prótese Parcial Removível','Prótese Total (Dentadura)',
  'Prótese Flexível','Aparelho Metálico Convencional','Manutenção Ortodôntica',
  'Aparelho Estético','Alinhadores Transparentes','Contenção Ortodôntica','Placa de Bruxismo',
  'Radiografia Periapical','Radiografia Panorâmica','Tomografia Odontológica',
  'Escaneamento Intraoral','Toxina Botulínica (Botox)','Preenchimento Labial',
  'Bioestimulador de Colágeno','Bichectomia','Lipo de Papada Enzimática','Laserterapia',
  'Atendimento de Urgência','Selante Dentário','Pino de Fibra de Vidro','Núcleo Metálico Fundido',
  'Remoção de Tártaro','Ajuste Oclusal','Placa Clareadora','Reembasamento de Prótese',
  'Conserto de Prótese','Exodontia de Raiz Residual','Ulectomia','Ulotomia',
  'Exposição de Dente Incluso','Tração Ortodôntica','Odontopediatria (Consulta Infantil)',
  'Tratamento Restaurador Atraumático (ART)','Pulpotomia','Pulpectomia','Mantenedor de Espaço',
  'Aplicação de Cariostático','Remineralização Dental','Cirurgia de Freio Labial',
  'Cirurgia de Freio Lingual','Enxerto de Tecido Conjuntivo','Aumento de Coroa Clínica',
  'Prótese Provisória','Coroa Provisória','Mockup Estético','Planejamento Digital do Sorriso',
  'Escultura Dental em Resina','Fechamento de Diastema em Resina','Recimentação de Coroa',
  'Recimentação de Faceta','Recimentação de Prótese','Ajuste de Prótese',
  'Documentação Ortodôntica Completa','Fotografia Odontológica','Perícia Odontológica',
  'Laudo Odontológico','Sedação Consciente','Sedação com Óxido Nitroso','Atendimento Domiciliar',
  'Consulta de Avaliação para Implantes','Consulta de Harmonização Facial',
  'Microagulhamento Facial','Peeling Químico Facial','Fios de Sustentação Facial',
  'Rinomodelação','Preenchimento de Malar','Preenchimento de Mandíbula','Preenchimento de Mento',
  'Preenchimento de Olheiras','Aplicação de Enzimas Faciais','Jato de Bicarbonato',
  'Dessensibilização Dentária','Remoção de Faceta','Remoção de Aparelho Ortodôntico',
  'Instalação de Contenção','Consulta de Retorno','Avaliação de ATM','Tratamento para DTM',
  'Placa Miorrelaxante','Teste de Vitalidade Pulpar','Controle de Placa Bacteriana',
  'Aplicação de Verniz Fluoretado','Cirurgia Parendodôntica','Apicectomia',
  'Hemissecção Dentária','Odontossecção','Tratamento de Periimplantite','Manutenção de Implante',
  'Carga Imediata em Implante','Prótese Overdenture','Prótese Tipo Protocolo Superior e Inferior',
  'Documentação para Alinhadores','Escaneamento para Alinhadores',
  'Instalação de Mini-Implante Ortodôntico','Remoção de Mini-Implante Ortodôntico'
];

export const AREAS_PRECOS = {
  'Consulta Odontológica':100,'Avaliação Completa':150,'Limpeza (Profilaxia)':150,
  'Aplicação de Flúor':50,'Raspagem Periodontal':300,'Clareamento Dental Caseiro':600,
  'Clareamento Dental em Consultório':800,'Clareamento Interno':500,'Restauração em Resina':150,
  'Restauração Estética':250,'Faceta em Resina':500,'Faceta em Porcelana':1200,
  'Lente de Contato Dental':1500,'Tratamento de Canal (Incisivo)':600,
  'Tratamento de Canal (Pré-Molar)':800,'Tratamento de Canal (Molar)':1000,
  'Retratamento de Canal':1500,'Extração Simples':150,'Extração de Siso Simples':300,
  'Extração de Siso Incluso':800,'Frenectomia':500,'Biópsia Bucal':500,'Gengivoplastia':800,
  'Enxerto Gengival':1500,'Cirurgia Periodontal':1000,'Implante Dentário Unitário':2000,
  'Coroa sobre Implante':1500,'Prótese Protocolo':12000,'Enxerto Ósseo':1500,
  'Levantamento de Seio Maxilar':3000,'Coroa Metálica':800,'Coroa em Porcelana':1500,
  'Coroa em Zircônia':2000,'Ponte Fixa (por elemento)':1200,'Prótese Parcial Removível':1000,
  'Prótese Total (Dentadura)':1200,'Prótese Flexível':1500,'Aparelho Metálico Convencional':2000,
  'Manutenção Ortodôntica':80,'Aparelho Estético':3000,'Alinhadores Transparentes':5000,
  'Contenção Ortodôntica':300,'Placa de Bruxismo':500,'Radiografia Periapical':30,
  'Radiografia Panorâmica':80,'Tomografia Odontológica':250,'Escaneamento Intraoral':150,
  'Toxina Botulínica (Botox)':800,'Preenchimento Labial':1000,'Bioestimulador de Colágeno':1500,
  'Bichectomia':2000,'Lipo de Papada Enzimática':1000,'Laserterapia':100,
  'Atendimento de Urgência':200,'Selante Dentário':80,'Pino de Fibra de Vidro':250,
  'Núcleo Metálico Fundido':400,'Remoção de Tártaro':150,'Ajuste Oclusal':150,
  'Placa Clareadora':250,'Reembasamento de Prótese':300,'Conserto de Prótese':200,
  'Exodontia de Raiz Residual':250,'Ulectomia':300,'Ulotomia':300,
  'Exposição de Dente Incluso':500,'Tração Ortodôntica':800,
  'Odontopediatria (Consulta Infantil)':100,'Tratamento Restaurador Atraumático (ART)':100,
  'Pulpotomia':250,'Pulpectomia':350,'Mantenedor de Espaço':500,'Aplicação de Cariostático':80,
  'Remineralização Dental':120,'Cirurgia de Freio Labial':500,'Cirurgia de Freio Lingual':500,
  'Enxerto de Tecido Conjuntivo':1500,'Aumento de Coroa Clínica':800,'Prótese Provisória':300,
  'Coroa Provisória':250,'Mockup Estético':300,'Planejamento Digital do Sorriso':500,
  'Escultura Dental em Resina':300,'Fechamento de Diastema em Resina':350,
  'Recimentação de Coroa':150,'Recimentação de Faceta':200,'Recimentação de Prótese':200,
  'Ajuste de Prótese':100,'Documentação Ortodôntica Completa':250,'Fotografia Odontológica':100,
  'Perícia Odontológica':500,'Laudo Odontológico':200,'Sedação Consciente':500,
  'Sedação com Óxido Nitroso':800,'Atendimento Domiciliar':300,
  'Consulta de Avaliação para Implantes':150,'Consulta de Harmonização Facial':150,
  'Microagulhamento Facial':600,'Peeling Químico Facial':400,'Fios de Sustentação Facial':2000,
  'Rinomodelação':1500,'Preenchimento de Malar':1500,'Preenchimento de Mandíbula':2000,
  'Preenchimento de Mento':1500,'Preenchimento de Olheiras':1200,
  'Aplicação de Enzimas Faciais':500,'Jato de Bicarbonato':100,'Dessensibilização Dentária':120,
  'Remoção de Faceta':300,'Remoção de Aparelho Ortodôntico':300,'Instalação de Contenção':300,
  'Consulta de Retorno':50,'Avaliação de ATM':250,'Tratamento para DTM':500,
  'Placa Miorrelaxante':600,'Teste de Vitalidade Pulpar':80,'Controle de Placa Bacteriana':100,
  'Aplicação de Verniz Fluoretado':80,'Cirurgia Parendodôntica':1500,'Apicectomia':1200,
  'Hemissecção Dentária':1000,'Odontossecção':800,'Tratamento de Periimplantite':800,
  'Manutenção de Implante':200,'Carga Imediata em Implante':2500,'Prótese Overdenture':6000,
  'Prótese Tipo Protocolo Superior e Inferior':24000,'Documentação para Alinhadores':500,
  'Escaneamento para Alinhadores':300,'Instalação de Mini-Implante Ortodôntico':800,
  'Remoção de Mini-Implante Ortodôntico':300
};

function gerarHorarios() {
  const h = [];
  for (let hora = 8; hora <= 20; hora++) {
    for (let min = 0; min < 60; min += 30) {
      if (hora === 20 && min > 0) break;
      h.push(`${String(hora).padStart(2,'0')}:${String(min).padStart(2,'0')}`);
    }
  }
  return h;
}

export const DURACOES = [
  { value: 30,  label: '30 min' },
  { value: 60,  label: '1h' },
  { value: 90,  label: '1h30' },
  { value: 120, label: '2h' },
  { value: 150, label: '2h30' },
  { value: 180, label: '3h' },
];
export const HORARIOS = gerarHorarios();

export const STORAGE_KEY = 'harmony_v4';
export const USERS_KEY = 'crm_usuarios';

export const DEFAULT_USERS = [
  { usuario: 'admin', senha: 'admin123', nome: 'Administrador', perfil: 'administrador' },
  { usuario: 'rec', senha: 'rec123', nome: 'Recepcionista', perfil: 'recepcao' }
];

export const DEFAULT_DENTISTAS = [
  { id: 1, nome: 'FULANO', esp: 'Clínico Geral', cro: 'CRO-GO 11111', tel: '(62) 9 1111-1111' },
  { id: 2, nome: 'BELTRANO', esp: 'Ortodontia', cro: 'CRO-GO 22222', tel: '(62) 9 2222-2222' }
];
