export type ContentStatus = 'draft' | 'published' | 'archived';

export interface CapabilityEntry {
  id: string;
  name: string;
  slug: string;
  shortDescription: string;
  order: number;
  status: ContentStatus;
}

export interface ProductEntry {
  id: string;
  name: string;
  slug: string;
  category: string;
  shortDescription: string;
  description: string;
  problem: string;
  solution: string;
  capabilities: string[];
  industries: string[];
  status: ContentStatus;
  order: number;
}

export interface IndustryEntry {
  id: string;
  name: string;
  slug: string;
  shortDescription: string;
  relatedProducts: string[];
  relatedCapabilities: string[];
  order: number;
  status: ContentStatus;
}

export interface AboutEntry {
  id: string;
  eyebrow: string;
  headline: string;
  shortDescription: string;
  visual: string;
  secondaryLink: string;
  status: ContentStatus;
}

export interface CaseStudyEntry {
  id: string;
  title: string;
  slug: string;
  client: string;
  industry: string;
  summary: string;
  challenge: string;
  solution: string;
  result: string | null;
  featured: boolean;
  status: ContentStatus;
  order: number;
}

export interface MediaEntry {
  id: string;
  filename: string;
  title: string;
  type: 'image' | 'logo' | 'screenshot' | 'og-image';
  altText: string;
  width: number;
  height: number;
  size: string;
  createdAt: string;
}

export interface NavigationEntry {
  id: string;
  label: string;
  url: string;
  order: number;
  visibility: 'visible' | 'hidden';
}

export interface SiteSettingsEntry {
  companyName: string;
  contactEmail: string;
  contactPhone: string;
  defaultMetaTitle: string;
  defaultMetaDescription: string;
  defaultOgImage: string;
  socialLinks: {
    linkedin?: string;
    x?: string;
  };
}

export interface ContactEntry {
  id: string;
  name: string;
  email: string;
  company: string;
  message: string;
  status: 'new' | 'reviewed';
  createdAt: string;
}

export const seedCapabilities: CapabilityEntry[] = [
  { id: 'cap-pos', name: 'POS', slug: 'pos', shortDescription: 'Checkout, sales and payment operations.', order: 1, status: 'published' },
  { id: 'cap-billing', name: 'Billing', slug: 'billing', shortDescription: 'Subscriptions, invoices and recurring collections.', order: 2, status: 'published' },
  { id: 'cap-management', name: 'Management', slug: 'management', shortDescription: 'Daily operations, stock and workflow visibility.', order: 3, status: 'published' },
  { id: 'cap-automation', name: 'Automation', slug: 'automation', shortDescription: 'Tasks, alerts and operational orchestration.', order: 4, status: 'published' },
  { id: 'cap-custom-software', name: 'Custom Software', slug: 'custom-software', shortDescription: 'Tailored operational tooling for real business functions.', order: 5, status: 'published' },
];

export const seedProducts: ProductEntry[] = [
  {
    id: 'prod-bytepesa',
    name: 'BytePesa',
    slug: 'bytepesa',
    category: 'ISP Billing',
    shortDescription: 'Billing, subscriptions and customer operations for service businesses.',
    description: 'A billing and operations platform for ISPs and telecom operators.',
    problem: 'Disconnected subscriber management, billing and network workflows were slowing operations.',
    solution: 'BytePesa merges billing, subscriber management and operational visibility into one system.',
    capabilities: ['cap-billing', 'cap-management'],
    industries: ['ind-isp'],
    status: 'published',
    order: 1,
  },
  {
    id: 'prod-techlane',
    name: 'TechLane',
    slug: 'techlane',
    category: 'Retail Operations',
    shortDescription: 'POS, inventory and retail workflows built for daily throughput.',
    description: 'Operational tooling for retail environments with stock, sales and payments.',
    problem: 'Retail teams were forced to split sales, inventory and service decisions across disconnected tools.',
    solution: 'TechLane centralizes store operations into one product for quick decisions and tighter control.',
    capabilities: ['cap-pos', 'cap-management'],
    industries: ['ind-retail'],
    status: 'published',
    order: 2,
  },
  {
    id: 'prod-apinai-air',
    name: 'Apinai Air',
    slug: 'apinai-air',
    category: 'Aviation Operations',
    shortDescription: 'Custom software for schedules, bookings and passenger operations.',
    description: 'A tailored operations platform for airline and aviation teams.',
    problem: 'Aviation workflows needed a reliable system spanning bookings, passenger flow and scheduling.',
    solution: 'Apinai Air supports operational coordination without forcing teams into generic business tools.',
    capabilities: ['cap-custom-software', 'cap-automation'],
    industries: ['ind-aviation'],
    status: 'published',
    order: 3,
  },
];

export const seedIndustries: IndustryEntry[] = [
  { id: 'ind-retail', name: 'Retail', slug: 'retail', shortDescription: 'Store operations, inventory and customer transactions.', relatedProducts: ['prod-techlane'], relatedCapabilities: ['cap-pos', 'cap-management'], order: 1, status: 'published' },
  { id: 'ind-pharmacy', name: 'Pharmacy', slug: 'pharmacy', shortDescription: 'Stock, dispensing workflows and patient service operations.', relatedProducts: [], relatedCapabilities: ['cap-pos', 'cap-management'], order: 2, status: 'published' },
  { id: 'ind-isp', name: 'ISP', slug: 'isp', shortDescription: 'Billing, subscriptions and network operations for telecom teams.', relatedProducts: ['prod-bytepesa'], relatedCapabilities: ['cap-billing', 'cap-management'], order: 3, status: 'published' },
  { id: 'ind-aviation', name: 'Aviation', slug: 'aviation', shortDescription: 'Flight operations, bookings and passenger coordination.', relatedProducts: ['prod-apinai-air'], relatedCapabilities: ['cap-custom-software', 'cap-automation'], order: 4, status: 'published' },
  { id: 'ind-hospitality', name: 'Hospitality', slug: 'hospitality', shortDescription: 'Guest experience, bookings and operational execution.', relatedProducts: [], relatedCapabilities: ['cap-management', 'cap-automation'], order: 5, status: 'published' },
  { id: 'ind-professional-services', name: 'Professional Services', slug: 'professional-services', shortDescription: 'Client delivery, operations and project coordination.', relatedProducts: [], relatedCapabilities: ['cap-management', 'cap-custom-software'], order: 6, status: 'published' },
];

export const seedAbout: AboutEntry = {
  id: 'about-novaflow',
  eyebrow: '05 / ABOUT',
  headline: 'WE BUILD SOFTWARE AROUND THE BUSINESS.',
  shortDescription: 'Novaflow builds software systems around the way businesses actually work — from billing and POS to management platforms, automation and custom systems.',
  visual: '/images/about/novaflow-systems.jpg',
  secondaryLink: '/products',
  status: 'published',
};

export const seedCaseStudies: CaseStudyEntry[] = [
  {
    id: 'cs-bytepesa',
    title: 'BytePesa operations refresh',
    slug: 'bytepesa-operations-refresh',
    client: 'Eastlink',
    industry: 'ISP',
    summary: 'Service billing and operations were reworked into one system for a growing telecom business.',
    challenge: 'The team had to manage subscriber plans, billing and maintenance tasks from separate systems.',
    solution: 'A unified billing and management workflow was introduced with clearer operational visibility.',
    result: null,
    featured: true,
    status: 'published',
    order: 1,
  },
];

export const seedMedia: MediaEntry[] = [
  { id: 'media-logo-novaflow', filename: 'novaflow-logo.svg', title: 'Novaflow logo', type: 'logo', altText: 'Novaflow logo', width: 640, height: 240, size: '18 KB', createdAt: '2026-08-01' },
  { id: 'media-product-bytepesa', filename: 'bytepesa-hero.png', title: 'BytePesa product screen', type: 'screenshot', altText: 'BytePesa dashboard overview', width: 1600, height: 980, size: '420 KB', createdAt: '2026-08-10' },
  { id: 'media-product-techlane', filename: 'techlane-hero.png', title: 'TechLane product screen', type: 'screenshot', altText: 'TechLane sales and inventory overview', width: 1600, height: 980, size: '455 KB', createdAt: '2026-08-11' },
  { id: 'media-product-apinai-air', filename: 'apinai-air-hero.png', title: 'Apinai Air interface', type: 'screenshot', altText: 'Apinai Air scheduling overview', width: 1600, height: 980, size: '438 KB', createdAt: '2026-08-12' },
];

export const seedNavigation: NavigationEntry[] = [
  { id: 'nav-solutions', label: 'Solutions', url: '/solutions', order: 1, visibility: 'visible' },
  { id: 'nav-products', label: 'Products', url: '/products', order: 2, visibility: 'visible' },
  { id: 'nav-industries', label: 'Industries', url: '/industries', order: 3, visibility: 'visible' },
  { id: 'nav-work', label: 'Work', url: '/case-studies', order: 4, visibility: 'visible' },
  { id: 'nav-insights', label: 'Insights', url: '/insights', order: 5, visibility: 'visible' },
  { id: 'nav-about', label: 'About', url: '/about', order: 6, visibility: 'visible' },
  { id: 'nav-cta', label: "Let's Build", url: '/contact', order: 7, visibility: 'visible' },
];

export const seedSiteSettings: SiteSettingsEntry = {
  companyName: 'Novaflow Limited',
  contactEmail: 'hello@novaflow.co',
  contactPhone: '+254 700 000 000',
  defaultMetaTitle: 'Novaflow | Systems built around the way your business works',
  defaultMetaDescription: 'Operational software for service, retail, aviation and digital businesses.',
  defaultOgImage: '/images/og-default.jpg',
  socialLinks: {
    linkedin: 'https://www.linkedin.com/company/novaflow',
    x: 'https://x.com/novaflow',
  },
};

export const seedLeads: ContactEntry[] = [
  {
    id: 'lead-001',
    name: 'Aisha Njeri',
    email: 'aisha@eastlink.co',
    company: 'Eastlink',
    message: 'Looking for a billing and management platform for expanding subscribers.',
    status: 'new',
    createdAt: '2026-08-15',
  },
  {
    id: 'lead-002',
    name: 'Daniel Mugo',
    email: 'daniel@northlane-retail.co',
    company: 'Northlane Retail',
    message: 'Need a clearer POS and stock overview for multiple stores.',
    status: 'reviewed',
    createdAt: '2026-08-16',
  },
];

export const seedPages = [
  { id: 'page-home', title: 'Home', slug: '/', status: 'published' as const },
  { id: 'page-about', title: 'About', slug: '/about', status: 'published' as const },
  { id: 'page-contact', title: 'Contact', slug: '/contact', status: 'published' as const },
  { id: 'page-solutions', title: 'Solutions', slug: '/solutions', status: 'published' as const },
  { id: 'page-products', title: 'Products', slug: '/products', status: 'published' as const },
  { id: 'page-industries', title: 'Industries', slug: '/industries', status: 'published' as const },
  { id: 'page-case-studies', title: 'Case Studies', slug: '/case-studies', status: 'published' as const },
  { id: 'page-insights', title: 'Insights', slug: '/insights', status: 'draft' as const },
];
