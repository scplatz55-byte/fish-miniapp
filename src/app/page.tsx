"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";

type Category = {
  id: string;
  name: string;
  sort_order: number;
};

type Product = {
  id: string;
  category_id: string | null;
  title: string;
  description: string | null;
  price: string;
  unit_type: "unit" | "weight";
  is_active: boolean;
};

type CartItem = {
  product: Product;
  quantity: number;
};

type OrderStatus = "assembling" | "on_the_way" | "delivered" | "canceled";

type OrderForUi = {
  id: string;
  user_telegram_id?: number;
  customer_name: string;
  phone: string;
  address: string;
  comment: string | null;
  payment_method: string;
  total_amount: string;
  status: OrderStatus;
  created_at: string;
  items_text?: string;
};

type View = "catalog" | "cart" | "profile" | "admin";
type ProfileScreen = "menu" | "history" | "data";
type AdminFilter = "active" | "completed";

type TgUser = {
  id?: number;
  username?: string;
  first_name?: string;
  last_name?: string;
  photo_url?: string;
};

type UserProfile = {
  telegram_user_id: number;
  telegram_username: string | null;
  telegram_first_name: string | null;
  telegram_last_name: string | null;
  telegram_photo_url: string | null;
  full_name: string | null;
  phone: string | null;
  address: string | null;
};

function formatPriceRub(value: string | number) {
  const n = typeof value === "string" ? Number(value) : value;
  if (Number.isNaN(n)) return String(value);
  return new Intl.NumberFormat("ru-RU").format(n) + " ₽";
}

function formatDateTime(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleString("ru-RU", { dateStyle: "short", timeStyle: "short" });
  } catch {
    return iso;
  }
}

function statusLabel(s: OrderStatus) {
  if (s === "assembling") return "Собирается";
  if (s === "on_the_way") return "В пути";
  if (s === "delivered") return "Доставлен";
  if (s === "canceled") return "Отменён";
  return s;
}

function isActiveOrderStatus(status: OrderStatus) {
  return status === "assembling" || status === "on_the_way";
}

function getTgDisplayName(user: TgUser | null) {
  const first = user?.first_name || "";
  const last = user?.last_name || "";
  const full = `${first} ${last}`.trim();
  return full || user?.username || "Пользователь";
}

function IconCatalog({ active, ink, accent }: { active: boolean; ink: string; accent: string }) {
  const stroke = active ? accent : `${ink}A6`;
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 7.5C4 6.12 5.12 5 6.5 5h11C18.88 5 20 6.12 20 7.5v9C20 17.88 18.88 19 17.5 19h-11C5.12 19 4 17.88 4 16.5v-9Z"
        stroke={stroke}
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path d="M7 9h10M7 12h10M7 15h6" stroke={stroke} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function IconCart({ active, ink, accent }: { active: boolean; ink: string; accent: string }) {
  const stroke = active ? accent : `${ink}A6`;
  const fill = active ? accent : `${ink}A6`;
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M7 8h14l-1.4 7.2a2 2 0 0 1-2 1.6H9.2a2 2 0 0 1-2-1.6L6 3H3"
        stroke={stroke}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M10 21a1 1 0 1 0 0-2 1 1 0 0 0 0 2ZM18 21a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z"
        fill={fill}
      />
    </svg>
  );
}

function IconProfile({ active, ink, accent }: { active: boolean; ink: string; accent: string }) {
  const stroke = active ? accent : `${ink}A6`;
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Z" stroke={stroke} strokeWidth="2" />
      <path
        d="M4.5 20c1.8-3 4.3-4.5 7.5-4.5S17.7 17 19.5 20"
        stroke={stroke}
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconTrash({ ink }: { ink: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 7h16M9 7V5h6v2M8 7l1 12h6l1-12"
        stroke={ink}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconChevron({ ink }: { ink: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M9 6l6 6-6 6" stroke={ink} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SkeletonBlock({
  height = 16,
  radius = 12,
  style = {},
}: {
  height?: number;
  radius?: number;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className="app-skeleton"
      style={{
        height,
        borderRadius: radius,
        width: "100%",
        ...style,
      }}
    />
  );
}

export default function Page() {
  const [view, setView] = useState<View>("catalog");
  const [profileScreen, setProfileScreen] = useState<ProfileScreen>("menu");
  const [adminFilter, setAdminFilter] = useState<AdminFilter>("active");

  const [tgUserId, setTgUserId] = useState<number | null>(null);
  const [tgUser, setTgUser] = useState<TgUser | null>(null);
  const [initData, setInitData] = useState<string>("");

  const BRAND_BG = "#2B80A4";
  const BRAND_ACCENT = "#D43314";
  const BRAND_INK = "#0A1317";
  const CARD_BG = "#FFFFFF";

  const HEADER_H = 64;
  const HEADER_TOP_PAD = 24;

  const NAV_BTN_W = 58;
  const NAV_BTN_H = 48;
  const NAV_GAP = 10;
  const NAV_PAD = 10;
  const NAV_LIFT = 26;

  const [bootLoading, setBootLoading] = useState(true);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [productsLoading, setProductsLoading] = useState(false);
  const [profileSaveLoading, setProfileSaveLoading] = useState(false);
  const [keyboardOpen, setKeyboardOpen] = useState(false);

  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [products, setProducts] = useState<Product[]>([]);

  const [cart, setCart] = useState<CartItem[]>([]);
  const total = useMemo(
    () => cart.reduce((sum, item) => sum + Number(item.product.price) * item.quantity, 0),
    [cart]
  );

  const [checkoutOpen, setCheckoutOpen] = useState(false);

  const [orderFullName, setOrderFullName] = useState("");
  const [orderPhone, setOrderPhone] = useState("");
  const [orderAddress, setOrderAddress] = useState("");
  const [orderComment, setOrderComment] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [promoCode, setPromoCode] = useState("");

  const [isAdmin, setIsAdmin] = useState(false);

  const [profileData, setProfileData] = useState<UserProfile | null>(null);
  const [profileFormFullName, setProfileFormFullName] = useState("");
  const [profileFormPhone, setProfileFormPhone] = useState("");
  const [profileFormAddress, setProfileFormAddress] = useState("");

  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [myOrders, setMyOrders] = useState<OrderForUi[]>([]);
  const [selectedMyOrderId, setSelectedMyOrderId] = useState<string | null>(null);
  const selectedMyOrder = useMemo(
    () => myOrders.find((o) => o.id === selectedMyOrderId) || null,
    [myOrders, selectedMyOrderId]
  );

  const [adminLoading, setAdminLoading] = useState(false);
  const [adminError, setAdminError] = useState<string | null>(null);
  const [orders, setOrders] = useState<OrderForUi[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const selectedOrder = useMemo(
    () => orders.find((o) => o.id === selectedOrderId) || null,
    [orders, selectedOrderId]
  );

  const viewIndex = view === "catalog" ? 0 : view === "cart" ? 1 : 2;
  const targetLeft = NAV_PAD + viewIndex * (NAV_BTN_W + NAV_GAP);

  const [indicatorLeft, setIndicatorLeft] = useState<number>(targetLeft);
  const animRef = useRef<number | null>(null);
  const xRef = useRef<number>(targetLeft);
  const vRef = useRef<number>(0);

  const filteredAdminOrders = useMemo(() => {
    if (adminFilter === "active") {
      return orders.filter((o) => isActiveOrderStatus(o.status));
    }
    return orders.filter((o) => !isActiveOrderStatus(o.status));
  }, [orders, adminFilter]);

  useEffect(() => {
    const target = targetLeft;
    if (animRef.current) cancelAnimationFrame(animRef.current);

    const stiffness = 0.16;
    const damping = 0.78;
    const maxStep = 16;

    const tick = () => {
      const x = xRef.current;
      let v = vRef.current;
      const force = (target - x) * stiffness;
      v = v * damping + force;

      if (v > maxStep) v = maxStep;
      if (v < -maxStep) v = -maxStep;

      const nextX = x + v;
      xRef.current = nextX;
      vRef.current = v;
      setIndicatorLeft(nextX);

      const done = Math.abs(target - nextX) < 0.25 && Math.abs(v) < 0.25;
      if (!done) {
        animRef.current = requestAnimationFrame(tick);
      } else {
        xRef.current = target;
        vRef.current = 0;
        setIndicatorLeft(target);
        animRef.current = null;
      }
    };

    animRef.current = requestAnimationFrame(tick);
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
      animRef.current = null;
    };
  }, [targetLeft]);

  useEffect(() => {
    let meta = document.querySelector('meta[name="viewport"]') as HTMLMetaElement | null;
    if (!meta) {
      meta = document.createElement("meta");
      meta.name = "viewport";
      document.head.appendChild(meta);
    }
    meta.content = "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover";

    document.documentElement.style.touchAction = "manipulation";
    document.body.style.touchAction = "manipulation";

    const tg = (window as any)?.Telegram?.WebApp;
    if (tg) {
      tg.ready();
      tg.expand();

      try {
        tg.setHeaderColor?.(BRAND_BG);
        tg.setBackgroundColor?.(BRAND_BG);
      } catch {}

      try {
        if (window.innerWidth < 768) {
          tg.requestFullscreen?.();
        }
      } catch {}

      setInitData(tg.initData || "");
      const u = (tg.initDataUnsafe?.user || null) as TgUser | null;
      setTgUser(u);
      if (u?.id) setTgUserId(u.id);
    }

    try {
      document.documentElement.style.height = "100%";
      document.body.style.height = "100%";
      document.body.style.margin = "0";
      document.body.style.overflow = "hidden";
    } catch {}
  }, []);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;

    const updateKeyboard = () => {
      const active = document.activeElement as HTMLElement | null;
      const isInputFocused =
        active?.tagName === "INPUT" ||
        active?.tagName === "TEXTAREA" ||
        active?.tagName === "SELECT";

      const diff = window.innerHeight - vv.height;
      setKeyboardOpen(Boolean(isInputFocused && diff > 140));
    };

    vv.addEventListener("resize", updateKeyboard);
    vv.addEventListener("scroll", updateKeyboard);
    window.addEventListener("focusin", updateKeyboard);
    window.addEventListener("focusout", updateKeyboard);

    updateKeyboard();

    return () => {
      vv.removeEventListener("resize", updateKeyboard);
      vv.removeEventListener("scroll", updateKeyboard);
      window.removeEventListener("focusin", updateKeyboard);
      window.removeEventListener("focusout", updateKeyboard);
    };
  }, []);

  async function detectAdmin() {
    if (!initData) return;
    try {
      const res = await fetch("/api/admin/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ initData, action: { type: "list", limit: 1 } }),
      });
      if (res.status === 403) {
        setIsAdmin(false);
        return;
      }
      const data = await res.json();
      setIsAdmin(Boolean(res.ok && data?.ok));
    } catch {
      setIsAdmin(false);
    }
  }

  useEffect(() => {
    if (initData) detectAdmin();
  }, [initData]);

  useEffect(() => {
    async function loadCategories() {
      setCategoriesLoading(true);
      const { data } = await supabase
        .from("categories")
        .select("id,name,sort_order")
        .order("sort_order", { ascending: true });

      const list = (data || []) as Category[];
      setCategories(list);
      if (!selectedCategoryId && list.length > 0) setSelectedCategoryId(list[0].id);
      setCategoriesLoading(false);
    }
    loadCategories();
  }, []);

  useEffect(() => {
    async function loadProducts() {
      if (!selectedCategoryId) return;
      setProductsLoading(true);
      const { data } = await supabase
        .from("products")
        .select("id,category_id,title,description,price,unit_type,is_active")
        .eq("category_id", selectedCategoryId)
        .eq("is_active", true);

      setProducts((data || []) as Product[]);
      setProductsLoading(false);
    }
    loadProducts();
  }, [selectedCategoryId]);

  useEffect(() => {
    if (!categoriesLoading && initData !== "") {
      const t = setTimeout(() => setBootLoading(false), 350);
      return () => clearTimeout(t);
    }
  }, [categoriesLoading, initData]);

  useEffect(() => {
    async function loadUserProfile() {
      if (!tgUserId) return;

      const { data, error } = await supabase
        .from("user_profiles")
        .select("*")
        .eq("telegram_user_id", tgUserId)
        .maybeSingle();

      if (error) return;

      if (data) {
        const row = data as UserProfile;
        setProfileData(row);
        setProfileFormFullName(row.full_name || "");
        setProfileFormPhone(row.phone || "");
        setProfileFormAddress(row.address || "");
        setOrderFullName(row.full_name || getTgDisplayName(tgUser));
        setOrderPhone(row.phone || "");
        setOrderAddress(row.address || "");
      } else {
        const fallbackName = getTgDisplayName(tgUser);
        setProfileFormFullName(fallbackName);
        setOrderFullName(fallbackName);
      }
    }
    loadUserProfile();
  }, [tgUserId, tgUser]);

  async function saveProfileData() {
    if (!tgUserId) {
      alert("Не удалось определить Telegram ID");
      return;
    }

    setProfileSaveLoading(true);

    const payload: UserProfile = {
      telegram_user_id: tgUserId,
      telegram_username: tgUser?.username || null,
      telegram_first_name: tgUser?.first_name || null,
      telegram_last_name: tgUser?.last_name || null,
      telegram_photo_url: tgUser?.photo_url || null,
      full_name: profileFormFullName.trim() || null,
      phone: profileFormPhone.trim() || null,
      address: profileFormAddress.trim() || null,
    };

    const { error } = await supabase
      .from("user_profiles")
      .upsert(payload, { onConflict: "telegram_user_id" });

    setProfileSaveLoading(false);

    if (error) {
      alert(error.message);
      return;
    }

    setProfileData(payload);
    setOrderFullName(payload.full_name || getTgDisplayName(tgUser));
    setOrderPhone(payload.phone || "");
    setOrderAddress(payload.address || "");

    alert("Данные сохранены");
  }

  function addToCart(product: Product) {
    setCart((prev) => {
      const existing = prev.find((c) => c.product.id === product.id);
      if (existing) {
        return prev.map((c) =>
          c.product.id === product.id ? { ...c, quantity: c.quantity + 1 } : c
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  }

  function changeQuantity(productId: string, delta: number) {
    setCart((prev) =>
      prev
        .map((c) =>
          c.product.id === productId ? { ...c, quantity: c.quantity + delta } : c
        )
        .filter((c) => c.quantity > 0)
    );
  }

  function removeFromCart(productId: string) {
    setCart((prev) => prev.filter((c) => c.product.id !== productId));
  }

  function getCartItem(productId: string) {
    return cart.find((c) => c.product.id === productId) || null;
  }

  async function submitOrder() {
    if (!tgUserId) return alert("Ошибка авторизации (нет Telegram user id)");
    if (!orderFullName || !orderPhone || !orderAddress) {
      return alert("Заполните ФИО, телефон и адрес");
    }
    if (cart.length === 0) return alert("Корзина пуста");

    const { data, error } = await supabase
      .from("orders")
      .insert([
        {
          user_telegram_id: tgUserId,
          customer_name: orderFullName,
          phone: orderPhone,
          address: orderAddress,
          comment: orderComment,
          payment_method: paymentMethod,
          total_amount: total,
          status: "assembling",
        },
      ])
      .select()
      .single();

    if (error) return alert(error.message);

    const orderId = data.id as string;

    const items = cart.map((item) => ({
      order_id: orderId,
      product_id: item.product.id,
      product_title: item.product.title,
      price: item.product.price,
      quantity: item.quantity,
    }));

    const { error: itemsErr } = await supabase.from("order_items").insert(items);
    if (itemsErr) return alert(itemsErr.message);

    try {
      await fetch("/api/notify-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ initData, orderId }),
      });
    } catch {}

    alert("Заказ оформлен!");
    setCart([]);
    setCheckoutOpen(false);
    setOrderComment("");
    setPromoCode("");
    setView("profile");
    setProfileScreen("history");
    await loadMyOrders();
  }

  async function loadMyOrders() {
    if (!initData) {
      setProfileError("Открой мини-апп через Telegram.");
      return;
    }

    setProfileLoading(true);
    setProfileError(null);

    try {
      const res = await fetch("/api/my-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ initData, limit: 30 }),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        setProfileError(data?.error || `Ошибка загрузки (HTTP ${res.status})`);
        setMyOrders([]);
        setSelectedMyOrderId(null);
        return;
      }

      const list = (data.orders || []) as OrderForUi[];
      setMyOrders(list);

      if (selectedMyOrderId && !list.some((o) => o.id === selectedMyOrderId)) {
        setSelectedMyOrderId(null);
      }
    } catch (e: any) {
      setProfileError(e?.message || "Ошибка сети");
      setMyOrders([]);
      setSelectedMyOrderId(null);
    } finally {
      setProfileLoading(false);
    }
  }

  async function adminLoad() {
    if (!initData) {
      setAdminError("Нет initData — открой через Telegram.");
      return;
    }

    setAdminLoading(true);
    setAdminError(null);

    try {
      const res = await fetch("/api/admin/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ initData, action: { type: "list", limit: 50 } }),
      });

      const data = await res.json();

      if (res.status === 403) {
        setAdminError("У вас нет доступа к админке");
        setOrders([]);
        setSelectedOrderId(null);
        setIsAdmin(false);
        return;
      }

      if (!res.ok || !data.ok) {
        setAdminError(data?.error || `Ошибка загрузки (HTTP ${res.status})`);
        setOrders([]);
        setSelectedOrderId(null);
        return;
      }

      const list = (data.orders || []) as OrderForUi[];
      setOrders(list);

      if (selectedOrderId && !list.some((o) => o.id === selectedOrderId)) {
        setSelectedOrderId(null);
      }
    } catch (e: any) {
      setAdminError(e?.message || "Ошибка сети");
      setOrders([]);
      setSelectedOrderId(null);
    } finally {
      setAdminLoading(false);
    }
  }

  async function setOrderStatus(orderId: string, status: OrderStatus) {
    if (!initData) return;

    setAdminLoading(true);
    setAdminError(null);

    try {
      const res = await fetch("/api/admin/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          initData,
          action: { type: "setStatus", orderId, status },
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        setAdminError(data?.error || `Не удалось изменить статус (HTTP ${res.status})`);
        return;
      }

      await adminLoad();
    } catch (e: any) {
      setAdminError(e?.message || "Ошибка сети");
    } finally {
      setAdminLoading(false);
    }
  }

  function openSupport() {
    const supportLink = process.env.NEXT_PUBLIC_SUPPORT_LINK || "";
    if (!supportLink) {
      alert("Не задан NEXT_PUBLIC_SUPPORT_LINK в .env.local");
      return;
    }

    const tg = (window as any)?.Telegram?.WebApp;
    try {
      tg?.openTelegramLink?.(supportLink);
      return;
    } catch {}

    window.open(supportLink, "_blank");
  }

  useEffect(() => {
    if (view === "profile" && profileScreen === "history") loadMyOrders();
  }, [view, profileScreen]);

  const root: React.CSSProperties = {
    height: "100vh",
    background: BRAND_BG,
    color: BRAND_INK,
    fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial",
    overflow: "hidden",
  };

  const header: React.CSSProperties = {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 50,
    height: HEADER_H,
    paddingTop: `calc(env(safe-area-inset-top, 0px) + ${HEADER_TOP_PAD}px)`,
    boxSizing: "border-box",
    display: "flex",
    alignItems: "flex-end",
    justifyContent: "center",
    paddingLeft: 16,
    paddingRight: 16,
    background: "rgba(43,128,164,0.92)",
    backdropFilter: "blur(10px)",
  };

  const logoStyle: React.CSSProperties = {
    height: "clamp(56px, 12vw, 84px)",
    width: "auto",
    display: "block",
    filter: "drop-shadow(0 10px 20px rgba(0,0,0,0.18))",
    pointerEvents: "none",
    userSelect: "none",
  };

  const navTotalHeight = NAV_PAD * 2 + NAV_BTN_H;
  const contentBottomPadding = `calc(env(safe-area-inset-bottom, 0px) + ${NAV_LIFT}px + ${navTotalHeight}px + 22px)`;

  const content: React.CSSProperties = {
    position: "absolute",
    left: 0,
    right: 0,
    top: `calc(env(safe-area-inset-top, 0px) + ${HEADER_TOP_PAD}px + ${HEADER_H}px)`,
    bottom: 0,
    overflowY: "auto",
    WebkitOverflowScrolling: "touch",
    padding: 16,
    paddingBottom: contentBottomPadding,
    boxSizing: "border-box",
  };

  const card: React.CSSProperties = {
    background: CARD_BG,
    borderRadius: 18,
    padding: 14,
    boxShadow: "0 10px 30px rgba(0,0,0,0.18)",
  };

  const smallMuted: React.CSSProperties = { fontSize: 12, opacity: 0.75 };

  const btnPrimary: React.CSSProperties = {
    padding: "12px 14px",
    borderRadius: 14,
    border: "1px solid rgba(0,0,0,0.06)",
    background: BRAND_ACCENT,
    color: "#fff",
    fontWeight: 900,
    cursor: "pointer",
  };

  const btnGhost: React.CSSProperties = {
    padding: "10px 12px",
    borderRadius: 14,
    border: "1px solid rgba(0,0,0,0.10)",
    background: "rgba(255,255,255,0.85)",
    color: BRAND_INK,
    fontWeight: 900,
    cursor: "pointer",
  };

  const filterBtn = (active: boolean): React.CSSProperties => ({
    ...btnGhost,
    background: active ? "rgba(212,51,20,0.12)" : "rgba(255,255,255,0.85)",
    border: active ? "1px solid rgba(212,51,20,0.28)" : "1px solid rgba(0,0,0,0.10)",
  });

  const inputStyle: React.CSSProperties = {
    padding: 12,
    borderRadius: 14,
    border: "1px solid rgba(10,19,23,0.12)",
    background: "#fff",
    color: BRAND_INK,
    outline: "none",
    fontSize: 14,
  };

  const profileActionCard: React.CSSProperties = {
    width: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    padding: 14,
    borderRadius: 18,
    border: "1px solid rgba(10,19,23,0.10)",
    background: "rgba(10,19,23,0.02)",
    cursor: "pointer",
    textAlign: "left",
  };

  const qtyWrap: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: 6,
    background: "rgba(212,51,20,0.08)",
    border: "1px solid rgba(212,51,20,0.16)",
    borderRadius: 14,
    padding: 4,
  };

  const qtyBtn: React.CSSProperties = {
    width: 34,
    height: 34,
    borderRadius: 10,
    border: "1px solid rgba(10,19,23,0.08)",
    background: "#fff",
    color: BRAND_INK,
    fontWeight: 900,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    padding: 0,
    flexShrink: 0,
  };

  const qtyCount: React.CSSProperties = {
    minWidth: 26,
    textAlign: "center",
    fontWeight: 900,
    fontSize: 14,
  };

  const navWrap: React.CSSProperties = {
    position: "fixed",
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 60,
    paddingBottom: `calc(env(safe-area-inset-bottom, 0px) + ${NAV_LIFT}px)`,
    display: keyboardOpen ? "none" : "flex",
    justifyContent: "center",
    pointerEvents: "none",
  };

  const navPill: React.CSSProperties = {
    pointerEvents: "auto",
    position: "relative",
    display: "flex",
    gap: NAV_GAP,
    alignItems: "center",
    padding: NAV_PAD,
    borderRadius: 18,
    background: "rgba(255,255,255,0.52)",
    border: "1px solid rgba(10,19,23,0.10)",
    backdropFilter: "blur(14px)",
    boxShadow: "0 18px 45px rgba(0,0,0,0.22)",
  };

  const IND_INSET = 1;
  const indicator: React.CSSProperties = {
    position: "absolute",
    top: NAV_PAD + IND_INSET,
    left: indicatorLeft + IND_INSET,
    width: NAV_BTN_W - IND_INSET * 2,
    height: NAV_BTN_H - IND_INSET * 2,
    borderRadius: 13,
    background: "rgba(212,51,20,0.22)",
    border: "1px solid rgba(212,51,20,0.28)",
    boxShadow: "0 12px 28px rgba(212,51,20,0.25)",
    transition: "none",
  };

  const navBtnBase: React.CSSProperties = {
    width: NAV_BTN_W,
    height: NAV_BTN_H,
    borderRadius: 14,
    border: "1px solid rgba(10,19,23,0.06)",
    background: "transparent",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    userSelect: "none",
    WebkitTapHighlightColor: "transparent",
    transition: "transform 140ms ease, opacity 140ms ease",
  };

  function onPressDown(e: any) {
    try {
      (e.currentTarget as HTMLButtonElement).style.transform = "scale(0.94)";
    } catch {}
  }

  function onPressUp(e: any) {
    try {
      (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)";
    } catch {}
  }

  const avatarSrc = tgUser?.photo_url || profileData?.telegram_photo_url || "";

  if (bootLoading) {
    return (
      <div style={root}>
        <style>{`
          @keyframes appPulse {
            0% { opacity: 0.45; }
            50% { opacity: 1; }
            100% { opacity: 0.45; }
          }
          .app-skeleton {
            background: linear-gradient(
              90deg,
              rgba(255,255,255,0.35) 0%,
              rgba(255,255,255,0.65) 50%,
              rgba(255,255,255,0.35) 100%
            );
            background-size: 200% 100%;
            animation: appShimmer 1.2s ease-in-out infinite;
          }
          @keyframes appShimmer {
            0% { background-position: 200% 0; }
            100% { background-position: -200% 0; }
          }
        `}</style>

        <div
          style={{
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
            boxSizing: "border-box",
          }}
        >
          <div
            style={{
              width: "min(360px, 100%)",
              background: "rgba(255,255,255,0.20)",
              border: "1px solid rgba(255,255,255,0.18)",
              borderRadius: 28,
              padding: 24,
              backdropFilter: "blur(10px)",
              boxShadow: "0 18px 50px rgba(0,0,0,0.22)",
            }}
          >
            <img
              src="/logo.png"
              alt="logo"
              style={{
                display: "block",
                margin: "0 auto",
                height: 54,
                width: "auto",
                animation: "appPulse 1.3s ease-in-out infinite",
              }}
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = "none";
              }}
            />
            <div
              style={{
                color: "#fff",
                textAlign: "center",
                marginTop: 14,
                fontWeight: 900,
                fontSize: 16,
              }}
            >
              Загружаем приложение…
            </div>

            <div style={{ marginTop: 22, display: "flex", flexDirection: "column", gap: 12 }}>
              <SkeletonBlock height={18} radius={12} />
              <SkeletonBlock height={18} radius={12} style={{ width: "76%" }} />
              <SkeletonBlock height={72} radius={18} />
              <SkeletonBlock height={72} radius={18} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={root}>
      <style>{`
        @keyframes appShimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        .app-skeleton {
          background: linear-gradient(
            90deg,
            rgba(10,19,23,0.06) 0%,
            rgba(10,19,23,0.12) 50%,
            rgba(10,19,23,0.06) 100%
          );
          background-size: 200% 100%;
          animation: appShimmer 1.2s ease-in-out infinite;
        }
      `}</style>

      <div style={header}>
        <img
          src="/logo.png"
          alt="Рыба на районе"
          style={logoStyle}
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.display = "none";
          }}
        />
      </div>

      <div style={content}>
        {view === "catalog" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={card}>
              <div style={{ fontWeight: 900, fontSize: 16 }}>Категории</div>

              {categoriesLoading ? (
                <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <SkeletonBlock height={34} radius={999} style={{ width: 90 }} />
                  <SkeletonBlock height={34} radius={999} style={{ width: 110 }} />
                  <SkeletonBlock height={34} radius={999} style={{ width: 100 }} />
                </div>
              ) : (
                <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {categories.map((c) => {
                    const active = selectedCategoryId === c.id;
                    return (
                      <button
                        key={c.id}
                        onClick={() => setSelectedCategoryId(c.id)}
                        style={{
                          padding: "8px 12px",
                          borderRadius: 999,
                          border: `1px solid ${
                            active ? "rgba(212,51,20,0.35)" : "rgba(10,19,23,0.12)"
                          }`,
                          background: active ? "rgba(212,51,20,0.10)" : "rgba(10,19,23,0.04)",
                          color: BRAND_INK,
                          cursor: "pointer",
                          fontWeight: 900,
                        }}
                      >
                        {c.name}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div style={card}>
              <div style={{ fontWeight: 900, fontSize: 16 }}>Товары</div>

              {productsLoading ? (
                <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 10 }}>
                  <SkeletonBlock height={92} radius={14} />
                  <SkeletonBlock height={92} radius={14} />
                  <SkeletonBlock height={92} radius={14} />
                </div>
              ) : (
                <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 10 }}>
                  {products.map((p) => {
                    const cartItem = getCartItem(p.id);

                    return (
                      <div
                        key={p.id}
                        style={{
                          borderRadius: 14,
                          border: "1px solid rgba(10,19,23,0.10)",
                          padding: 12,
                          background: "rgba(10,19,23,0.02)",
                        }}
                      >
                        <div style={{ fontWeight: 900 }}>{p.title}</div>
                        {p.description && (
                          <div style={{ marginTop: 4, fontSize: 13, opacity: 0.8 }}>{p.description}</div>
                        )}

                        <div
                          style={{
                            marginTop: 10,
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            gap: 10,
                          }}
                        >
                          <div style={{ fontWeight: 900 }}>
                            {formatPriceRub(p.price)}{" "}
                            <span style={{ fontWeight: 700, opacity: 0.7, fontSize: 12 }}>
                              {p.unit_type === "weight" ? "за кг" : "за шт"}
                            </span>
                          </div>

                          {!cartItem ? (
                            <button
                              style={{
                                ...btnGhost,
                                background: "rgba(212,51,20,0.10)",
                                border: "1px solid rgba(212,51,20,0.22)",
                                color: BRAND_INK,
                              }}
                              onClick={() => addToCart(p)}
                            >
                              + В корзину
                            </button>
                          ) : (
                            <div style={qtyWrap}>
                              <button style={qtyBtn} onClick={() => changeQuantity(p.id, -1)}>
                                −
                              </button>
                              <div style={qtyCount}>{cartItem.quantity}</div>
                              <button style={qtyBtn} onClick={() => changeQuantity(p.id, 1)}>
                                +
                              </button>
                              <button
                                style={qtyBtn}
                                onClick={() => removeFromCart(p.id)}
                                title="Убрать из корзины"
                              >
                                <IconTrash ink={BRAND_INK} />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {products.length === 0 && (
                    <div style={smallMuted}>Пока нет товаров в этой категории.</div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {view === "cart" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={card}>
              <div style={{ fontWeight: 900, fontSize: 16 }}>Корзина</div>
              {cart.length === 0 ? (
                <div style={{ marginTop: 10, opacity: 0.75 }}>Корзина пуста</div>
              ) : (
                <>
                  <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 10 }}>
                    {cart.map((item) => (
                      <div
                        key={item.product.id}
                        style={{
                          borderRadius: 14,
                          border: "1px solid rgba(10,19,23,0.10)",
                          padding: 12,
                          background: "rgba(10,19,23,0.02)",
                        }}
                      >
                        <div style={{ fontWeight: 900 }}>{item.product.title}</div>
                        <div style={{ marginTop: 6, opacity: 0.85 }}>
                          {formatPriceRub(item.product.price)}{" "}
                          <span style={{ fontSize: 12, opacity: 0.7 }}>
                            {item.product.unit_type === "weight" ? "за кг" : "за шт"}
                          </span>
                        </div>

                        <div style={{ marginTop: 10, display: "flex", gap: 10, alignItems: "center" }}>
                          <button style={btnGhost} onClick={() => changeQuantity(item.product.id, -1)}>
                            −
                          </button>
                          <div style={{ minWidth: 24, textAlign: "center", fontWeight: 900 }}>
                            {item.quantity}
                          </div>
                          <button style={btnGhost} onClick={() => changeQuantity(item.product.id, 1)}>
                            +
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div style={{ marginTop: 14, display: "flex", justifyContent: "space-between", gap: 10 }}>
                    <div style={{ fontWeight: 900, fontSize: 16 }}>Итого</div>
                    <div style={{ fontWeight: 900, fontSize: 16 }}>{formatPriceRub(total)}</div>
                  </div>

                  <button style={{ ...btnPrimary, width: "100%", marginTop: 12 }} onClick={() => setCheckoutOpen(true)}>
                    Оформить заказ
                  </button>
                </>
              )}
            </div>

            {checkoutOpen && (
              <div style={card}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
                  <div style={{ fontWeight: 900, fontSize: 16 }}>Оформление</div>
                  <button style={btnGhost} onClick={() => setCheckoutOpen(false)}>
                    Закрыть
                  </button>
                </div>

                <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 10 }}>
                  <div style={{ fontWeight: 900, fontSize: 14 }}>Получатель</div>
                  <input style={inputStyle} placeholder="ФИО" value={orderFullName} onChange={(e) => setOrderFullName(e.target.value)} />
                  <input style={inputStyle} placeholder="Телефон" value={orderPhone} onChange={(e) => setOrderPhone(e.target.value)} />
                  <input style={inputStyle} placeholder="Адрес" value={orderAddress} onChange={(e) => setOrderAddress(e.target.value)} />

                  <div style={{ fontWeight: 900, fontSize: 14, marginTop: 6 }}>Способ оплаты</div>
                  <select style={inputStyle} value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                    <option value="cash">Наличные</option>
                    <option value="transfer">Перевод</option>
                    <option value="qr">QR-код</option>
                  </select>

                  <div style={{ fontWeight: 900, fontSize: 14, marginTop: 6 }}>Промокод</div>
                  <input style={inputStyle} placeholder="Введите промокод" value={promoCode} onChange={(e) => setPromoCode(e.target.value)} />

                  <div style={{ fontWeight: 900, fontSize: 14, marginTop: 6 }}>Комментарий</div>
                  <textarea
                    style={{ ...inputStyle, minHeight: 90, resize: "vertical" }}
                    placeholder="Комментарий к заказу"
                    value={orderComment}
                    onChange={(e) => setOrderComment(e.target.value)}
                  />

                  <div style={{ marginTop: 4, fontWeight: 900 }}>Итого: {formatPriceRub(total)}</div>
                  <button style={{ ...btnPrimary, width: "100%" }} onClick={submitOrder}>
                    Подтвердить заказ
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {view === "profile" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={card}>
              <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
                <div
                  style={{
                    width: 68,
                    height: 68,
                    borderRadius: "50%",
                    overflow: "hidden",
                    background: "rgba(10,19,23,0.08)",
                    flexShrink: 0,
                    border: "1px solid rgba(10,19,23,0.10)",
                  }}
                >
                  {avatarSrc ? (
                    <img
                      src={avatarSrc}
                      alt="avatar"
                      style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                    />
                  ) : (
                    <div
                      style={{
                        width: "100%",
                        height: "100%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontWeight: 900,
                        fontSize: 22,
                        opacity: 0.65,
                      }}
                    >
                      {getTgDisplayName(tgUser)?.[0] || "U"}
                    </div>
                  )}
                </div>

                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 900, fontSize: 20 }}>{getTgDisplayName(tgUser)}</div>
                  {tgUser?.username ? <div style={{ marginTop: 4, opacity: 0.75 }}>@{tgUser.username}</div> : null}
                  <div style={{ marginTop: 6, ...smallMuted }}>ID: {tgUserId ?? "—"}</div>
                </div>
              </div>
            </div>

            {profileScreen === "menu" && (
              <div style={card}>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <button style={profileActionCard} onClick={() => { setProfileScreen("history"); setSelectedMyOrderId(null); }}>
                    <div>
                      <div style={{ fontWeight: 900, fontSize: 17 }}>История заказов</div>
                      <div style={{ ...smallMuted, marginTop: 4 }}>Просмотр ваших оформленных заказов</div>
                    </div>
                    <IconChevron ink={BRAND_INK} />
                  </button>

                  <button style={profileActionCard} onClick={() => setProfileScreen("data")}>
                    <div>
                      <div style={{ fontWeight: 900, fontSize: 17 }}>Мои данные</div>
                      <div style={{ ...smallMuted, marginTop: 4 }}>ФИО, телефон и адрес для автозаполнения</div>
                    </div>
                    <IconChevron ink={BRAND_INK} />
                  </button>

                  <button style={profileActionCard} onClick={openSupport}>
                    <div>
                      <div style={{ fontWeight: 900, fontSize: 17 }}>Тех. поддержка</div>
                      <div style={{ ...smallMuted, marginTop: 4 }}>Открыть чат поддержки в Telegram</div>
                    </div>
                    <IconChevron ink={BRAND_INK} />
                  </button>

                  {isAdmin && (
                    <button
                      style={profileActionCard}
                      onClick={() => {
                        setSelectedOrderId(null);
                        setAdminFilter("active");
                        setAdminError(null);
                        setOrders([]);
                        setView("admin");
                        adminLoad();
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 900, fontSize: 17 }}>Админка</div>
                        <div style={{ ...smallMuted, marginTop: 4 }}>Управление заказами и статусами</div>
                      </div>
                      <IconChevron ink={BRAND_INK} />
                    </button>
                  )}

                  {isAdmin && (
                    <button
                      style={profileActionCard}
                      onClick={() => {
                        setSelectedOrderId(null);
                        setAdminFilter("active");
                        setAdminError(null);
                        setOrders([]);
                        setView("admin");
                        adminLoad();
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 900, fontSize: 17 }}>Все заказы</div>
                        <div style={{ ...smallMuted, marginTop: 4 }}>Список заказов с фильтрами по статусу</div>
                      </div>
                      <IconChevron ink={BRAND_INK} />
                    </button>
                  )}
                </div>
              </div>
            )}

            {profileScreen === "history" && (
              <div style={card}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
                  <div style={{ fontWeight: 900, fontSize: 16 }}>История заказов</div>
                  <button style={btnGhost} onClick={() => { setProfileScreen("menu"); setSelectedMyOrderId(null); }}>
                    ← Назад
                  </button>
                </div>

                {profileLoading ? (
                  <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 10 }}>
                    <SkeletonBlock height={84} radius={14} />
                    <SkeletonBlock height={84} radius={14} />
                  </div>
                ) : profileError ? (
                  <div style={{ marginTop: 10, color: BRAND_ACCENT, whiteSpace: "pre-wrap" }}>
                    Ошибка: {profileError}
                  </div>
                ) : (
                  <>
                    {!selectedMyOrderId && (
                      <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 10 }}>
                        {myOrders.map((o) => (
                          <button
                            key={o.id}
                            onClick={() => setSelectedMyOrderId(o.id)}
                            style={{
                              textAlign: "left",
                              borderRadius: 14,
                              border: "1px solid rgba(10,19,23,0.10)",
                              background: "rgba(10,19,23,0.02)",
                              padding: 12,
                              cursor: "pointer",
                            }}
                          >
                            <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                              <div style={{ fontWeight: 900 }}>#{o.id.slice(0, 8)}</div>
                              <div style={{ fontSize: 12, opacity: 0.7 }}>{formatDateTime(o.created_at)}</div>
                            </div>
                            <div style={{ marginTop: 6, fontSize: 13, opacity: 0.9 }}>
                              Статус: <strong>{statusLabel(o.status)}</strong>
                            </div>
                            <div style={{ marginTop: 4, fontSize: 13, opacity: 0.85 }}>
                              Сумма: {formatPriceRub(o.total_amount)}
                            </div>
                          </button>
                        ))}

                        {myOrders.length === 0 && (
                          <div style={{ marginTop: 10, opacity: 0.75 }}>Пока нет заказов.</div>
                        )}
                      </div>
                    )}

                    {selectedMyOrderId && (
                      <div style={{ marginTop: 10 }}>
                        <button style={btnGhost} onClick={() => setSelectedMyOrderId(null)}>
                          ← Назад к списку
                        </button>

                        {selectedMyOrder ? (
                          <div style={{ marginTop: 12 }}>
                            <div style={{ fontWeight: 900, fontSize: 16 }}>
                              Заказ #{selectedMyOrder.id.slice(0, 8)}
                            </div>
                            <div style={{ marginTop: 8, opacity: 0.9 }}>
                              Статус: <strong>{statusLabel(selectedMyOrder.status)}</strong>
                            </div>
                            <div style={{ marginTop: 6, fontWeight: 900 }}>
                              {formatPriceRub(selectedMyOrder.total_amount)}
                            </div>
                            <div style={{ marginTop: 6, ...smallMuted }}>{formatDateTime(selectedMyOrder.created_at)}</div>

                            <div style={{ marginTop: 12, whiteSpace: "pre-wrap", fontSize: 13, opacity: 0.95 }}>
                              <strong>Состав:</strong>
                              {"
"}
                              {selectedMyOrder.items_text || "Нет данных"}
                            </div>
                          </div>
                        ) : (
                          <div style={{ marginTop: 10, opacity: 0.75 }}>Заказ не найден.</div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {profileScreen === "data" && (
              <div style={card}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
                  <div style={{ fontWeight: 900, fontSize: 16 }}>Мои данные</div>
                  <button style={btnGhost} onClick={() => setProfileScreen("menu")}>
                    ← Назад
                  </button>
                </div>

                <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 10 }}>
                  <input
                    style={inputStyle}
                    placeholder="ФИО"
                    value={profileFormFullName}
                    onChange={(e) => setProfileFormFullName(e.target.value)}
                  />

                  <input
                    style={inputStyle}
                    placeholder="Телефон"
                    value={profileFormPhone}
                    onChange={(e) => setProfileFormPhone(e.target.value)}
                  />

                  <textarea
                    style={{ ...inputStyle, minHeight: 90, resize: "vertical" }}
                    placeholder="Адрес"
                    value={profileFormAddress}
                    onChange={(e) => setProfileFormAddress(e.target.value)}
                  />

                  <div style={smallMuted}>
                    Эти данные автоматически подставляются в оформление заказа.
                  </div>

                  <button
                    style={{ ...btnPrimary, width: "100%", opacity: profileSaveLoading ? 0.7 : 1 }}
                    onClick={saveProfileData}
                    disabled={profileSaveLoading}
                  >
                    {profileSaveLoading ? "Сохраняем..." : "Сохранить данные"}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {view === "admin" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={card}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
                <div style={{ fontWeight: 900, fontSize: 16 }}>Все заказы</div>
                <button
                  style={btnGhost}
                  onClick={() => {
                    setSelectedOrderId(null);
                    setView("profile");
                    setProfileScreen("menu");
                  }}
                >
                  ← В профиль
                </button>
              </div>

              <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button style={filterBtn(adminFilter === "active")} onClick={() => setAdminFilter("active")}>
                  Активные
                </button>
                <button style={filterBtn(adminFilter === "completed")} onClick={() => setAdminFilter("completed")}>
                  Завершённые
                </button>
                <button style={btnGhost} onClick={adminLoad}>
                  Обновить
                </button>
              </div>

              {adminLoading ? (
                <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 10 }}>
                  <SkeletonBlock height={84} radius={14} />
                  <SkeletonBlock height={84} radius={14} />
                </div>
              ) : adminError ? (
                <div style={{ marginTop: 10, color: BRAND_ACCENT, whiteSpace: "pre-wrap" }}>
                  Ошибка: {adminError}
                </div>
              ) : (
                <>
                  {!selectedOrderId && (
                    <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 10 }}>
                      {filteredAdminOrders.map((o) => (
                        <button
                          key={o.id}
                          onClick={() => setSelectedOrderId(o.id)}
                          style={{
                            textAlign: "left",
                            borderRadius: 14,
                            border: "1px solid rgba(10,19,23,0.10)",
                            background: "rgba(10,19,23,0.02)",
                            padding: 12,
                            cursor: "pointer",
                          }}
                        >
                          <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                            <div style={{ fontWeight: 900 }}>#{o.id.slice(0, 8)}</div>
                            <div style={{ fontSize: 12, opacity: 0.7 }}>{formatDateTime(o.created_at)}</div>
                          </div>
                          <div style={{ marginTop: 6, fontWeight: 900 }}>{o.customer_name}</div>
                          <div style={{ marginTop: 4, fontSize: 13, opacity: 0.9 }}>
                            {statusLabel(o.status)} • {formatPriceRub(o.total_amount)}
                          </div>
                        </button>
                      ))}
                      {filteredAdminOrders.length === 0 && (
                        <div style={{ marginTop: 10, opacity: 0.75 }}>Заказов нет.</div>
                      )}
                    </div>
                  )}

                  {selectedOrderId && (
                    <div style={{ marginTop: 12 }}>
                      <button style={btnGhost} onClick={() => setSelectedOrderId(null)}>
                        ← Назад к списку
                      </button>

                      {selectedOrder ? (
                        <div style={{ marginTop: 12 }}>
                          <div style={{ fontWeight: 900, fontSize: 16 }}>
                            Заказ #{selectedOrder.id.slice(0, 8)}
                          </div>

                          <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 4, opacity: 0.95 }}>
                            <div>👤 {selectedOrder.customer_name}</div>
                            <div>📞 {selectedOrder.phone}</div>
                            <div>📍 {selectedOrder.address}</div>
                            <div>💳 {selectedOrder.payment_method}</div>
                            <div>💰 {formatPriceRub(selectedOrder.total_amount)}</div>
                            {selectedOrder.comment ? <div>💬 {selectedOrder.comment}</div> : null}
                            <div style={smallMuted}>{formatDateTime(selectedOrder.created_at)}</div>
                          </div>

                          <div style={{ marginTop: 12, whiteSpace: "pre-wrap", fontSize: 13, opacity: 0.95 }}>
                            <strong>Состав:</strong>
                            {"
"}
                            {selectedOrder.items_text || "Нет данных"}
                          </div>

                          <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
                            <button style={btnGhost} onClick={() => setOrderStatus(selectedOrder.id, "assembling")}>
                              Собирается
                            </button>
                            <button style={btnGhost} onClick={() => setOrderStatus(selectedOrder.id, "on_the_way")}>
                              В пути
                            </button>
                            <button style={btnGhost} onClick={() => setOrderStatus(selectedOrder.id, "delivered")}>
                              Доставлен
                            </button>
                            <button style={btnGhost} onClick={() => setOrderStatus(selectedOrder.id, "canceled")}>
                              Отменён
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div style={{ marginTop: 10, opacity: 0.75 }}>Заказ не найден.</div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>

      <div style={navWrap}>
        <div style={navPill}>
          <div style={indicator} />

          <button
            style={{ ...navBtnBase, opacity: viewIndex === 0 ? 1 : 0.92 }}
            onClick={() => setView("catalog")}
            aria-label="Каталог"
            onPointerDown={onPressDown}
            onPointerUp={onPressUp}
            onPointerCancel={onPressUp}
            onPointerLeave={onPressUp}
          >
            <IconCatalog active={viewIndex === 0} ink={BRAND_INK} accent={BRAND_ACCENT} />
          </button>

          <button
            style={{ ...navBtnBase, opacity: viewIndex === 1 ? 1 : 0.92 }}
            onClick={() => setView("cart")}
            aria-label="Корзина"
            onPointerDown={onPressDown}
            onPointerUp={onPressUp}
            onPointerCancel={onPressUp}
            onPointerLeave={onPressUp}
          >
            <div style={{ position: "relative" }}>
              <IconCart active={viewIndex === 1} ink={BRAND_INK} accent={BRAND_ACCENT} />
              {cart.length > 0 && (
                <div
                  style={{
                    position: "absolute",
                    top: -7,
                    right: -12,
                    minWidth: 18,
                    height: 18,
                    padding: "0 6px",
                    borderRadius: 999,
                    background: BRAND_ACCENT,
                    color: "#fff",
                    fontSize: 11,
                    fontWeight: 900,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: "0 10px 18px rgba(212,51,20,0.25)",
                  }}
                >
                  {cart.length}
                </div>
              )}
            </div>
          </button>

          <button
            style={{ ...navBtnBase, opacity: viewIndex === 2 ? 1 : 0.92 }}
            onClick={() => {
              setView("profile");
              setProfileScreen("menu");
            }}
            aria-label="Профиль"
            onPointerDown={onPressDown}
            onPointerUp={onPressUp}
            onPointerCancel={onPressUp}
            onPointerLeave={onPressUp}
          >
            <IconProfile active={viewIndex === 2} ink={BRAND_INK} accent={BRAND_ACCENT} />
          </button>
        </div>
      </div>
    </div>
  );
}
