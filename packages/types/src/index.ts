export type UUID = string;

export type EntityStatus = 'draft' | 'published' | 'archived';

export interface BaseEntity {
  id: UUID;
  created_at: string;
  updated_at: string;
}

export interface SEOMetadata {
  id: UUID;
  page_id?: UUID | null;
  title?: string | null;
  description?: string | null;
  keywords?: string[] | null;
  canonical_url?: string | null;
  og_title?: string | null;
  og_description?: string | null;
  og_image_url?: string | null;
  twitter_card?: string | null;
}

export interface Media {
  id: UUID;
  filename: string;
  mime_type: string;
  size: number;
  width?: number | null;
  height?: number | null;
  url: string;
  alt?: string | null;
  folder_id?: UUID | null;
  created_at: string;
}

export interface PageBlock {
  id: UUID;
  page_id: UUID;
  type: string;
  position: number;
  data: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface Page extends BaseEntity {
  title: string;
  slug: string;
  status: EntityStatus;
  template?: string | null;
  published_at?: string | null;
  seo_metadata_id?: UUID | null;
}

export interface Solution extends BaseEntity {
  title: string;
  slug: string;
  summary?: string | null;
  status: EntityStatus;
  seo_metadata_id?: UUID | null;
}

export interface Product extends BaseEntity {
  title: string;
  slug: string;
  category?: string | null;
  short_description?: string | null;
  problem_title?: string | null;
  problem_description?: string | null;
  system_description?: string | null;
  solution_points?: string[] | null;
  logo_url?: string | null;
  hero_visual_url?: string | null;
  screenshots?: string[] | null;
  industries?: string[] | null;
  features?: string[] | null;
  link?: string | null;
  summary?: string | null;
  status: EntityStatus;
  seo_metadata_id?: UUID | null;
}

export interface Industry extends BaseEntity {
  title: string;
  slug: string;
  summary?: string | null;
  status: EntityStatus;
  seo_metadata_id?: UUID | null;
}

export interface CaseStudy extends BaseEntity {
  title: string;
  slug: string;
  summary?: string | null;
  status: EntityStatus;
  seo_metadata_id?: UUID | null;
}

export interface BlogPost extends BaseEntity {
  title: string;
  slug: string;
  status: EntityStatus;
  published_at?: string | null;
  seo_metadata_id?: UUID | null;
}

export interface Lead extends BaseEntity {
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  company?: string | null;
  message?: string | null;
  source?: string | null;
  status?: string | null;
}

export interface FormSubmission extends BaseEntity {
  form_id: UUID;
  payload: Record<string, unknown>;
  submitted_at?: string | null;
}
