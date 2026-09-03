import { db } from './client';
import { eq } from 'drizzle-orm';
import {
  users,
  capabilities,
  products,
  industries,
  caseStudies,
  media,
  navigationItems,
  siteSettings,
  seoMetadata,
  leads,
  homepage,
  articleCategories,
} from './schema';
import { createDefaultHomepageContent } from './homepage-defaults';
import argon2 from 'argon2';

async function seed() {
  if (process.env.NODE_ENV === 'production' && process.env.ALLOW_PRODUCTION_SEED !== 'true') {
    throw new Error(
      'Refusing to seed in production. Set ALLOW_PRODUCTION_SEED=true only for intentional one-time bootstrap.',
    );
  }

  console.log('🌱 Seeding database...');

  const adminPasswordPlain = process.env.SEED_ADMIN_PASSWORD || 'admin123';
  const editorPasswordPlain = process.env.SEED_EDITOR_PASSWORD || 'editor123';
  if (process.env.NODE_ENV === 'production') {
    if (!process.env.SEED_ADMIN_PASSWORD || !process.env.SEED_EDITOR_PASSWORD) {
      throw new Error('SEED_ADMIN_PASSWORD and SEED_EDITOR_PASSWORD are required when seeding production.');
    }
  }

  // --- Users ---
  const adminPassword = await argon2.hash(adminPasswordPlain);
  const editorPassword = await argon2.hash(editorPasswordPlain);

  const [adminUser] = await db
    .insert(users)
    .values([
      { email: 'admin@novaflow.co', name: 'Novaflow Admin', passwordHash: adminPassword, role: 'admin' },
    ])
    .returning();
  await db
    .insert(users)
    .values([
      { email: 'editor@novaflow.co', name: 'Novaflow Editor', passwordHash: editorPassword, role: 'editor' },
    ])
    .returning();
  const [editorUser] = await db.select().from(users).where(eq(users.email, 'editor@novaflow.co')).limit(1);
  void editorUser;

  console.log('  ✓ Users (admin@novaflow.co / editor@novaflow.co)');

  // --- Media ---
  const mediaRows = await db
    .insert(media)
    .values([
      { filename: 'novaflow-logo.svg', title: 'Novaflow logo', altText: 'Novaflow logo', decorative: false, type: 'logo', mimeType: 'image/svg+xml', width: 640, height: 240, sizeBytes: 18000, r2Key: 'media/novaflow-logo.svg', r2Url: '/media/novaflow-logo.svg', createdBy: adminUser.id },
      { filename: 'bytepesa-hero.png', title: 'BytePesa product screen', altText: 'BytePesa dashboard overview', decorative: false, type: 'screenshot', mimeType: 'image/png', width: 1600, height: 980, sizeBytes: 420000, r2Key: 'media/bytepesa-hero.png', r2Url: '/media/bytepesa-hero.png', createdBy: adminUser.id },
      { filename: 'techlane-hero.png', title: 'TechLane product screen', altText: 'TechLane sales and inventory overview', decorative: false, type: 'screenshot', mimeType: 'image/png', width: 1600, height: 980, sizeBytes: 455000, r2Key: 'media/techlane-hero.png', r2Url: '/media/techlane-hero.png', createdBy: adminUser.id },
      { filename: 'apinai-air-hero.png', title: 'Apinai Air interface', altText: 'Apinai Air scheduling overview', decorative: false, type: 'screenshot', mimeType: 'image/png', width: 1600, height: 980, sizeBytes: 438000, r2Key: 'media/apinai-air-hero.png', r2Url: '/media/apinai-air-hero.png', createdBy: adminUser.id },
    ])
    .returning();
  const [logoMedia, bytepesaMedia, techlaneMedia, apinaiMedia] = mediaRows;
  console.log('  ✓ Media');

  // --- Capabilities ---
  const capabilityRows = await db
    .insert(capabilities)
    .values([
      { name: 'POS', slug: 'pos', shortDescription: 'Checkout, sales and payment operations.', order: 1, status: 'published', createdBy: adminUser.id, updatedBy: adminUser.id },
      { name: 'Billing', slug: 'billing', shortDescription: 'Subscriptions, invoices and recurring collections.', order: 2, status: 'published', createdBy: adminUser.id, updatedBy: adminUser.id },
      { name: 'Management', slug: 'management', shortDescription: 'Daily operations, stock and workflow visibility.', order: 3, status: 'published', createdBy: adminUser.id, updatedBy: adminUser.id },
      { name: 'Automation', slug: 'automation', shortDescription: 'Tasks, alerts and operational orchestration.', order: 4, status: 'published', createdBy: adminUser.id, updatedBy: adminUser.id },
      { name: 'Custom Software', slug: 'custom-software', shortDescription: 'Tailored operational tooling for real business functions.', order: 5, status: 'published', createdBy: adminUser.id, updatedBy: adminUser.id },
    ])
    .returning();
  const [capPos, capBilling, capManagement, capAutomation, capCustom] = capabilityRows;
  console.log('  ✓ Capabilities');

  // --- Industries ---
  const industryRows = await db
    .insert(industries)
    .values([
      {
        name: 'Retail',
        slug: 'retail',
        shortDescription: 'Systems for business that moves fast.',
        businessContext: 'Retail businesses need systems that keep sales, stock and payments moving together through busy trading hours.',
        challengeHeadline: 'OPERATIONS\nBECOME\nFRAGMENTED.',
        challenge: 'When checkout, inventory and customer records live in separate tools, teams lose visibility and speed at the moments that matter most.',
        systemDescription: 'Novaflow builds retail systems that connect the daily flow of products, sales and payments.',
        systemItems: ['POS', 'Inventory', 'Payments', 'Customers', 'Operations'],
        relatedProducts: [],
        relatedCapabilities: [capPos.id, capManagement.id],
        order: 1,
        status: 'published',
        createdBy: adminUser.id,
        updatedBy: adminUser.id,
        publishedBy: adminUser.id,
        publishedAt: new Date(),
      },
      {
        name: 'Pharmacy',
        slug: 'pharmacy',
        shortDescription: 'Systems for stock, dispensing and daily pharmacy operations.',
        businessContext: 'Pharmacy teams manage regulated stock, dispensing workflows and customer service under constant time pressure.',
        challengeHeadline: 'STOCK AND\nSERVICE\nSPLIT APART.',
        challenge: 'Prescription queues, expiry tracking and sales often depend on disconnected processes that make daily operations harder to control.',
        systemDescription: 'Novaflow can build pharmacy operations software around stock control, dispensing and point-of-sale workflows.',
        systemItems: ['POS', 'Inventory', 'Expiry', 'Prescriptions', 'Customers'],
        relatedProducts: [],
        relatedCapabilities: [capPos.id, capManagement.id],
        order: 2,
        status: 'published',
        createdBy: adminUser.id,
        updatedBy: adminUser.id,
        publishedBy: adminUser.id,
        publishedAt: new Date(),
      },
      {
        name: 'ISP',
        slug: 'isp',
        shortDescription: 'Systems for subscribers, billing and network operations.',
        businessContext: 'ISPs coordinate subscribers, service plans, billing cycles and network activity across growing customer bases.',
        challengeHeadline: 'BILLING AND\nOPERATIONS\nDRIFT APART.',
        challenge: 'Subscriber records, invoicing and network workflows can become difficult to manage when they are handled through separate systems.',
        systemDescription: 'Novaflow builds ISP systems that connect billing, subscribers, payments and operational visibility.',
        systemItems: ['Billing', 'Subscribers', 'Payments', 'Packages', 'Network'],
        relatedProducts: [],
        relatedCapabilities: [capBilling.id, capManagement.id],
        order: 3,
        status: 'published',
        createdBy: adminUser.id,
        updatedBy: adminUser.id,
        publishedBy: adminUser.id,
        publishedAt: new Date(),
      },
      {
        name: 'Aviation',
        slug: 'aviation',
        shortDescription: 'Systems for bookings, flights and passenger operations.',
        businessContext: 'Aviation teams coordinate schedules, bookings, passengers and payments across operational touchpoints.',
        challengeHeadline: 'BOOKINGS AND\nOPERATIONS\nNEED CONNECTION.',
        challenge: 'Flight search, passenger handling and operational coordination require connected workflows rather than scattered tools.',
        systemDescription: 'Novaflow builds aviation platforms around bookings, passengers, payments and operational coordination.',
        systemItems: ['Bookings', 'Flights', 'Passengers', 'Payments', 'Operations'],
        relatedProducts: [],
        relatedCapabilities: [capCustom.id, capAutomation.id],
        order: 4,
        status: 'published',
        createdBy: adminUser.id,
        updatedBy: adminUser.id,
        publishedBy: adminUser.id,
        publishedAt: new Date(),
      },
      {
        name: 'Hospitality',
        slug: 'hospitality',
        shortDescription: 'Systems for reservations, guests and daily operations.',
        businessContext: 'Hospitality businesses coordinate guest bookings, service delivery and payments across properties and teams.',
        challengeHeadline: 'GUEST FLOW\nGETS\nCOMPLEX.',
        challenge: 'Reservations, guest services and operational tasks can become harder to manage when systems do not connect the full guest journey.',
        systemDescription: 'Novaflow can build hospitality systems around bookings, guest management, payments and operations.',
        systemItems: ['Bookings', 'Guests', 'Payments', 'Operations'],
        relatedProducts: [],
        relatedCapabilities: [capManagement.id, capAutomation.id],
        order: 5,
        status: 'published',
        createdBy: adminUser.id,
        updatedBy: adminUser.id,
        publishedBy: adminUser.id,
        publishedAt: new Date(),
      },
      {
        name: 'Professional Services',
        slug: 'professional-services',
        shortDescription: 'Systems for clients, projects and service delivery.',
        businessContext: 'Professional services firms need clarity across clients, active work, billing and internal operations.',
        challengeHeadline: 'CLIENT WORK\nSPREADS\nACROSS TOOLS.',
        challenge: 'Project delivery, billing and client communication often become fragmented when there is no single operational view.',
        systemDescription: 'Novaflow builds business systems for client management, project coordination, billing and operations.',
        systemItems: ['Clients', 'Projects', 'Billing', 'Operations'],
        relatedProducts: [],
        relatedCapabilities: [capManagement.id, capCustom.id],
        order: 6,
        status: 'published',
        createdBy: adminUser.id,
        updatedBy: adminUser.id,
        publishedBy: adminUser.id,
        publishedAt: new Date(),
      },
    ])
    .returning();
  const [indRetail, , indIsp, indAviation] = industryRows;
  console.log('  ✓ Industries');

  // --- Products ---
  const productRows = await db
    .insert(products)
    .values([
      {
        name: 'BytePesa',
        slug: 'bytepesa',
        category: 'ISP Billing',
        shortDescription: 'A billing and subscriber management system for ISPs.',
        description: 'BytePesa brings subscribers, packages, billing, invoices, payments, usage and network operations into one connected system for ISP teams.',
        problem: 'Billing, subscribers, payments and network operations can become fragmented across multiple tools.',
        solution: 'One connected billing workflow — from subscriber to package, invoice, payment and service.',
        features: ['Subscribers', 'Packages', 'Billing', 'Invoices', 'Payments', 'Usage', 'Network', 'Sessions', 'Reports'],
        workflow: ['Subscriber', 'Package', 'Billing', 'Payment', 'Service'],
        capabilities: [capBilling.id, capManagement.id],
        industries: [indIsp.id],
        logoMediaId: logoMedia.id,
        heroMediaId: bytepesaMedia.id,
        screenshots: [],
        status: 'published',
        order: 1,
        createdBy: adminUser.id,
        updatedBy: adminUser.id,
        publishedBy: adminUser.id,
        publishedAt: new Date(),
      },
      {
        name: 'TechLane',
        slug: 'techlane',
        category: 'POS / Business Operations',
        shortDescription: 'A POS and business operations system built around daily sales and inventory workflows.',
        description: 'TechLane connects products, cart, sales, inventory, payments and receipts for retail and service teams.',
        problem: 'Sales, inventory, payments and daily operations often become difficult to manage when they are spread across disconnected tools.',
        solution: 'One operational flow — from product to sale, payment, receipt and inventory update.',
        features: ['Products', 'Categories', 'Cart', 'Sales', 'Inventory', 'Barcode', 'Payments', 'Receipts', 'Customers', 'Reports'],
        workflow: ['Product', 'Sale', 'Payment', 'Receipt', 'Inventory'],
        capabilities: [capPos.id, capManagement.id],
        industries: [indRetail.id],
        logoMediaId: logoMedia.id,
        heroMediaId: techlaneMedia.id,
        screenshots: [],
        status: 'published',
        order: 2,
        createdBy: adminUser.id,
        updatedBy: adminUser.id,
        publishedBy: adminUser.id,
        publishedAt: new Date(),
      },
      {
        name: 'Apinai Air',
        slug: 'apinai-air',
        category: 'Aviation',
        shortDescription: 'A digital platform for flight bookings and aviation operations.',
        description: 'Apinai Air supports flight search, bookings, passengers, tickets, payments and operational coordination.',
        problem: 'Flight bookings and passenger operations require connected digital workflows.',
        solution: 'One booking journey — from flight search to booking, payment and ticket.',
        features: ['Flights', 'Search', 'Bookings', 'Passengers', 'Tickets', 'Payments', 'Operations', 'Notifications'],
        workflow: ['Flight', 'Search', 'Booking', 'Payment', 'Ticket'],
        capabilities: [capCustom.id, capAutomation.id],
        industries: [indAviation.id],
        logoMediaId: logoMedia.id,
        heroMediaId: apinaiMedia.id,
        screenshots: [],
        status: 'published',
        order: 3,
        createdBy: adminUser.id,
        updatedBy: adminUser.id,
        publishedBy: adminUser.id,
        publishedAt: new Date(),
      },
    ])
    .returning();
  const [bytepesaProduct, techlaneProduct, apinaiProduct] = productRows;
  await db
    .update(industries)
    .set({ relatedProducts: [techlaneProduct.id] })
    .where(eq(industries.id, indRetail.id));
  await db
    .update(industries)
    .set({ relatedProducts: [bytepesaProduct.id] })
    .where(eq(industries.id, indIsp.id));
  await db
    .update(industries)
    .set({ relatedProducts: [apinaiProduct.id] })
    .where(eq(industries.id, indAviation.id));

  console.log('  ✓ Products');

  // --- Case Studies ---
  const caseStudyRows = await db
    .insert(caseStudies)
    .values([
      {
        title: 'BytePesa operations refresh',
        slug: 'bytepesa-operations-refresh',
        client: 'Eastlink',
        industry: 'ISP',
        summary: 'Service billing and operations were reworked into one system for a growing telecom business.',
        challenge: 'The team had to manage subscriber plans, billing and maintenance tasks from separate systems.',
        solution: 'A unified billing and management workflow was introduced with clearer operational visibility.',
        result: null,
        gallery: [],
        products: [bytepesaProduct.id],
        capabilities: [capBilling.id, capManagement.id],
        testimonial: '',
        featured: true,
        order: 1,
        status: 'published',
        createdBy: adminUser.id,
        updatedBy: adminUser.id,
        publishedBy: adminUser.id,
        publishedAt: new Date(),
      },
    ])
    .returning();
  console.log('  ✓ Case studies');

  // --- Homepage (singleton) ---
  const homepageContent = createDefaultHomepageContent({
    capabilityIds: [capPos.id, capBilling.id, capManagement.id, capAutomation.id],
    productIds: [bytepesaProduct.id, techlaneProduct.id, apinaiProduct.id],
    industryIds: industryRows.map((ind) => ind.id),
    caseStudyIds: caseStudyRows.map((cs) => cs.id),
  });

  await db.insert(homepage).values({
    draftContent: homepageContent,
    publishedContent: homepageContent,
    status: 'published',
    createdBy: adminUser.id,
    updatedBy: adminUser.id,
    publishedBy: adminUser.id,
    publishedAt: new Date(),
  });
  console.log('  ✓ Homepage');

  // --- Insights categories (no placeholder articles) ---
  await db.insert(articleCategories).values([
    { name: 'Systems', slug: 'systems', order: 1 },
    { name: 'Automation', slug: 'automation', order: 2 },
    { name: 'Business Technology', slug: 'business-technology', order: 3 },
    { name: 'Infrastructure', slug: 'infrastructure', order: 4 },
    { name: 'Payments', slug: 'payments', order: 5 },
    { name: 'Software', slug: 'software', order: 6 },
  ]);
  console.log('  ✓ Insights categories');

  // --- Navigation ---
  await db
    .insert(navigationItems)
    .values([
      { label: 'Solutions', url: '/solutions', order: 1, visibility: 'visible', location: 'main', createdBy: adminUser.id, updatedBy: adminUser.id },
      { label: 'Products', url: '/products', order: 2, visibility: 'visible', location: 'main', createdBy: adminUser.id, updatedBy: adminUser.id },
      { label: 'Industries', url: '/industries', order: 3, visibility: 'visible', location: 'main', createdBy: adminUser.id, updatedBy: adminUser.id },
      { label: 'Work', url: '/case-studies', order: 4, visibility: 'visible', location: 'main', createdBy: adminUser.id, updatedBy: adminUser.id },
      { label: 'Insights', url: '/insights', order: 5, visibility: 'visible', location: 'main', createdBy: adminUser.id, updatedBy: adminUser.id },
      { label: 'About', url: '/about', order: 6, visibility: 'visible', location: 'main', createdBy: adminUser.id, updatedBy: adminUser.id },
      { label: "Let's Build", url: '/contact', order: 7, visibility: 'visible', location: 'main', createdBy: adminUser.id, updatedBy: adminUser.id },
    ]);
  console.log('  ✓ Navigation');

  // --- SEO (default) ---
  const [defaultSeo] = await db
    .insert(seoMetadata)
    .values([
      { entityType: 'default', entityId: null, title: 'Novaflow | Systems built around the way your business works', description: 'Operational software for service, retail, aviation and digital businesses.' },
    ])
    .returning();

  // --- Site Settings ---
  await db
    .insert(siteSettings)
    .values([
      { companyName: 'Novaflow Limited', logoMediaId: logoMedia.id, contactEmail: 'hello@novaflow.co', contactPhone: '+254 700 000 000', address: 'Nairobi, Kenya', socialLinks: { linkedin: 'https://www.linkedin.com/company/novaflow', x: 'https://x.com/novaflow' }, defaultSeoId: defaultSeo.id, updatedBy: adminUser.id },
    ]);
  console.log('  ✓ Site settings');

  // --- Leads ---
  await db
    .insert(leads)
    .values([
      { name: 'Aisha Njeri', email: 'aisha@eastlink.co', company: 'Eastlink', phone: '', projectType: 'Billing & Management', budgetRange: '', timeline: '', message: 'Looking for a billing and management platform for expanding subscribers.', status: 'new' },
      { name: 'Daniel Mugo', email: 'daniel@northlane-retail.co', company: 'Northlane Retail', phone: '', projectType: 'POS & Inventory', budgetRange: '', timeline: '', message: 'Need a clearer POS and stock overview for multiple stores.', status: 'contacted' },
    ]);
  console.log('  ✓ Leads');

  console.log('\n✅ Seed complete!');
  console.log('   Admin login:    admin@novaflow.co / admin123');
  console.log('   Editor login:   editor@novaflow.co / editor123');
  process.exit(0);
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
