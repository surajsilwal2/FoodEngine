export interface MenuItem {
  id: number;
  restaurantId: number;
  tenantId: number;
  menuCategoryId: number | null;
  name: string;
  price: string; // Decimal returned as string from API
  description: string | null;
  isAvailable: boolean;
}

export interface MenuCategory {
  id: number;
  restaurantId: number;
  tenantId: number;
  name: string;
  displayOrder: number;
  menuItems: MenuItem[];
}

export interface Restaurant {
  id: number;
  tenantId: number;
  name: string;
  location: string;
  description: string;
  isOpen: boolean;
}
