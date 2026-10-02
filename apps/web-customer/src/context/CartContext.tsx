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
  /**
   * The unpaid order created from this cart, if one exists. Remembering it lets
   * the cart page resume its payment instead of creating a duplicate order.
   */
  pendingOrderId: number | null;
  version: number;
}

interface CartContextValue extends CartState {
  isHydrated: boolean;
  totalItems: number;
  subTotalInPaisa: number;
  addItem: (item: MenuItem) => void;
  removeItem: (menuItemId: number) => void;
  updateItem: (menuItemId: number, delta: number) => void;
  /** Records the order created from the current cart so payment can be resumed. */
  setPendingOrder: (orderId: number) => void;
  clearPendingOrder: () => void;
  clearState: () => void;
}

const STORAGE_KEY = "cart";
const SCHEMA_VERSION = 1;

const EMPTY_STATE: CartState = {
  items: [],
  restaurantId: null,
  tenantId: null,
  pendingOrderId: null,
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
      // Optional field, so carts saved before this existed still load.
      pendingOrderId: parsed.pendingOrderId ?? null,
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

  // Pure function: the cross-restaurant confirmation is now asked in addItem
  // before this runs. Keeping side effects out of here matters because React
  // may invoke a state updater more than once.
  if (isDifferentRestaurant) {
    return {
      items: [{ menuItem: item, quantity: 1 }],
      restaurantId: item.restaurantId,
      tenantId: item.tenantId,
      // The cart changed, so any previously created order no longer matches it.
      pendingOrderId: null,
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
    // The cart changed, so any previously created order no longer matches it.
    pendingOrderId: null,
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
    // Editing the cart invalidates a pending order created from it.
    pendingOrderId: null,
  };
}

function removeItemFromState(state: CartState, menuItemId: number): CartState {
  const nextItems = state.items.filter((i) => i.menuItem.id !== menuItemId);

  if (nextItems.length === 0) {
    return { ...EMPTY_STATE };
  }

  return { ...state, items: nextItems, pendingOrderId: null };
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

  // Keep the updater pure. Persisting inside it used to run the localStorage
  // write on every React double-invocation; persistence now happens in the
  // effect below instead.
  const applyUpdate = useCallback((updater: (prev: CartState) => CartState) => {
    setCart(updater);
  }, []);

  // Persist the cart whenever it actually changes — but never before the stored
  // cart has been read back, otherwise the first paint would wipe saved items.
  useEffect(() => {
    if (!isHydrated) return;
    persistCart(cart);
  }, [cart, isHydrated]);

  const addItem = useCallback(
    (item: MenuItem) => {
      // Ask for confirmation OUTSIDE the state updater. Previously the dialog
      // ran inside it, so React's development double-invocation showed it twice
      // and made the first "OK" appear to do nothing.
      const switchingRestaurant =
        cart.restaurantId !== null && cart.restaurantId !== item.restaurantId;

      if (
        switchingRestaurant &&
        !window.confirm(
          "Your cart contains items from another restaurant. Clear cart and start a new order?",
        )
      ) {
        return;
      }

      applyUpdate((prev) => addItemToCart(prev, item));
    },
    [applyUpdate, cart.restaurantId],
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

  // Remember the order created from the current cart. Stored with the cart, so
  // it survives a reload and the customer can resume payment later.
  const setPendingOrder = useCallback(
    (orderId: number) => {
      applyUpdate((prev) => ({ ...prev, pendingOrderId: orderId }));
    },
    [applyUpdate],
  );

  const clearPendingOrder = useCallback(() => {
    applyUpdate((prev) => ({ ...prev, pendingOrderId: null }));
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
      setPendingOrder,
      clearPendingOrder,
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
      setPendingOrder,
      clearPendingOrder,
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
