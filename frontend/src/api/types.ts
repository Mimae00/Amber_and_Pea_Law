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

/** RFC 7807 problem detail returned by the API. */
export interface ProblemDetail {
  title?: string;
  status?: number;
  detail?: string;
  errors?: Record<string, string>;
}
