import {
  OrderStatus,
  PaymentMethod,
  PrismaService,
} from '@foodengine/database';
import { describe, expect, it, vi } from 'vitest';
import { DispatchGateway } from '../dispatch/dispatch.gateway.js';
import { PaymentsService } from './payments.service.js';

function createPrisma(restaurantIsOpen: boolean) {
  return {
    order: {
      findUnique: vi.fn().mockResolvedValue({
        id: 31,
        customerId: 9,
        tenantId: 4,
        restaurantId: 12,
        total: '250.00',
        status: OrderStatus.PENDING,
        deletedAt: null,
        payment: null,
        restaurant: {
          id: 12,
          isOpen: restaurantIsOpen,
          deletedAt: null,
        },
      }),
    },
    $transaction: vi.fn(),
  };
}

describe('PaymentsService.createPayment', () => {
  it('does not pay a pending order after its restaurant has closed', async () => {
    const prisma = createPrisma(false);
    const service = new PaymentsService(
      prisma as unknown as PrismaService,
      {} as DispatchGateway,
    );

    await expect(
      service.createPayment(9, {
        orderId: 31,
        paymentMethod: PaymentMethod.MOCK_CARD,
      }),
    ).rejects.toThrow('This restaurant is closed and cannot accept payment');
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('rejects cash on delivery until collection is implemented', async () => {
    const prisma = createPrisma(true);
    const service = new PaymentsService(
      prisma as unknown as PrismaService,
      {} as DispatchGateway,
    );

    await expect(
      service.createPayment(9, {
        orderId: 31,
        paymentMethod: PaymentMethod.CASH_ON_DELIVERY,
      }),
    ).rejects.toThrow('Cash on delivery is not available yet');
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});