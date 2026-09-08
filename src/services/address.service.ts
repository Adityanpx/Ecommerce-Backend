import { addressRepository } from '../repositories/address.repository';
import { ApiError } from '../utils/ApiError';

const MAX_ADDRESSES = 10;

export const addressService = {
  list(userId: string) {
    return addressRepository.findByUser(userId);
  },

  async create(userId: string, input: Record<string, unknown>) {
    const count = await addressRepository.count(userId);
    if (count >= MAX_ADDRESSES) {
      throw ApiError.badRequest(`You can save at most ${MAX_ADDRESSES} addresses`);
    }

    // The very first address is always the default.
    const isDefault = count === 0 ? true : Boolean(input.isDefault);

    const address = await addressRepository.create({
      ...input,
      userId,
      isDefault,
    } as never);

    if (isDefault) await addressRepository.setDefault(userId, address.id);

    return address;
  },

  async update(userId: string, id: string, input: Record<string, unknown>) {
    const existing = await addressRepository.findById(id);
    if (!existing) throw ApiError.notFound('Address not found');
    if (existing.userId !== userId) throw ApiError.forbidden('This address does not belong to you');

    const { isDefault, ...rest } = input;
    const updated = await addressRepository.update(id, rest as never);

    if (isDefault === true) await addressRepository.setDefault(userId, id);

    return updated;
  },

  async remove(userId: string, id: string) {
    const existing = await addressRepository.findById(id);
    if (!existing) throw ApiError.notFound('Address not found');
    if (existing.userId !== userId) throw ApiError.forbidden('This address does not belong to you');

    await addressRepository.delete(id);

    // If the default was deleted, promote the most recent remaining address.
    if (existing.isDefault) {
      const remaining = await addressRepository.findByUser(userId);
      if (remaining.length > 0) {
        await addressRepository.setDefault(userId, remaining[0].id);
      }
    }
  },

  async setDefault(userId: string, id: string) {
    const existing = await addressRepository.findById(id);
    if (!existing) throw ApiError.notFound('Address not found');
    if (existing.userId !== userId) throw ApiError.forbidden('This address does not belong to you');

    await addressRepository.setDefault(userId, id);
    return addressRepository.findById(id);
  },
};
