import {
  BadRequestException,
  ForbiddenException,
  forwardRef,
  Inject,
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
import { DispatchGateway } from '../dispatch/dispatch.gateway.js';

@Injectable()
export class DriverService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
    @Inject(forwardRef(() => DispatchGateway))
    private readonly dispatchGateway: DispatchGateway,
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
    const updatedProfile = await this.prisma.driverProfile.update({
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

    const redis = this.redisService.getClient();
    if (!dto.isOnline) {
      // Offline drivers must leave the GEO index; otherwise dispatch can offer
      // work to a driver who has deliberately stopped accepting deliveries.
      await redis.zrem('drivers:locations', profile.id.toString());
    } else if (profile.currentLat !== null && profile.currentLong !== null) {
      // Re-add the most recently persisted location when a driver comes back
      // online, so they can be discovered without sending a second GPS update.
      await redis.geoadd(
        'drivers:locations',
        profile.currentLong,
        profile.currentLat,
        profile.id.toString(),
      );
    }

    return updatedProfile;
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

    const updatedProfile = await this.prisma.$transaction(async (tx) => {
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

    if (!dto.isApproved) {
      // Revoked profiles are no longer eligible even if a previous location
      // remains in Redis, so remove that GEO member immediately.
      await this.redisService
        .getClient()
        .zrem('drivers:locations', driverProfileId.toString());
    }

    return updatedProfile;
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

    // Postgres is the durable source of the driver's latest position. Update
    // it before Redis so a failed database write cannot leave a fake location
    // that dispatch would treat as real.
    const updatedProfile = await this.prisma.driverProfile.update({
      where: { id: profile.id },
      data: {
        currentLat: dto.lat,
        currentLong: dto.lng,
      },
    });

    const redis = this.redisService.getClient();
    if (profile.isOnline) {
      // This GEO index intentionally contains only online, approved drivers.
      // Redis GEOADD uses longitude first and profile ID as the stable member.
      await redis.geoadd('drivers:locations', dto.lng, dto.lat, profile.id.toString());
    } else {
      // A location received while offline is retained in Postgres, but never
      // exposed to dispatch as an available-driver location.
      await redis.zrem('drivers:locations', profile.id.toString());
    }

    // Share precise GPS only for the driver's picked-up order; order-room
    // authorization ensures only that order's customer receives the update.
    const pickedUpDelivery = await this.prisma.delivery.findFirst({
      where: {
        driverProfileId: profile.id,
        status: 'PICKED_UP',
      },
      select: { orderId: true },
    });
    if (pickedUpDelivery) {
      this.dispatchGateway.notifyOrderStatus(pickedUpDelivery.orderId, {
        driverLocation: {
          lat: dto.lat,
          lng: dto.lng,
          updatedAt: updatedProfile.updatedAt,
        },
      });
    }

    return updatedProfile;
  }

  async findNearbyAvailableDrivers(
    restaurantLat: number,
    restaurantLng: number,
    radiusKm: number = 5,
  ) {
    const redis = this.redisService.getClient();

    if (!Number.isFinite(restaurantLat) || !Number.isFinite(restaurantLng)) {
      throw new BadRequestException('Restaurant location is required for dispatch');
    }

    // Redis provides a distance-sorted candidate list efficiently. It is not
    // the source of truth for availability, so candidates are checked in
    // Postgres below before any delivery offer is sent.
    //
    // The centre keyword is FROMLONLAT. "FROMLONGLAT" is not a Redis keyword,
    // so the server rejects the entire command with "ERR syntax error" and no
    // driver offer is ever sent.
    // GEOSEARCH key FROMLONLAT longitude latitude BYRADIUS radius KM ASC
    const nearbyDriverIds = await redis.geosearch(
      'drivers:locations',
      'FROMLONLAT',
      restaurantLng,
      restaurantLat,
      'BYRADIUS',
      radiusKm,
      'KM',
      'ASC',
    );
    const orderedProfileIds = (nearbyDriverIds as string[])
      .map((id) => Number.parseInt(id, 10))
      .filter(Number.isSafeInteger);
    if (orderedProfileIds.length === 0) return [];

    const availableProfiles = await this.prisma.driverProfile.findMany({
      where: {
        id: { in: orderedProfileIds },
        isApproved: true,
        isOnline: true,
        currentLat: { not: null },
        currentLong: { not: null },
        // A driver already assigned to an active delivery cannot receive a
        // second offer. SEARCHING is excluded because it has no driver yet.
        deliveries: {
          none: { status: { in: ['ASSIGNED', 'PICKED_UP'] } },
        },
      },
      select: { id: true },
    });
    const availableIds = new Set(availableProfiles.map((profile) => profile.id));

    // Preserve Redis's nearest-first ordering after the database filter.
    return orderedProfileIds.filter((profileId) => availableIds.has(profileId));
  }
}