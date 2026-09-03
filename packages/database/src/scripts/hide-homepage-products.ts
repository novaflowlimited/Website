import { db } from '../client';
import { homepage } from '../schema';
import { eq } from 'drizzle-orm';

async function main() {
  const [row] = await db.select().from(homepage).limit(1);
  if (!row) {
    console.log('No homepage row found.');
    return;
  }

  const patchProducts = <T extends { visible: boolean }>(section: T): T => ({
    ...section,
    visible: false,
  });

  const draftContent = {
    ...row.draftContent,
    products: patchProducts(row.draftContent.products),
  };
  const publishedContent = row.publishedContent
    ? {
        ...row.publishedContent,
        products: patchProducts(row.publishedContent.products),
      }
    : null;

  await db
    .update(homepage)
    .set({
      draftContent,
      publishedContent,
      updatedAt: new Date(),
    })
    .where(eq(homepage.id, row.id));

  console.log('Homepage products section hidden.');
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
