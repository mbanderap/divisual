// Tipos de las entidades del esquema. Reflejan las tablas de Supabase
// tal como las definimos en divisual-backend.sql.

export interface Company {
  id: number;
  name: string;
  phone: string | null;
  client: boolean | null;
  category: string | null;
  contacts_companies?: { id: number; contacts?: { id: number; name: string } }[];
}

export interface Tag {
  id: number;
  name: string;
}

export interface ContactCompanyLink {
  id: number;
  role: string | null;
  companies?: { id: number; name: string };
}

export interface TagLink {
  id: number;
  tags?: { id: number; name: string };
}

export interface Contact {
  id: number;
  name: string;
  phone: string | null;
  email: string | null;
  lead_status: string | null;
  creation_date: string | null;
  last_update: string | null;
  contacts_companies?: ContactCompanyLink[];
  tags_contacts?: TagLink[];
}

export interface ContactHistorial {
  id: number;
  contact_id: number;
  created_at: string;
  note: string | null;
}

export interface BillingModel {
  id: number;
  name: string;
}

export interface DealHotelLink {
  id: number;
  hotels?: { id: number; name: string };
}

export interface Deal {
  id: number;
  name: string;
  status: string | null;
  closing_date: string | null;
  value: number | null;
  type_of_charge: string | null;
  start_date: string | null;
  end_date: string | null;
  contact_id: number | null;
  billing_model: number | null;
  contacts?: { id: number; name: string };
  billing_models?: { id: number; name: string };
  deals_hotels?: DealHotelLink[];
}

export interface HotelPersonnelLink {
  role: string | null;
  area: string | null;
  personnel?: { id: number; name: string; email: string | null };
}

export interface HotelDealLink {
  id: number;
  deals?: { id: number; name: string; value: number | null; status: string | null };
}

export interface Hotel {
  id: number;
  name: string;
  has_plan: boolean | null;
  tau: number | null;
  contracted_tenths: number | null;
  current_ij: number | null;
  objective: number | null;
  deviation_days: number | null;
  deviation_pct: number | null;
  current_tenth: number | null;
  remaining_tenths: number | null;
  invoiced: boolean | null;
  plan_end_date: string | null;
  updated_at: string | null;
  hotels_personnel?: HotelPersonnelLink[];
  deals_hotels?: HotelDealLink[];
  tickets?: { id: number; status: string | null; created_at: string }[];
}

export interface PersonnelHotelLink {
  role: string | null;
  area: string | null;
  hotels?: { id: number; name: string };
}

export interface Personnel {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  hotels_personnel?: PersonnelHotelLink[];
}

export interface TicketContactLink {
  id: number;
  contacts?: { id: number; name: string };
}

export interface Ticket {
  id: number;
  title: string;
  status: string | null;
  plan_end_date: string | null;
  company_id: number | null;
  owner_id: number | null;
  hotel_id: number | null;
  created_at: string;
  companies?: { id: number; name: string };
  personnel?: { id: number; name: string };
  hotels?: { id: number; name: string };
  tickets_contacts?: TicketContactLink[];
}

export const DEAL_STAGES = ["Prospecto", "Contactado", "Propuesta", "Negociación", "Ganado", "Perdido"] as const;
export type DealStage = (typeof DEAL_STAGES)[number];
export const OPEN_STAGES: DealStage[] = ["Prospecto", "Contactado", "Propuesta", "Negociación"];
export const LEAD_STATUSES = ["Lead", "Oportunidad", "Cliente", "Inactivo"] as const;
export const CHARGE_TYPES = ["Mensual", "Trimestral", "Anual", "Pago único"] as const;

export const TICKET_STAGES = ["Por iniciar", "Seguimiento activo", "Consolidación", "Décima alcanzada", "Cierre de ciclo"] as const;
export type TicketStage = (typeof TICKET_STAGES)[number];
export const OPEN_TICKET_STAGES: TicketStage[] = ["Por iniciar", "Seguimiento activo", "Consolidación", "Décima alcanzada"];

export interface Story {
  id: number;
  name: string;
}

export interface TaskPersonnelLink {
  id: number;
  personnel?: { id: number; name: string };
}

export interface Task {
  id: number;
  title: string;
  description: string | null;
  type: string | null;
  status: string | null;
  story_id: number | null;
  created_at: string;
  stories?: { id: number; name: string };
  tasks_personnel?: TaskPersonnelLink[];
}

export interface TaskComment {
  id: number;
  task_id: number;
  author_email: string | null;
  comment: string;
  created_at: string;
}

export const TASK_TYPES = ["Tarea", "Bug"] as const;
export type TaskType = (typeof TASK_TYPES)[number];

export const TASK_STAGES = ["Por hacer", "En curso", "Pull Request", "Prueba en dev", "Listo en dev", "Listo en prod"] as const;
export type TaskStage = (typeof TASK_STAGES)[number];
export const OPEN_TASK_STAGES: TaskStage[] = ["Por hacer", "En curso", "Pull Request", "Prueba en dev", "Listo en dev"];

export interface PagedListState<T> {
  rows: T[];
  page: number;
  pageSize: number;
  total: number;
  sortKey: string;
  sortDir: "asc" | "desc";
  search: string;
  loading: boolean;
}

export interface ColumnDef<T> {
  key: string;
  label: string;
  visible: boolean;
  dbCol?: string;
  numeric?: boolean;
  sortVal?: (row: T) => string | number;
}
