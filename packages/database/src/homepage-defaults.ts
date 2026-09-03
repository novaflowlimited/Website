import type { HomepageContent } from './schema/homepage';

export function createDefaultHomepageContent(ids: {
  capabilityIds: string[];
  productIds: string[];
  industryIds: string[];
  caseStudyIds: string[];
}): HomepageContent {
  const [capPos, capBilling, capManagement, capAutomation] = ids.capabilityIds;
  const [productBytepesa, productTechlane, productApinai] = ids.productIds;

  return {
    hero: {
      visible: true,
      eyebrow: 'NOVAFLOW',
      headlineLine1: 'BUILD LESS.',
      headlineLine2: 'AUTOMATE MORE.',
      supportingText: 'Software systems built around the way your business works.',
      primaryCtaLabel: 'Let’s Build ↗',
      primaryCtaUrl: '/contact',
      heroVisualMediaId: null,
      mobileHeroVisualMediaId: null,
    },
    whatWeBuild: {
      visible: true,
      eyebrow: '01 / WHAT WE BUILD',
      headline: 'SYSTEMS\nTHAT RUN\nBUSINESS.',
      capabilityIds: [capPos, capBilling, capManagement, capAutomation].filter(Boolean),
      desktopVisualMediaId: null,
      mobileVisualMediaId: null,
    },
    products: {
      visible: false,
      eyebrow: '02 / PRODUCTS',
      headline: 'SOFTWARE BUILT TO SOLVE REAL PROBLEMS.',
      featuredProductIds: [productBytepesa, productTechlane, productApinai].filter(Boolean),
    },
    forBusiness: {
      visible: true,
      eyebrow: '03 / FOR BUSINESS',
      headline: 'BUILT AROUND YOUR BUSINESS.',
      featuredIndustryIds: ids.industryIds,
    },
    work: {
      visible: true,
      eyebrow: '04 / WORK',
      headline: 'BUILT.\nSHIPPED.\nUSED.',
      featuredCaseStudyIds: [],
    },
    about: {
      visible: true,
      eyebrow: '05 / ABOUT',
      headlineLines: ['WE BUILD', 'SOFTWARE', 'AROUND THE', 'BUSINESS.'],
      shortDescription:
        'Novaflow builds software systems around the way businesses actually work — from billing and POS to management platforms, automation and custom systems.',
      metaLine: 'PRODUCTS · SYSTEMS · AUTOMATION · SOFTWARE',
      visualMediaId: null,
      linkLabel: 'Explore our products ↗',
      linkUrl: '/products',
    },
    contact: {
      visible: true,
      eyebrow: '06 / CONTACT',
      headline: 'LET’S BUILD.',
      supportingText: 'Have a system in mind?',
      buttonLabel: 'Start a conversation',
      buttonUrl: '/contact',
    },
  };
}
