export const siteConfig = {
  name: 'Novaflow Limited',
  baseUrl: process.env.PUBLIC_SITE_URL?.replace(/\/$/, '') || 'http://localhost:4321',
  cmsUrl: process.env.PUBLIC_CMS_URL?.replace(/\/$/, '') || 'http://localhost:5173',
  apiUrl: process.env.PUBLIC_API_URL?.replace(/\/$/, '') || process.env.API_URL?.replace(/\/$/, '') || 'http://localhost:8787',
  brand: {
    primary: '#1B2A7A',
    accent: '#FF6B00',
    base: '#FFFFFF',
    offWhite: '#F6F5F1',
    text: '#101114',
    muted: '#5F605C',
    border: '#DDDDD8',
  },
} as const;

export const routes = {
  website: {
    home: '/',
    solutions: '/solutions',
    products: '/products',
    industries: '/industries',
    caseStudies: '/case-studies',
    insights: '/insights',
    about: '/about',
    contact: '/contact',
  },
  cms: {
    dashboard: '/dashboard',
    pages: '/pages',
    navigation: '/navigation',
    siteSettings: '/site-settings',
    solutions: '/solutions',
    products: '/products',
    industries: '/industries',
    caseStudies: '/case-studies',
    posts: '/posts',
    media: '/media',
    leads: '/leads',
    forms: '/forms',
    seo: '/seo',
    settings: '/settings',
  },
} as const;
