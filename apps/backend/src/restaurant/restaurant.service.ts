import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateRestaurantDto } from './dtos/restaurant.dto.js';
import { PrismaService } from '@foodengine/database';
import { UpdateRestaurantDto } from './dtos/update-restaurant.dto.js';

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

  // find all restaurant of specific tenant
  async findActiveRestaurantsByTenant(tenantId: number) {
    return await this.prisma.restaurant.findMany({
      where: {
        tenantId,
        deletedAt: null,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  // find single restaurant by id
  async findOne(id: number) {
    const restaurant = await this.prisma.restaurant.findFirst({
      where: {
        id: id,
        deletedAt: null,
      },
    });
    if (!restaurant) throw new NotFoundException('Restaurant not found');
    return restaurant;
  }

  // update the restaurant details
  async update(id: number, dto: UpdateRestaurantDto) {
    const restaurant = await this.prisma.restaurant.findFirst({
      where: { id, deletedAt: null },
    });
    if (!restaurant) throw new NotFoundException('Restaurant not found');
    return this.prisma.restaurant.update({
      where: { id },
      data: dto,
    });
  }
}
