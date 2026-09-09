export type Role = "USUARIO" | "COLABORADOR" | "GESTOR";
export type RequestStatus = "ABERTO" | "EM_ANDAMENTO" | "FINALIZADO";

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  setor: string;
  loja: string;
  cidade: string;
  estado: string;
  cargo: string | null;
  avatarUrl: string | null;
}

export type RequestableRole = "USUARIO" | "COLABORADOR";
export type AccessRequestStatus = "PENDENTE" | "APROVADO" | "RECUSADO";

export interface AccessRequest {
  id: string;
  name: string;
  email: string;
  setor: string;
  loja: string;
  cidade: string;
  estado: string;
  requestedRole: RequestableRole;
  status: AccessRequestStatus;
  rejectionReason: string | null;
  reviewedAt: string | null;
  createdAt: string;
}

export interface LicensePoolInfo {
  role: RequestableRole;
  totalLicenses: number;
  usedLicenses: number;
  available: number;
}

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: RequestableRole;
  setor: string;
  loja: string;
  active: boolean;
  hasLicense: boolean;
  createdAt: string;
}

export type AdminUserStatus = "COM_LICENCA" | "CADASTRADOS" | "INATIVO";

export interface CompanyUser {
  id: string;
  name: string;
  email: string;
  role: RequestableRole;
  setor: string;
  loja: string;
  cidade: string;
  estado: string;
  cargo: string | null;
  avatarUrl: string | null;
  createdAt: string;
}

export type CompanyUserRoleFilter = "COLABORADOR" | "USUARIO" | "TODOS";

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
  author: { id: string; name: string; cargo: string | null; avatarUrl: string | null };
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
  detalhes: { descricao?: string } | null;
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

export interface CalendarStatus {
  connected: boolean;
  googleEmail: string | null;
}

export interface CalendarEvent {
  id: string;
  summary: string;
  description: string | null;
  start: string | null;
  end: string | null;
  reminderMinutes: number;
  htmlLink: string | null;
}

export type InternalTicketStatus = "ABERTO" | "RESOLVIDO";

export interface InternalTicketAttachment {
  id: string;
  ticketId: string;
  interactionId: string | null;
  fileName: string;
  storageKey: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
  fileUrl?: string;
}

export interface InternalTicketAuthor {
  id: string;
  name: string;
  role: Role | "ADMIN";
  cargo: string | null;
  avatarUrl: string | null;
}

export interface InternalTicketInteraction {
  id: string;
  message: string;
  createdAt: string;
  author: InternalTicketAuthor;
  attachments: InternalTicketAttachment[];
}

export interface InternalTicket {
  id: string;
  tipo: string;
  mensagem: string;
  status: InternalTicketStatus;
  createdAt: string;
  resolvedAt: string | null;
  author: {
    id: string;
    name: string;
    email: string;
    role: Role;
    setor: string;
    cargo: string | null;
    avatarUrl: string | null;
  };
  _count?: { interactions: number; attachments: number };
}

export interface InternalTicketDetail extends InternalTicket {
  attachments: InternalTicketAttachment[];
  interactions: InternalTicketInteraction[];
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
