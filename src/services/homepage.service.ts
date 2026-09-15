import { homepageRepository } from '../repositories/homepage.repository';
import { createUniqueSlug } from '../utils/slugify';
import { ApiError } from '../utils/ApiError';

export const homepageService = {
  // ---------- Announcements ----------

  listAnnouncements(activeOnly: boolean) {
    return homepageRepository.findAnnouncements(activeOnly);
  },

  createAnnouncement(input: Record<string, unknown>) {
    return homepageRepository.createAnnouncement(input as never);
  },

  async updateAnnouncement(id: string, input: Record<string, unknown>) {
    const existing = await homepageRepository.findAnnouncementById(id);
    if (!existing) throw ApiError.notFound('Announcement not found');
    return homepageRepository.updateAnnouncement(id, input as never);
  },

  async deleteAnnouncement(id: string) {
    const existing = await homepageRepository.findAnnouncementById(id);
    if (!existing) throw ApiError.notFound('Announcement not found');
    return homepageRepository.deleteAnnouncement(id);
  },

  // ---------- Trust Badges ----------

  listTrustBadges(activeOnly: boolean) {
    return homepageRepository.findTrustBadges(activeOnly);
  },

  createTrustBadge(input: Record<string, unknown>) {
    return homepageRepository.createTrustBadge(input as never);
  },

  async updateTrustBadge(id: string, input: Record<string, unknown>) {
    const existing = await homepageRepository.findTrustBadgeById(id);
    if (!existing) throw ApiError.notFound('Trust badge not found');
    return homepageRepository.updateTrustBadge(id, input as never);
  },

  async deleteTrustBadge(id: string) {
    const existing = await homepageRepository.findTrustBadgeById(id);
    if (!existing) throw ApiError.notFound('Trust badge not found');
    return homepageRepository.deleteTrustBadge(id);
  },

  // ---------- Testimonials ----------

  listTestimonials(activeOnly: boolean, sportId?: string) {
    return homepageRepository.findTestimonials(activeOnly, sportId);
  },

  createTestimonial(input: Record<string, unknown>) {
    return homepageRepository.createTestimonial(input as never);
  },

  async updateTestimonial(id: string, input: Record<string, unknown>) {
    const existing = await homepageRepository.findTestimonialById(id);
    if (!existing) throw ApiError.notFound('Testimonial not found');
    return homepageRepository.updateTestimonial(id, input as never);
  },

  async deleteTestimonial(id: string) {
    const existing = await homepageRepository.findTestimonialById(id);
    if (!existing) throw ApiError.notFound('Testimonial not found');
    return homepageRepository.deleteTestimonial(id);
  },

  // ---------- Collections ----------

  listCollections(activeOnly: boolean, sportId?: string) {
    return homepageRepository.findCollections(activeOnly, sportId);
  },

  async getCollection(id: string) {
    const collection = await homepageRepository.findCollectionById(id);
    if (!collection) throw ApiError.notFound('Collection not found');
    return collection;
  },

  async getCollectionBySlug(slug: string) {
    const collection = await homepageRepository.findCollectionBySlug(slug);
    if (!collection) throw ApiError.notFound('Collection not found');
    return collection;
  },

  async createCollection(input: {
    name: string;
    type?: string;
    description?: string | null;
    sportId?: string | null;
    imageUrl?: string | null;
    isActive?: boolean;
    displayOrder?: number;
  }) {
    const slugExists = async (s: string) => {
      const existing = await homepageRepository.findCollectionBySlug(s);
      return existing !== null;
    };
    const slug = await createUniqueSlug(input.name, slugExists);
    return homepageRepository.createCollection({ ...input, slug } as never);
  },

  async updateCollection(id: string, input: Record<string, unknown>) {
    const existing = await homepageRepository.findCollectionById(id);
    if (!existing) throw ApiError.notFound('Collection not found');
    return homepageRepository.updateCollection(id, input as never);
  },

  async deleteCollection(id: string) {
    const existing = await homepageRepository.findCollectionById(id);
    if (!existing) throw ApiError.notFound('Collection not found');
    return homepageRepository.deleteCollection(id);
  },

  async setCollectionProducts(id: string, productIds: string[]) {
    const existing = await homepageRepository.findCollectionById(id);
    if (!existing) throw ApiError.notFound('Collection not found');
    await homepageRepository.setCollectionProducts(id, productIds);
    return homepageRepository.findCollectionById(id);
  },

  // ---------- Featured Spotlights ----------

  listSpotlights(activeOnly: boolean) {
    return homepageRepository.findSpotlights(activeOnly);
  },

  getSpotlight(key: string) {
    return homepageRepository.findSpotlightByKey(key);
  },

  upsertSpotlight(input: {
    key: string;
    title?: string | null;
    subtitle?: string | null;
    description?: string | null;
    productId: string;
    isActive?: boolean;
  }) {
    return homepageRepository.upsertSpotlight(input);
  },

  async deleteSpotlight(key: string) {
    const existing = await homepageRepository.findSpotlightByKey(key);
    if (!existing) throw ApiError.notFound('Spotlight not found');
    return homepageRepository.deleteSpotlight(key);
  },
};
