// Tipos de las entidades del esquema. Reflejan las tablas de Supabase
// tal como las definimos en divisual-backend.sql.

export interface Company {
  id: number;
  name: string;
  phone: string | null;
  client: boolean | null;
  category: string | null;
  contacts_companies?: { id: number; role: string | null; contacts?: { id: number; name: string } }[];
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

export interface ContactHotelLink {
  id: number;
  hotels?: { id: number; name: string };
}

export interface Contact {
  id: number;
  name: string;
  last_name: string | null;
  phone: string | null;
  mobile_phone: string | null;
  email: string | null;
  lead_status: string | null;
  creation_date: string | null;
  last_update: string | null;
  contacts_companies?: ContactCompanyLink[];
  tags_contacts?: TagLink[];
  hotels_contacts?: ContactHotelLink[];
}

export interface ContactList {
  id: number;
  name: string;
  created_at: string;
  contact_lists_contacts?: { id: number }[];
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
  color: string | null;
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
  closing_date_prev: string | null;
  closing_date_changed_at: string | null;
  status_prev: string | null;
  status_changed_at: string | null;
  legal_company_name: string | null;
  legal_business_name: string | null;
  registered_address: string | null;
  tax_id: string | null;
  legal_rep_name: string | null;
  legal_rep_id: string | null;
  contract_signed: boolean | null;
  monthly_fee: number | null;
  billing_contact_name: string | null;
  proposal_attachment_url: string | null;
  proposal_attachment_name: string | null;
  quick_note: string | null;
  quick_note_color: string | null;
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

export interface HotelContactLink {
  id: number;
  contacts?: { id: number; name: string };
}

export interface Hotel {
  id: number;
  name: string;
  is_client: boolean | null;
  tau: number | null;
  current_ij: number | null;
  objective: number | null;
  deviation_days: number | null;
  deviation_pct: number | null;
  plan_end_date: string | null;
  updated_at: string | null;
  jaippy_id: number | null;
  income_current_month: number | null;
  income_next_month: number | null;
  num_rooms: number | null;
  adr: number | null;
  booking_url: string | null;
  stars: number | null;
  category: string | null;
  is_chain: boolean | null;
  pms: string | null;
  city: string | null;
  postal_code: string | null;
  address: string | null;
  description: string | null;
  hotels_personnel?: HotelPersonnelLink[];
  deals_hotels?: HotelDealLink[];
  hotels_contacts?: HotelContactLink[];
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

// Copia mínima de auth.users (id, email) — quién puede iniciar sesión de verdad.
export interface Profile {
  id: string;
  email: string;
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
export const CHARGE_TYPES = ["Mensual", "Trimestral", "Anual", "Pago único", "Por décima"] as const;

export const TICKET_STAGES = ["Por iniciar", "Seguimiento activo", "Consolidación", "Décima alcanzada", "Cierre de ciclo"] as const;
export type TicketStage = (typeof TICKET_STAGES)[number];
export const OPEN_TICKET_STAGES: TicketStage[] = ["Por iniciar", "Seguimiento activo", "Consolidación", "Décima alcanzada"];

export interface Story {
  id: number;
  name: string;
}

export interface Sprint {
  id: number;
  name: string;
  start_date: string | null;
  end_date: string | null;
  active: boolean | null;
}

export interface TaskPersonnelLink {
  id: number;
  personnel?: { id: number; name: string };
}

export interface TaskLabel {
  id: number;
  name: string;
  color: string;
}

export interface TaskLabelLink {
  id: number;
  labels?: TaskLabel;
}

export interface Task {
  id: number;
  title: string;
  description: string | null;
  type: string | null;
  status: string | null;
  priority: string | null;
  due_date: string | null;
  story_id: number | null;
  sprint_id: number | null;
  recurrence: string | null; // "weekly" | "monthly" | null
  recurrence_day: number | null; // semanal: 1(Lun)-7(Dom) · mensual: 1-31
  created_at: string;
  stories?: { id: number; name: string };
  sprints?: { id: number; name: string };
  tasks_personnel?: TaskPersonnelLink[];
  tasks_labels?: TaskLabelLink[];
}

export interface TaskComment {
  id: number;
  task_id: number;
  author_email: string | null;
  comment: string;
  created_at: string;
}

export interface TaskSubitem {
  id: number;
  task_id: number;
  title: string;
  done: boolean;
  created_at: string;
}

export interface TaskAttachment {
  id: number;
  task_id: number;
  label: string;
  url: string;
  created_at: string;
}

export const TASK_TYPES = ["Tarea", "Bug"] as const;
export type TaskType = (typeof TASK_TYPES)[number];

export const TASK_PRIORITIES = ["Alta", "Media", "Baja"] as const;
export type TaskPriority = (typeof TASK_PRIORITIES)[number];

export const TASK_STAGES = ["Por hacer", "En curso", "Pull Request", "Prueba en dev", "Listo en dev", "Listo en prod"] as const;
export type TaskStage = (typeof TASK_STAGES)[number];
export const OPEN_TASK_STAGES: TaskStage[] = ["Por hacer", "En curso", "Pull Request", "Prueba en dev", "Listo en dev"];

export interface Message {
  id: number;
  sender_email: string;
  recipient_email: string;
  body: string | null;
  type: string; // "text" | "task_request"
  task_title: string | null;
  task_description: string | null;
  task_type: string | null;
  task_response: string | null; // "pending" | "accepted" | "declined"
  task_id: number | null;
  created_at: string;
}

export interface EventPersonnelLink {
  id: number;
  personnel?: { id: number; name: string };
}

export interface CalendarEvent {
  id: number;
  title: string;
  description: string | null;
  category: string; // "Despliegue" | "Reunión" | "Vacaciones" | "Teletrabajo"
  start_date: string;
  end_date: string | null; // repetición: se usa como "repetir hasta" (opcional)
  recurrence: string | null; // "weekly" | "monthly" | null
  recurrence_day: number | null; // semanal: 1(Lun)-7(Dom) · mensual: 1-31
  created_at: string;
  events_personnel?: EventPersonnelLink[];
}

export const EVENT_CATEGORIES = ["Despliegue", "Reunión", "Vacaciones", "Teletrabajo", "Formación", "Visita a hotel"] as const;
export type EventCategory = (typeof EVENT_CATEGORIES)[number];

export interface FilterDef {
  col: string;
  op: "eq" | "gte" | "lte" | "is" | "in";
  value: string | number | boolean | null | (string | number)[];
}

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
