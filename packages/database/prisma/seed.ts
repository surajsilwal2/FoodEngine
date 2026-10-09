import {
  MerchantApplicationStatus,
  PrismaClient,
  UserRole,
} from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  const tenant =
    (await prisma.tenant.findFirst({
      where: { name: 'Burger King Corporate' },
    })) ??
    (await prisma.tenant.create({
      data: { name: 'Burger King Corporate' },
    }));
  console.log(`✅ Tenant created: ${tenant.name} (ID: ${tenant.id})`);

  const systemAdminPassword =
    process.env.SEED_SYSTEM_ADMIN_PASSWORD ?? 'ChangeMe123!';
  const systemAdmin = await prisma.user.upsert({
    where: { email: 'admin@foodengine.local' },
    update: {},
    create: {
      name: 'FoodEngine System Admin',
      email: 'admin@foodengine.local',
      passwordHash: await bcrypt.hash(systemAdminPassword, 12),
      userRole: UserRole.SYSTEM_ADMIN,
    },
  });
  console.log(`âœ… System admin created: ${systemAdmin.email}`);

  const adminUser = await prisma.user.upsert({
    where: { email: 'alex@burgerking.com' },
    update: { userRole: UserRole.CUSTOMER },
    create: {
      name: 'Alex Merchant',
      email: 'alex@burgerking.com',
      passwordHash: await bcrypt.hash('ChangeMe123!', 12),
      userRole: UserRole.CUSTOMER,
    },
  });
  console.log(`✅ User created: ${adminUser.name} (ID: ${adminUser.id})`);

  await prisma.tenantMember.upsert({
    where: { userId_tenantId: { userId: adminUser.id, tenantId: tenant.id } },
    update: {},
    create: {
      userId: adminUser.id,
      tenantId: tenant.id,
      role: UserRole.MERCHANT_ADMIN,
    },
  });
  console.log(`✅ Linked ${adminUser.name} to ${tenant.name} as MERCHANT_ADMIN`);

  await prisma.merchantApplication.upsert({
    where: { applicantId: adminUser.id },
    update: {
      businessName: tenant.name,
      businessAddress: '123 Main Street, Sector 4',
      contactPhone: '9800000000',
      status: MerchantApplicationStatus.APPROVED,
      reviewNote: 'Approved for local development.',
      reviewedById: systemAdmin.id,
      reviewedAt: new Date(),
      tenantId: tenant.id,
    },
    create: {
      applicantId: adminUser.id,
      businessName: tenant.name,
      businessAddress: '123 Main Street, Sector 4',
      contactPhone: '9800000000',
      status: MerchantApplicationStatus.APPROVED,
      reviewNote: 'Approved for local development.',
      reviewedById: systemAdmin.id,
      reviewedAt: new Date(),
      tenantId: tenant.id,
    },
  });
  console.log(`✅ Approved merchant application seeded for ${adminUser.email}`);

  const driverPassword = process.env.SEED_DRIVER_PASSWORD ?? 'ChangeMe123!';
  const driverUser = await prisma.user.upsert({
    where: { email: 'driver@foodengine.local' },
    update: { userRole: UserRole.DRIVER },
    create: {
      name: 'Sam Driver',
      email: 'driver@foodengine.local',
      passwordHash: await bcrypt.hash(driverPassword, 12),
      userRole: UserRole.DRIVER,
    },
  });

  await prisma.driverProfile.upsert({
    where: { userId: driverUser.id },
    update: {
      licenseNumber: 'FE-DRIVER-001',
      vehicleDetails: 'Black scooter',
      isApproved: true,
      isOnline: true,
      currentLat: 27.7172,
      currentLong: 85.3240,
    },
    create: {
      userId: driverUser.id,
      licenseNumber: 'FE-DRIVER-001',
      vehicleDetails: 'Black scooter',
      isApproved: true,
      isOnline: true,
      currentLat: 27.7172,
      currentLong: 85.3240,
    },
  });
  console.log(`✅ Approved driver seeded for ${driverUser.email}`);

  // Menu prices are in Nepali Rupees (NPR).
  const restaurants = [
    {
      name: 'Burger King Downtown',
      location: '123 Main Street, Sector 4',
      description: 'Flame-grilled burgers and classic sides downtown.',
      restaurantLat: 27.7172,
      restaurantLng: 85.3240,
      categories: [
        {
          name: 'Burgers',
          dishes: [
            { name: 'Classic Whopper', price: '550.00', description: 'Flame-grilled beef, lettuce, tomato, and onion.' },
            { name: 'Crispy Chicken Sandwich', price: '480.00', description: 'Crispy chicken with lettuce and house sauce.' },
          ],
        },
        {
          name: 'Sides',
          dishes: [
            { name: 'Golden Onion Rings', price: '250.00', description: 'Crisp battered onion rings.' },
          ],
        },
      ],
    },
    {
      name: 'Sunrise Bowl & Juice',
      location: '48 Market Street, Sector 2',
      description: 'Fresh grain bowls, salads, and cold-pressed juices.',
      restaurantLat: 27.7050,
      restaurantLng: 85.3150,
      categories: [
        {
          name: 'Fresh Bowls',
          dishes: [
            { name: 'Lemon Herb Grain Bowl', price: '520.00', description: 'Brown rice, roasted vegetables, and lemon herb dressing.' },
            { name: 'Crispy Falafel Wrap', price: '420.00', description: 'Falafel, greens, cucumber, and tahini in a warm wrap.' },
            { name: 'Avocado Chickpea Salad', price: '480.00', description: 'Chickpeas, avocado, greens, and citrus vinaigrette.' },
          ],
        },
      ],
    },
    {
      name: 'Pasta Corner',
      location: '205 River Avenue, Sector 7',
      description: 'Comforting Italian pasta made fresh to order.',
      restaurantLat: 27.7250,
      restaurantLng: 85.3350,
      categories: [
        {
          name: 'Pasta',
          dishes: [
            { name: 'Tomato Basil Penne', price: '520.00', description: 'Penne with slow-cooked tomato sauce and fresh basil.' },
            { name: 'Creamy Mushroom Fettuccine', price: '620.00', description: 'Fettuccine with mushrooms and parmesan cream sauce.' },
            { name: 'Baked Four Cheese Pasta', price: '690.00', description: 'Oven-baked pasta with mozzarella, parmesan, ricotta, and provolone.' },
          ],
        },
      ],
    },
  ];

  for (const [restaurantIndex, restaurantData] of restaurants.entries()) {
    const restaurant =
      (await prisma.restaurant.findFirst({
        where: { tenantId: tenant.id, name: restaurantData.name },
      })) ??
      (await prisma.restaurant.create({
        data: {
          tenantId: tenant.id,
          name: restaurantData.name,
          location: restaurantData.location,
          description: restaurantData.description,
          restaurantLat: restaurantData.restaurantLat,
          restaurantLng: restaurantData.restaurantLng,
          isOpen: true,
        },
      }));

    for (const [categoryIndex, categoryData] of restaurantData.categories.entries()) {
      const category =
        (await prisma.menuCategory.findFirst({
          where: { restaurantId: restaurant.id, name: categoryData.name },
        })) ??
        (await prisma.menuCategory.create({
          data: {
            tenantId: tenant.id,
            restaurantId: restaurant.id,
            name: categoryData.name,
            displayOrder: categoryIndex,
          },
        }));

      for (const dish of categoryData.dishes) {
        const existingDish = await prisma.menuItem.findFirst({
          where: { restaurantId: restaurant.id, name: dish.name },
        });
        if (!existingDish) {
          await prisma.menuItem.create({
            data: {
              restaurantId: restaurant.id,
              tenantId: tenant.id,
              menuCategoryId: category.id,
              name: dish.name,
              price: dish.price,
              description: dish.description,
            },
          });
        }
      }
    }

    console.log(
      `✅ Restaurant seeded: ${restaurant.name} (${restaurantIndex + 1}/${restaurants.length})`,
    );
  }

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
