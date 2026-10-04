export interface PracticeArea {
  id: number;
  slug: string;
  name: string;
  summary: string;
  description: string;
  sortOrder: number;
  active: boolean;
}

export interface Attorney {
  id: number;
  slug: string;
  fullName: string;
  title: string;
  shortBio: string;
  bio: string;
  photoUrl?: string;
  education?: string;
  barAdmissions?: string;
  practiceAreas: Array<{ slug: string; name: string }>;
}

export interface Review {
  id: number;
  authorName: string;
  rating: number;
  content: string;
  practiceAreaSlug?: string;
  practiceAreaName?: string;
  reviewDate: string;
  published: boolean;
}

export type LeadSource = 'CONSULTATION_FORM' | 'CONTACT_FORM' | 'CHATBOT';

export interface CreateLeadRequest {
  fullName: string;
  email: string;
  phone?: string;
  message?: string;
  practiceAreaSlug?: string;
  source: LeadSource;
  consent: boolean;
  /** Honeypot. Must stay empty. */
  website: string;
}

export type DayOfWeek = 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY' | 'SUNDAY';

export interface BookingConfig {
  timezone: string;
  slotMinutes: number;
  businessDays: DayOfWeek[];
  open: string;
  close: string;
  /** yyyy-MM-dd in the firm's timezone */
  minDate: string;
  maxDate: string;
}

export interface Slot {
  startAt: string;
  endAt: string;
}

export interface Availability {
  date: string;
  timezone: string;
  slotMinutes: number;
  businessDay: boolean;
  slots: Slot[];
}

export interface CreateBookingRequest {
  startAt: string;
  fullName: string;
  email: string;
  phone?: string;
  message?: string;
  practiceAreaSlug?: string;
  consent: boolean;
  website: string;
}

export interface BookingConfirmation {
  reference: string;
  startAt: string;
  endAt: string;
  timezone: string;
}

// Admin

export type LeadStatus = 'NEW' | 'CONTACTED' | 'BOOKED' | 'CLOSED';
export type BookingStatus = LeadStatus | 'CANCELLED';
export type AnyLeadSource = LeadSource | 'BOOKING';

export interface AdminLead {
  id: number;
  fullName: string;
  email: string;
  phone?: string;
  message?: string;
  practiceAreaSlug?: string;
  practiceAreaName?: string;
  source: AnyLeadSource;
  status: LeadStatus;
  createdAt: string;
}

export interface AdminBooking {
  id: number;
  startAt: string;
  endAt: string;
  status: BookingStatus;
  createdAt: string;
  lead: AdminLead;
}

export interface Page<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface ReviewInput {
  authorName: string;
  rating: number;
  content: string;
  practiceAreaSlug?: string;
  reviewDate: string;
  published: boolean;
}

export interface PracticeAreaInput {
  slug: string;
  name: string;
  summary: string;
  description: string;
  sortOrder: number;
  active: boolean;
}

export interface LoginResponse {
  token: string;
  expiresAt: string;
  email: string;
  displayName: string;
}

/** RFC 7807 problem detail returned by the API. */
export interface ProblemDetail {
  title?: string;
  status?: number;
  detail?: string;
  errors?: Record<string, string>;
}
