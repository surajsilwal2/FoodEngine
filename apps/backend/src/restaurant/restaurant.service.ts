import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateRestaurantDto } from './dtos/restaurant.dto.js';
import { PrismaService } from '@foodengine/database';

@Injectable()
export class RestaurantService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateRestaurantDto) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: dto.tenantId },
    });
    if (!tenant) throw new NotFoundException("Tenant doesn't exists");

    return await this.prisma.restaurant.create({
      data: dto,
    });
  }

  async findActiveRestaurantsByTenant(tenantId: number) {
    return await this.prisma.restaurant.findMany({
      where: {
        tenantId,
        deletedAt: null,
      },
    });
  }
}
