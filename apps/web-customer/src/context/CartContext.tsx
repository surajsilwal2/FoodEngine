"use client";

import type { MenuItem } from "@/types/catalog";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useEffectEvent,
  useMemo,
  useState,
} from "react";

export interface CartItem {
  menuItem: MenuItem;
  quantity: number;
}

interface CartState {
  items: CartItem[];
  restaurantId: number | null;
  tenantId: number | null;
  version: number;
}

interface CartContextValue extends CartState {
  isHydrated: boolean;
  totalItems: number;
  subTotalInPaisa: number;
  addItem: (item: MenuItem) => void;
  removeItem: (menuItemId: number) => void;
  updateItem: (menuItemId: number, delta: number) => void;
  clearState: () => void;
}

const STORAGE_KEY = "cart";
const SCHEMA_VERSION = 1;

const EMPTY_STATE: CartState = {
  items: [],
  restaurantId: null,
  tenantId: null,
  version: SCHEMA_VERSION,
};

const CartContext = createContext<CartContextValue | undefined>(undefined);

function loadPersistedCart(): CartState | null {
  if (typeof window === "undefined") return null;

  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw);

    if (parsed?.version !== SCHEMA_VERSION) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }

    if (!Array.isArray(parsed.items)) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }

    return {
      items: parsed.items,
      restaurantId: parsed.restaurantId ?? null,
      tenantId: parsed.tenantId ?? null,
      version: SCHEMA_VERSION,
    };
  } catch {
    localStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

function persistCart(cart: CartState) {
  if (typeof window === "undefined") return;

  if (cart.items.length === 0) {
    localStorage.removeItem(STORAGE_KEY);
    return null;
  } else {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
  }
}

function addItemToCart(state: CartState, item: MenuItem): CartState {
  const isDifferentRestaurant =
    state.restaurantId !== item.restaurantId && state.restaurantId !== null;

  if (isDifferentRestaurant) {
    const confirmed = window.confirm(
      "Your cart contains items from another restaurant. Clear cart and start a new order?",
    );
    if (!confirmed) return state;
    return {
      items: [{ menuItem: item, quantity: 1 }],
      restaurantId: item.restaurantId,
      tenantId: item.tenantId,
      version: SCHEMA_VERSION,
    };
  }

  const existing = state.items.find((i) => i.menuItem.id === item.id);
  const newItems = existing
    ? state.items.map((i) =>
        i.menuItem.id === item.id ? { ...i, quantity: i.quantity + 1 } : i,
      )
    : [...state.items, { menuItem: item, quantity: 1 }];

  return {
    items: newItems,
    restaurantId: item.restaurantId,
    tenantId: item.tenantId,
    version: SCHEMA_VERSION,
  };
}

function updateQuantityInState(
  state: CartState,
  menuItemId: number,
  delta: number,
): CartState {
  const nextItems = state.items
    .map((i) => {
      if (i.menuItem.id !== menuItemId) return i;
      const qty = i.quantity + delta;
      return qty > 0 ? { ...i, quantity: qty } : null;
    })
    .filter((i): i is CartItem => i !== null);

  if (nextItems.length === 0) {
    return { ...EMPTY_STATE };
  }

  return {
    ...state,
    items: nextItems,
  };
}

function removeItemFromState(state: CartState, menuItemId: number): CartState {
  const nextItems = state.items.filter((i) => i.menuItem.id !== menuItemId);

  if (nextItems.length === 0) {
    return { ...EMPTY_STATE };
  }

  return { ...state, items: nextItems };
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<CartState>(EMPTY_STATE);
  const [isHydrated, setIsHydrated] = useState(false);

  const restoreCart = useEffectEvent(() => {
    const persisted = loadPersistedCart();
    if (persisted) setCart(persisted);
    setIsHydrated(true);
  });

  useEffect(() => {
    // Deferring storage hydration avoids synchronous state updates in the effect.
    const restoreTimer = window.setTimeout(restoreCart, 0);
    return () => window.clearTimeout(restoreTimer);
  }, []);

  const applyUpdate = useCallback((updater: (prev: CartState) => CartState) => {
    setCart((prev) => {
      const next = updater(prev);
      if (next === prev) return prev;
      persistCart(next);
      return next;
    });
  }, []);

  const addItem = useCallback(
    (item: MenuItem) => {
      applyUpdate((prev) => addItemToCart(prev, item));
    },
    [applyUpdate],
  );

  const updateQuantity = useCallback(
    (menuItemId: number, delta: number) =>
      applyUpdate((prev) => updateQuantityInState(prev, menuItemId, delta)),
    [applyUpdate],
  );

  const removeItem = useCallback(
    (menuItemId: number) =>
      applyUpdate((prev) => removeItemFromState(prev, menuItemId)),
    [applyUpdate],
  );

  const clearCart = useCallback(() => {
    applyUpdate(() => ({ ...EMPTY_STATE }));
  }, [applyUpdate]);

  const totalItems = useMemo(
    () => cart.items.reduce((sum, i) => sum + i.quantity, 0),
    [cart.items],
  );

  const subtotalInPaisa = useMemo(
    () =>
      cart.items.reduce(
        (sum, i) => sum + Number(i.menuItem.price) * i.quantity,
        0,
      ),
    [cart.items],
  );

  const value = useMemo<CartContextValue>(
    () => ({
      ...cart,
      isHydrated,
      totalItems,
      subTotalInPaisa: subtotalInPaisa,
      addItem,
      removeItem,
      updateItem: updateQuantity,
      clearState: clearCart,
    }),
    [
      cart,
      isHydrated,
      totalItems,
      subtotalInPaisa,
      addItem,
      removeItem,
      updateQuantity,
      clearCart,
    ],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}


export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return ctx;
}
