import { Injectable } from '@nestjs/common';
import { CreateTenantDto } from './dto/create-tenant.dto.js';
import { UpdateTenantDto } from './dto/update-tenant.dto.js';
import { PrismaService, UserRole } from '@foodengine/database';

@Injectable()
export class TenantService {
  constructor(private readonly prisma: PrismaService) {}
  async create(createTenantDto: CreateTenantDto, userId: number) {
    return this.prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: {
          name: createTenantDto.businessName,
        },
      });

      const member = await tx.tenantMember.create({
        data: { userId, role: UserRole.MERCHANT_ADMIN, tenantId: tenant.id },
      });

      return {
        tenant,
        membership: { role: member.role, userId: member.userId },
      };
    });
  }

  // get all tenant where user is the member
  async findUserTenants(userId: number) {
    const memberships = await this.prisma.tenantMember.findMany({
      where: { userId },
      include: { tenant: true },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return memberships.map((member) => ({
      tenantId: member.tenantId,
      tenantName: member.tenant.name,
      role: member.role,
      joinedAt: member.createdAt,
    }));
  }

  findOne(id: number) {
    return `This action returns a #${id} tenant`;
  }

  update(id: number, updateTenantDto: UpdateTenantDto) {
    return `This action updates a #${id} tenant`;
  }

  remove(id: number) {
    return `This action removes a #${id} tenant`;
  }
}
