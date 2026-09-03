import { db } from '../client';
import { homepage, capabilities, products, industries, caseStudies, users } from '../schema';
import { createDefaultHomepageContent } from '../homepage-defaults';
import { eq } from 'drizzle-orm';

async function main() {
  const [existing] = await db.select().from(homepage).limit(1);
  if (existing) {
    console.log('Homepage row already exists.');
    return;
  }

  const [admin] = await db.select().from(users).where(eq(users.email, 'admin@novaflow.co')).limit(1);
  const caps = await db.select().from(capabilities);
  const prods = await db.select().from(products);
  const inds = await db.select().from(industries);
  const css = await db.select().from(caseStudies);

  const content = createDefaultHomepageContent({
    capabilityIds: caps
      .filter((c) => ['pos', 'billing', 'management', 'automation'].includes(c.slug))
      .map((c) => c.id),
    productIds: prods.slice(0, 3).map((p) => p.id),
    industryIds: inds.map((i) => i.id),
    caseStudyIds: css.map((c) => c.id),
  });

  await db.insert(homepage).values({
    draftContent: content,
    publishedContent: content,
    status: 'published',
    createdBy: admin?.id,
    updatedBy: admin?.id,
    publishedBy: admin?.id,
    publishedAt: new Date(),
  });

  console.log('Homepage row created and published.');
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
