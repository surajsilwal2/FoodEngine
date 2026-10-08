import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  MerchantApplicationStatus,
  Prisma,
  PrismaService,
  UserRole,
} from '@foodengine/database';
import { CreateMerchantApplicationDto } from './dto/create-merchant-application.dto.js';

@Injectable()
export class TenantService {
  constructor(private readonly prisma: PrismaService) {}

  async submitApplication(dto: CreateMerchantApplicationDto, userId: number) {
    const existing = await this.prisma.merchantApplication.findUnique({
      where: { applicantId: userId },
    });

    if (!existing) {
      try {
        return await this.prisma.merchantApplication.create({
          data: { ...dto, applicantId: userId },
        });
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2002'
        ) {
          throw new ConflictException(
            'A merchant application has already been submitted for this account',
          );
        }
        throw error;
      }
    }

    if (existing.status !== MerchantApplicationStatus.REJECTED) {
      throw new ConflictException(
        'A merchant application has already been submitted for this account',
      );
    }

    return this.prisma.merchantApplication.update({
      where: { id: existing.id },
      data: {
        ...dto,
        status: MerchantApplicationStatus.PENDING,
        reviewNote: null,
        reviewedById: null,
        reviewedAt: null,
        tenantId: null,
      },
    });
  }

  getMyApplication(userId: number) {
    return this.prisma.merchantApplication.findUnique({
      where: { applicantId: userId },
      include: { tenant: { select: { id: true, name: true } } },
    });
  }

  getPendingApplications() {
    return this.prisma.merchantApplication.findMany({
      where: { status: MerchantApplicationStatus.PENDING },
      include: {
        applicant: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async reviewApplication(
    applicationId: number,
    decision: 'APPROVED' | 'REJECTED',
    reviewerId: number,
    reviewNote?: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const status =
        decision === 'APPROVED'
          ? MerchantApplicationStatus.APPROVED
          : MerchantApplicationStatus.REJECTED;
      const updated = await tx.merchantApplication.updateMany({
        where: {
          id: applicationId,
          status: MerchantApplicationStatus.PENDING,
        },
        data: {
          status,
          reviewedById: reviewerId,
          reviewedAt: new Date(),
          reviewNote,
        },
      });

      // updated.count === 0 means no rows were updated, which implies either the application doesn't exist or it's not in a pending state
      if (updated.count === 0) {
        const application = await tx.merchantApplication.findUnique({
          where: { id: applicationId },
          select: { id: true },
        });
        if (!application) {
          throw new NotFoundException('Merchant application not found');
        }
        throw new ConflictException(
          'Only pending merchant applications can be reviewed',
        );
      }

      // this block will only execute if the application was approved, creating a new tenant and associating the applicant with it
      if (decision === 'APPROVED') {
        const application = await tx.merchantApplication.findUniqueOrThrow({
          where: { id: applicationId },
        });
        const tenant = await tx.tenant.create({
          data: { name: application.businessName },
        });
        await tx.tenantMember.create({
          data: {
            userId: application.applicantId,
            tenantId: tenant.id,
            role: UserRole.MERCHANT_ADMIN,
          },
        });
        await tx.merchantApplication.update({
          where: { id: applicationId },
          data: { tenantId: tenant.id },
        });
        await tx.user.update({
          where: { id: application.applicantId },
          data: { userRole: UserRole.MERCHANT_ADMIN },
        });
      }

      return tx.merchantApplication.findUniqueOrThrow({
        where: { id: applicationId },
        include: {
          tenant: { select: { id: true, name: true } },
          applicant: { select: { id: true, name: true, email: true } },
        },
      });
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
}
