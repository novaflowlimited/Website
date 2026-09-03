// Minimal static fallback when the API is unavailable at build time.
// Published CMS content takes precedence when the API responds.

import type { HomepageResponse } from './api';
import { getFallbackIndustries } from './industry-fallback';

export function getFallbackHomepage(): HomepageResponse {
  const industries = getFallbackIndustries();

  return {
    status: 'published',
    hero: {
      visible: true,
      eyebrow: 'NOVAFLOW',
      headlineLine1: 'BUILD LESS.',
      headlineLine2: 'AUTOMATE MORE.',
      supportingText: 'Software systems built around the way your business works.',
      primaryCtaLabel: 'Let’s Build ↗',
      primaryCtaUrl: '/contact',
      heroVisual: null,
      mobileHeroVisual: null,
    },
    whatWeBuild: {
      visible: true,
      eyebrow: '01 / WHAT WE BUILD',
      headline: 'SYSTEMS\nTHAT RUN\nBUSINESS.',
      capabilities: [
        { id: 'fb-cap-systems', name: 'Business Systems', slug: 'management', shortDescription: 'Operations platforms shaped around daily work.' },
        { id: 'fb-cap-automation', name: 'Automation', slug: 'automation', shortDescription: 'Workflows, alerts and operational orchestration.' },
        { id: 'fb-cap-payments', name: 'Payments', slug: 'billing', shortDescription: 'Collections, invoices and recurring billing.' },
        { id: 'fb-cap-connectivity', name: 'Connectivity', slug: 'pos', shortDescription: 'POS, inventory and transaction systems.' },
        { id: 'fb-cap-custom', name: 'Custom Software', slug: 'custom-software', shortDescription: 'Purpose-built systems when products are not enough.' },
        { id: 'fb-cap-integrations', name: 'Integrations', slug: 'automation', shortDescription: 'APIs, data flows and connected tools.' },
      ],
      desktopVisual: null,
      mobileVisual: null,
    },
    products: {
      visible: true,
      eyebrow: '02 / PRODUCTS',
      headline: 'SOFTWARE BUILT TO SOLVE REAL PROBLEMS.',
      items: [
        {
          id: 'fb-bytepesa',
          name: 'BytePesa',
          slug: 'bytepesa',
          category: 'ISP BILLING & MANAGEMENT',
          shortDescription: 'Billing, subscribers, payments and network operations.',
          hero: null,
        },
        {
          id: 'fb-techlane',
          name: 'TechLane',
          slug: 'techlane',
          category: 'RETAIL POS & INVENTORY',
          shortDescription: 'Checkout, inventory and transactions for retail operations.',
          hero: null,
        },
        {
          id: 'fb-apinai',
          name: 'Apinai Air',
          slug: 'apinai-air',
          category: 'AVIATION SYSTEMS',
          shortDescription: 'Flights, routes, bookings and passenger operations.',
          hero: null,
        },
      ],
    },
    forBusiness: {
      visible: true,
      eyebrow: '03 / FOR BUSINESS',
      headline: 'BUILT AROUND YOUR BUSINESS.',
      items: industries.map((i) => ({
        id: i.id,
        name: i.name,
        slug: i.slug,
        shortDescription: i.shortDescription,
        visual: i.visual,
      })),
    },
    work: {
      visible: true,
      eyebrow: '04 / WORK',
      headline: 'BUILT.\nSHIPPED.\nUSED.',
      items: [],
    },
    about: {
      visible: true,
      eyebrow: '05 / ABOUT',
      headlineLines: ['WE BUILD', 'SOFTWARE', 'AROUND THE', 'BUSINESS.'],
      shortDescription:
        'Novaflow builds software systems around the way businesses actually work — billing, POS, management platforms, automation and custom systems.',
      metaLine: 'PRODUCTS · SYSTEMS · AUTOMATION · SOFTWARE',
      linkLabel: 'About Novaflow ↗',
      linkUrl: '/about',
      visual: null,
    },
    contact: {
      visible: true,
      eyebrow: '06 / CONTACT',
      headline: 'LET’S BUILD.',
      supportingText: 'Have a system in mind?',
      buttonLabel: 'Start a project ↗',
      buttonUrl: '/contact',
    },
    seo: null,
    updatedAt: null,
    publishedAt: null,
  };
}
