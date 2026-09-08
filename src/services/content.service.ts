import { contentRepository } from '../repositories/content.repository';
import { settingsService } from './settings.service';
import { notificationService } from './notification.service';
import { deleteAsset } from '../integrations/cloudinary/deleteAsset';
import { ApiError } from '../utils/ApiError';

export const contentService = {
  // ---------- Public ----------

  listActiveBanners() {
    return contentRepository.findBanners(true);
  },

  async announcement() {
    const settings = await settingsService.getAll();
    return {
      text: settings.announcementText,
      enabled: settings.announcementEnabled,
    };
  },

  async getPage(slug: string) {
    const page = await contentRepository.findPageBySlug(slug, true);
    if (!page) throw ApiError.notFound('Page not found');
    return page;
  },

  async submitContactForm(input: {
    name: string;
    email: string;
    phone?: string;
    subject: string;
    message: string;
  }) {
    const record = await contentRepository.createContactMessage({
      name: input.name,
      email: input.email,
      phone: input.phone ?? null,
      subject: input.subject,
      message: input.message,
    });

    void notificationService.adminAlert(
      'New contact form submission',
      `<p><strong>From:</strong> ${input.name} (${input.email})<br />
       <strong>Subject:</strong> ${input.subject}</p>
       <p>${input.message.replace(/\n/g, '<br />')}</p>`,
    );

    return { id: record.id };
  },

  // ---------- Admin ----------

  listBanners() {
    return contentRepository.findBanners(false);
  },

  createBanner(input: Record<string, unknown>) {
    return contentRepository.createBanner(input as never);
  },

  async updateBanner(id: string, input: Record<string, unknown>) {
    const existing = await contentRepository.findBannerById(id);
    if (!existing) throw ApiError.notFound('Banner not found');
    return contentRepository.updateBanner(id, input as never);
  },

  async deleteBanner(id: string) {
    const existing = await contentRepository.findBannerById(id);
    if (!existing) throw ApiError.notFound('Banner not found');

    await contentRepository.deleteBanner(id);
    void deleteAsset(existing.publicId);
  },

  listPages() {
    return contentRepository.findPages(false);
  },

  upsertPage(input: {
    slug: string;
    title: string;
    content: string;
    metaTitle?: string | null;
    metaDescription?: string | null;
    isPublished: boolean;
  }) {
    return contentRepository.upsertPage(input);
  },

  async deletePage(slug: string) {
    const existing = await contentRepository.findPageBySlug(slug, false);
    if (!existing) throw ApiError.notFound('Page not found');
    return contentRepository.deletePage(slug);
  },

  listContactMessages(skip: number, take: number, unreadOnly?: boolean) {
    return contentRepository.findContactMessages(skip, take, unreadOnly);
  },

  markMessageRead(id: string) {
    return contentRepository.markMessageRead(id);
  },
};
