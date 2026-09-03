// Fallback product detail data for SSG when the API is unavailable at build time.

import type { ProductDetail } from './api';

const SITE = 'http://localhost:4321';

export const FALLBACK_PRODUCTS: ProductDetail[] = [
  {
    id: 'fallback-bytepesa',
    name: 'BytePesa',
    slug: 'bytepesa',
    category: 'ISP Billing',
    shortDescription: 'A billing and subscriber management system for ISPs.',
    description:
      'BytePesa brings subscribers, packages, billing, invoices, payments, usage and network operations into one connected system for ISP teams.',
    problem:
      'Billing, subscribers, payments and network operations can become fragmented across multiple tools.',
    solution: 'One connected billing workflow — from subscriber to package, invoice, payment and service.',
    features: ['Subscribers', 'Packages', 'Billing', 'Invoices', 'Payments', 'Usage', 'Network', 'Sessions', 'Reports'],
    workflow: ['Subscriber', 'Package', 'Billing', 'Payment', 'Service'],
    status: 'published',
    order: 1,
    hero: null,
    logo: null,
    screenshots: [],
    capabilityItems: [
      { id: 'cap-billing', name: 'Billing', slug: 'billing', shortDescription: 'Subscriptions, invoices and recurring collections.' },
      { id: 'cap-management', name: 'Management', slug: 'management', shortDescription: 'Daily operations, stock and workflow visibility.' },
    ],
    industryItems: [{ id: 'ind-isp', name: 'ISP', slug: 'isp', shortDescription: 'Billing, subscriptions and network operations for telecom teams.' }],
    relatedCaseStudies: [
      {
        id: 'cs-bytepesa',
        title: 'BytePesa operations refresh',
        slug: 'bytepesa-operations-refresh',
        client: 'Eastlink',
        industry: 'ISP',
        summary: 'Service billing and operations were reworked into one system for a growing telecom business.',
      },
    ],
    seo: null,
  },
  {
    id: 'fallback-techlane',
    name: 'TechLane',
    slug: 'techlane',
    category: 'POS / Business Operations',
    shortDescription: 'A POS and business operations system built around daily sales and inventory workflows.',
    description:
      'TechLane connects products, cart, sales, inventory, payments and receipts for retail and service teams.',
    problem:
      'Sales, inventory, payments and daily operations often become difficult to manage when they are spread across disconnected tools.',
    solution: 'One operational flow — from product to sale, payment, receipt and inventory update.',
    features: ['Products', 'Categories', 'Cart', 'Sales', 'Inventory', 'Barcode', 'Payments', 'Receipts', 'Customers', 'Reports'],
    workflow: ['Product', 'Sale', 'Payment', 'Receipt', 'Inventory'],
    status: 'published',
    order: 2,
    hero: null,
    logo: null,
    screenshots: [],
    capabilityItems: [
      { id: 'cap-pos', name: 'POS', slug: 'pos', shortDescription: 'Checkout, sales and payment operations.' },
      { id: 'cap-management', name: 'Management', slug: 'management', shortDescription: 'Daily operations, stock and workflow visibility.' },
    ],
    industryItems: [{ id: 'ind-retail', name: 'Retail', slug: 'retail', shortDescription: 'Store operations, inventory and customer transactions.' }],
    relatedCaseStudies: [],
    seo: null,
  },
  {
    id: 'fallback-apinai',
    name: 'Apinai Air',
    slug: 'apinai-air',
    category: 'Aviation',
    shortDescription: 'A digital platform for flight bookings and aviation operations.',
    description:
      'Apinai Air supports flight search, bookings, passengers, tickets, payments and operational coordination.',
    problem: 'Flight bookings and passenger operations require connected digital workflows.',
    solution: 'One booking journey — from flight search to booking, payment and ticket.',
    features: ['Flights', 'Search', 'Bookings', 'Passengers', 'Tickets', 'Payments', 'Operations', 'Notifications'],
    workflow: ['Flight', 'Search', 'Booking', 'Payment', 'Ticket'],
    status: 'published',
    order: 3,
    hero: null,
    logo: null,
    screenshots: [],
    capabilityItems: [
      { id: 'cap-custom', name: 'Custom Software', slug: 'custom-software', shortDescription: 'Tailored operational tooling for real business functions.' },
      { id: 'cap-automation', name: 'Automation', slug: 'automation', shortDescription: 'Tasks, alerts and operational orchestration.' },
    ],
    industryItems: [{ id: 'ind-aviation', name: 'Aviation', slug: 'aviation', shortDescription: 'Flight operations, bookings and passenger coordination.' }],
    relatedCaseStudies: [],
    seo: null,
  },
];

export function getFallbackProductBySlug(slug: string): ProductDetail | null {
  return FALLBACK_PRODUCTS.find((p) => p.slug === slug) ?? null;
}

export function getFallbackProducts(): ProductDetail[] {
  return FALLBACK_PRODUCTS;
}

export function productCanonical(slug: string): string {
  return `${SITE}/products/${slug}`;
}
