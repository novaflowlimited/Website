import type { HomepageContent } from '@novaflow/database';
import type { ValidationResult } from './validation';

export function validateHomepagePublish(content: HomepageContent): ValidationResult {
  const errors: string[] = [];

  if (content.hero.visible) {
    if (!content.hero.headlineLine1?.trim() && !content.hero.headlineLine2?.trim()) {
      errors.push('Hero headline is required.');
    }
    if (!content.hero.primaryCtaLabel?.trim() || !content.hero.primaryCtaUrl?.trim()) {
      errors.push('Hero primary CTA is required.');
    }
  }

  if (content.whatWeBuild.visible) {
    if (!content.whatWeBuild.headline?.trim() && !content.whatWeBuild.eyebrow?.trim()) {
      errors.push('What We Build headline or eyebrow is required.');
    }
    if (content.whatWeBuild.capabilityIds.length === 0) {
      errors.push('What We Build requires at least one capability.');
    }
  }

  if (content.products.visible && content.products.featuredProductIds.length === 0) {
    errors.push('Products section requires at least one featured product.');
  }

  if (content.forBusiness.visible && content.forBusiness.featuredIndustryIds.length === 0) {
    errors.push('For Business section requires at least one featured industry.');
  }

  if (content.about.visible && content.about.headlineLines.filter(Boolean).length === 0) {
    errors.push('About headline is required when section is visible.');
  }

  if (content.contact.visible) {
    if (!content.contact.headline?.trim()) errors.push('Contact headline is required.');
    if (!content.contact.buttonLabel?.trim() || !content.contact.buttonUrl?.trim()) {
      errors.push('Contact CTA is required.');
    }
  }

  if (content.products.featuredProductIds.length > 4) {
    errors.push('Maximum 4 featured products allowed.');
  }
  if (content.forBusiness.featuredIndustryIds.length > 6) {
    errors.push('Maximum 6 featured industries allowed.');
  }
  if (content.work.featuredCaseStudyIds.length > 4) {
    errors.push('Maximum 4 featured case studies allowed.');
  }

  return { valid: errors.length === 0, errors };
}
