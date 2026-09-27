import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ApplyDriverDto,
  ApproveDriverDto,
  AvailableDriverDto,
} from './dto/create-driver.dto.js';

import { PrismaService, UserRole } from '@foodengine/database';
import { RedisService } from '../redis/redis.service.js';
import { updateLocationDto } from './dto/update-driver.dto.js';

@Injectable()
export class DriverService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
  ) {}

  async applyForDrivers(userId: number, dto: ApplyDriverDto) {
    const existingProfile = await this.prisma.driverProfile.findUnique({
      where: { userId },
    });
    if (existingProfile) {
      throw new BadRequestException(
        'You have already submitted a driver application',
      );
    }
    return this.prisma.driverProfile.create({
      data: {
        userId,
        licenseNumber: dto.licenseNumber,
        vehicleDetails: dto.vehicleDetails,
        isApproved: false,
        isOnline: false,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            userRole: true,
          },
        },
      },
    });
  }

  async getProfile(userId: number) {
    const profile = await this.prisma.driverProfile.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            userRole: true,
          },
        },
      },
    });
    if (!profile) {
      throw new NotFoundException(
        'Driver profile not found. Please apply first.',
      );
    }

    return profile;
  }

  // only approved drivers can go online
  async toggleAvailability(userId: number, dto: AvailableDriverDto) {
    const profile = await this.getProfile(userId);
    if (!profile.isApproved) {
      throw new ForbiddenException(
        'Your driver profile is pending verification by system administrators',
      );
    }
    return this.prisma.driverProfile.update({
      where: { userId },
      data: { isOnline: dto.isOnline },
      include: {
        user: {
          select: {
            userRole: true,
          },
        },
      },
    });
  }

  async setApprovalStatus(driverProfileId: number, dto: ApproveDriverDto) {
    const profile = await this.prisma.driverProfile.findUnique({
      where: { id: driverProfileId },
    });
    if (!profile) {
      throw new NotFoundException(
        `Driver profile with ID ${driverProfileId} not found`,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const updateProfile = await tx.driverProfile.update({
        where: { id: driverProfileId },
        data: {
          isApproved: dto.isApproved,
          ...(dto.isApproved === false && { isOnline: false }),
        },
        include: {
          user: {
            select: { id: true, name: true, email: true, userRole: true },
          },
        },
      });
      await tx.user.update({
        where: { id: profile.userId },
        data: {
          userRole: dto.isApproved ? UserRole.DRIVER : UserRole.CUSTOMER,
        },
      });
      return updateProfile;
    });
  }

  async listAllDriver() {
    return this.prisma.driverProfile.findMany({
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            userRole: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateLocation(userId: number, dto: updateLocationDto) {
    const profile = await this.prisma.driverProfile.findUnique({
      where: { userId },
    });
    if (!profile || !profile.isApproved) {
      throw new ForbiddenException('Only approved drivers can update location');
    }

    const redis = this.redisService.getClient();

    await redis.geoadd(
      'drivers:locations', // it is index name where gps coordinates are saved
      dto.lng,
      dto.lat,
      profile.id.toString(), // it act as identifier
    );
    return this.prisma.driverProfile.update({
      where: {id: profile.id},
      data: {
        currentLat: dto.lat,
        currentLong: dto.lng
      }
    })
  }

  // method to find nearby available drivers within a radius(in km)
  async findNearbyDrivers(
    restaurantLat: number,
    restaurantLng: number,
    radiusKm: number = 5,
  ) {
    const redis = this.redisService.getClient();

    // Redis GEOSEARCH command searches for members within a radius of coordinates
    const nearbyDriverIds = await redis.geosearch(
      'drivers:locations',
      'FROMLONGLAT',
      restaurantLng,
      restaurantLat,
      'BYRADIUS',
      radiusKm,
      'km',
      'ASC', // return nearest drivers first
    );
    return nearbyDriverIds // returns array of drivers Ids
  }
}
