import { Body, Controller, Get, Param, ParseIntPipe, Post } from '@nestjs/common';
import { RestaurantService } from './restaurant.service.js';
import { CreateRestaurantDto } from './dtos/restaurant.dto.js';

@Controller('restaurants')
export class RestaurantController {
  constructor(private readonly restaurantService: RestaurantService) {}

  @Post()
  async create(@Body() dto: CreateRestaurantDto) {
    return this.restaurantService.create(dto);
  }

  @Get('/tenant/:tenantId')
  async findAllRestaurantByTenant(
    @Param('tenantId', ParseIntPipe) tenantId: number,
  ) {
    return this.restaurantService.findActiveRestaurantsByTenant(tenantId);
  }
}
