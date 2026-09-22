import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateCategoryDto, CreateMenuDto } from './dto/create-menu.dto.js';
import { UpdateMenuDto } from './dto/update-menu.dto.js';
import { Prisma, PrismaService } from '@foodengine/database';

@Injectable()
export class MenuService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new menu category for a restaurant.
   */
  async create(createCategoryDto: CreateCategoryDto) {
    return this.prisma.menuCategory.create({
      data: createCategoryDto,
    });
  }

  /**
   * Retrieve all active (non-deleted) categories for a given restaurant,
   * ordered by display order.
   */
  async getCategories(restaurantId: number) {
    return this.prisma.menuCategory.findMany({
      where: { restaurantId, deletedAt: null },
      orderBy: { displayOrder: 'asc' },
    });
  }

  /**
   * Create a new menu item under an optional category.
   */
  async createMenu(createMenuDto: CreateMenuDto) {
    return this.prisma.menuItem.create({
      data: {
        restaurantId: createMenuDto.restaurantId,
        tenantId: createMenuDto.tenantId,
        menuCategoryId: createMenuDto.categoryId || null,
        name: createMenuDto.name,
        description: createMenuDto.description || '',
        price: new Prisma.Decimal(createMenuDto.price),
        isAvailable:
          createMenuDto.isAvailable !== undefined
            ? createMenuDto.isAvailable
            : true,
      },
    });
  }

  /**
   * Retrieve the full restaurant menu grouped by categories.
   * Only returns active categories and available menu items.
   */
  async getFullMenu(restaurantId: number) {
    return this.prisma.menuCategory.findMany({
      where: {
        restaurantId,
        deletedAt: null,
      },
      orderBy: {
        displayOrder: 'asc',
      },
      include: {
        menuItems: {
          where: {
            deletedAt: null,
            isAvailable: true,
          },
          orderBy: {
            name: 'asc',
          },
        },
      },
    });
  }

  /**
   * Update a menu item's details (name, description, price, availability).
   */
  async updateMenuItem(id: number, updateMenuDto: UpdateMenuDto) {
    const item = await this.prisma.menuItem.findUnique({
      where: { id },
    });

    if (!item || item.deletedAt) {
      throw new NotFoundException(`Menu item with ID ${id} not found`);
    }

    return this.prisma.menuItem.update({
      where: { id },
      data: {
        price: updateMenuDto.price,
        isAvailable: updateMenuDto.isAvailable,
        name: updateMenuDto.name,
        description: updateMenuDto.description,
      },
    });
  }

  /**
   * Soft-delete a menu item by setting its deletedAt timestamp.
   */
  async remove(id: number) {
    const item = await this.prisma.menuItem.findUnique({
      where: { id },
    });

    if (!item || item.deletedAt) {
      throw new NotFoundException(`Menu item with ID ${id} not found`);
    }

    return this.prisma.menuItem.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
