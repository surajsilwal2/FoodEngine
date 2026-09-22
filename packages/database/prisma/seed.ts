import { PrismaClient, UserRole } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // 1. Clean existing records from children to parents. The explicit order is
  // required because several relations use `onDelete: Restrict`.
  await prisma.delivery.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.menuItem.deleteMany();
  await prisma.menuCategory.deleteMany();
  await prisma.restaurant.deleteMany();
  await prisma.tenantMember.deleteMany();
  await prisma.tenant.deleteMany();
  await prisma.driverProfile.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.user.deleteMany();

  console.log('🧹 Cleaned existing database tables.');

  // 2. Create a Tenant
  const tenant = await prisma.tenant.create({
    data: {
      name: 'Burger King Corporate',
    },
  });
  console.log(`✅ Tenant created: ${tenant.name} (ID: ${tenant.id})`);

  // 3. Create a platform System Admin User.
  // Override this development-only default with SEED_SYSTEM_ADMIN_PASSWORD.
  const systemAdminPassword =
    process.env.SEED_SYSTEM_ADMIN_PASSWORD ?? 'ChangeMe123!';
  const systemAdmin = await prisma.user.create({
    data: {
      name: 'FoodEngine System Admin',
      email: 'admin@foodengine.local',
      passwordHash: await bcrypt.hash(systemAdminPassword, 12),
      userRole: UserRole.SYSTEM_ADMIN,
    },
  });
  console.log(`âœ… System admin created: ${systemAdmin.email}`);

  // 4. Create a Merchant Admin User
  const adminUser = await prisma.user.create({
    data: {
      name: 'Alex Merchant',
      email: 'alex@burgerking.com',
      passwordHash: await bcrypt.hash('ChangeMe123!', 12),
      userRole: UserRole.MERCHANT_ADMIN,
    },
  });
  console.log(`✅ User created: ${adminUser.name} (ID: ${adminUser.id})`);

  // 5. Link the merchant admin to the tenant.
  await prisma.tenantMember.create({
    data: {
      userId: adminUser.id,
      tenantId: tenant.id,
      role: UserRole.MERCHANT_ADMIN,
    },
  });
  console.log(`✅ Linked ${adminUser.name} to ${tenant.name} as MERCHANT_ADMIN`);

  // 6. Create a Restaurant
  const restaurant = await prisma.restaurant.create({
    data: {
      tenantId: tenant.id,
      name: 'Burger King Downtown',
      location: '123 Main Street, Sector 4',
      description: 'Home of the Whopper - Downtown Branch',
      isOpen: true,
    },
  });
  console.log(`✅ Restaurant created: ${restaurant.name} (ID: ${restaurant.id})`);

  console.log('🚀 Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
