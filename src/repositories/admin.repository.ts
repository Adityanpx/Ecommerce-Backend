import { Admin } from '@prisma/client';
import { prisma } from '../config/database';

export const adminRepository = {
  findById(id: string): Promise<Admin | null> {
    return prisma.admin.findUnique({ where: { id } });
  },

  findByEmail(email: string): Promise<Admin | null> {
    return prisma.admin.findUnique({ where: { email } });
  },

  touchLastLogin(id: string): Promise<Admin> {
    return prisma.admin.update({ where: { id }, data: { lastLoginAt: new Date() } });
  },
};
