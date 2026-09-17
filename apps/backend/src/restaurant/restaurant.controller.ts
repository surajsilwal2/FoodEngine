import { Body, Controller, Get, Param, ParseIntPipe, Post } from '@nestjs/common';
import { RestaurantService } from './restaurant.service.js';
import * as restaurantDto from '../dto/restaurant.dto.js';

@Controller('restaurant')
export class RestaurantController {
  constructor(private readonly restaurantService: RestaurantService) {}

  @Post()
  async create(@Body() dto: restaurantDto.RestaurantDto) {
    return this.restaurantService.create(dto);
  }

    @Get('/tenant/:tenantId') 
    async findAllRestaurantByTenant(@Param('tenantId', ParseIntPipe) tenantId: number) {
        return this.restaurantService.findActiveRestaurantsByTenant(tenantId)
      }
    
}
