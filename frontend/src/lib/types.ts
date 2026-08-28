export type Role = "USUARIO" | "COLABORADOR" | "GESTOR";
export type RequestStatus = "ABERTO" | "EM_ANDAMENTO" | "FINALIZADO";

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  setor: string;
  loja: string;
}

export interface RequestType {
  id: string;
  name: string;
  slug: string;
  slaBusinessDays: number;
  active: boolean;
}

export interface Attachment {
  id: string;
  requestId: string;
  interactionId: string | null;
  uploadedById: string;
  fileName: string;
  storageKey: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
  fileUrl?: string;
}

export interface RequestInteraction {
  id: string;
  requestId: string;
  authorId: string;
  author: { id: string; name: string };
  message: string;
  statusChangeTo: RequestStatus | null;
  createdAt: string;
  attachments: Attachment[];
}

export interface RequestSummary {
  id: string;
  requestType: RequestType;
  requester: { id: string; name: string; setor: string; loja: string };
  requesterSetor: string;
  requesterLoja: string;
  assignedTo: { id: string; name: string } | null;
  status: RequestStatus;
  dueDate: string;
  closedAt: string | null;
  advertidoNome: string | null;
  motivo: string | null;
  descricaoRevisao: string | null;
  createdAt: string;
  diasUteisRestantes: number;
  atrasado: boolean;
  _count?: { attachments: number; interactions: number };
}

export interface RequestDetail extends RequestSummary {
  attachments: Attachment[];
  interactions: RequestInteraction[];
}

export interface AttachmentInput {
  storageKey: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
}

export interface DashboardKpis {
  totalNaFilaGeral: number;
  ativasPorColaborador: { colaboradorId: string; nome: string; quantidade: number }[];
  finalizadasTotal: number;
  tempoMedioResolucaoPorTipo: { requestTypeId: string; nome: string; mediaDiasUteis: number; amostras: number }[];
  curvaAbcSolicitantes: {
    solicitanteId: string;
    nome: string;
    quantidade: number;
    percentualAcumulado: number;
    classe: "A" | "B" | "C";
  }[];
}
