"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { UI_THEME } from "@/lib/ui-theme";
import ProfileMainScreen from "@/components/profile/ProfileMainScreen";
import ProfileOverlay from "@/components/profile/ProfileOverlay";
import OrderChatBlock from "@/components/admin/OrderChatBlock";
import AdminOrderDetails from "@/components/admin/AdminOrderDetails";
import AdminOrdersList from "@/components/admin/AdminOrdersList";
import AdminSlotsPanel from "@/components/admin/AdminSlotsPanel";
import CheckoutOverlay from "@/components/checkout/CheckoutOverlay";
import AdminHeader from "@/components/admin/AdminHeader";
import {
  getAvailableDeliveryDatesForType,
  getAvailableTimeSlotsForType,
  getEffectiveSlots,
  parseLocalDate as parseLocalDateHelper,
} from "@/lib/domain/deliverySlots";
import {
  buildWeeklyScheduleSlots,
  getAvailableDeliveryDates as getWeeklyAvailableDeliveryDates,
  getAvailableTimeSlots as getWeeklyAvailableTimeSlots,
  type DateOverride,
  type OverrideInterval,
  type WeekdayInterval,
  type WeekdayRule,
} from "@/lib/domain/deliverySchedule";

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
  telegram_username?: string;
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
type AdminSection = "orders" | "slots";

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

type OrderChatMessage = {
  id: string;
  order_id: string;
  telegram_user_id: number;
  direction: "incoming" | "outgoing";
  text: string;
  bot_message_id?: number | null;
  reply_to_bot_message_id?: number | null;
  sender_role: "admin" | "customer" | "system";
  created_at: string;
};

type DeliverySlotRow = {
  id: string;
  slot_date: string;
  slot_label: string;
  delivery_type: "delivery" | "pickup";
  is_active: boolean;
  sort_order: number;
};

type PickupSetting = {
  id: string;
  title: string;
  address: string;
  worktime_text: string | null;
  is_active: boolean | null;
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

function statusColor(s: OrderStatus) {
  if (s === "assembling") return "#E6A23C";
  if (s === "on_the_way") return "#2B80A4";
  if (s === "delivered") return "#2FA36B";
  if (s === "canceled") return "#D43314";
  return "#888";
}

function StatusBadge({ status }: { status: OrderStatus }) {
  const color = statusColor(status);
  return (
    <span
      style={{
        padding: "4px 10px",
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 900,
        background: color + "22",
        color: color,
        border: `1px solid ${color}55`,
      }}
    >
      {statusLabel(status)}
    </span>
  );
}

function orderPreviewItems(itemsText?: string, maxLines = 2) {
  if (!itemsText) return [];
  return itemsText
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, maxLines);
}

function orderItemsList(itemsText?: string) {
  if (!itemsText) return [];
  return itemsText
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

/** Иконки (SVG) */
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
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M9 3.75h6" stroke={ink} strokeWidth="2.2" strokeLinecap="round" />
      <path d="M5 6.75h14" stroke={ink} strokeWidth="2.2" strokeLinecap="round" />
      <path
        d="M8 6.75l.55 10.1a1.5 1.5 0 0 0 1.5 1.42h3.9a1.5 1.5 0 0 0 1.5-1.42L16 6.75"
        stroke={ink}
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M10 10.25v4.75M14 10.25v4.75" stroke={ink} strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

function IconCopy({ ink }: { ink: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="9" y="9" width="10" height="10" rx="2" stroke={ink} strokeWidth="2" />
      <path d="M7 15H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v1" stroke={ink} strokeWidth="2" strokeLinecap="round" />
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
  const [closingProfileScreen, setClosingProfileScreen] = useState<Exclude<ProfileScreen, "menu"> | null>(null);

  // Telegram
  const [tgUserId, setTgUserId] = useState<number | null>(null);
  const [initData, setInitData] = useState<string>("");
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const [tgUser, setTgUser] = useState<TgUser | null>(null);

  const BRAND_BG = UI_THEME.brand.primary;
  const BRAND_ACCENT = UI_THEME.brand.accent;
  const BRAND_INK = UI_THEME.brand.ink;
  const CARD_BG = UI_THEME.brand.card;

  // Header
  const HEADER_H = 64;
  const HEADER_TOP_PAD = 2;

  // Bottom nav
  const NAV_BTN_W = 58;
  const NAV_BTN_H = 48;
  const NAV_GAP = 10;
  const NAV_PAD = 10;
  const NAV_LIFT = 18;

  // Boot loading
  const [bootLoading, setBootLoading] = useState(true);

  // Loading flags
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [productsLoading, setProductsLoading] = useState(false);
  const [profileSaveLoading, setProfileSaveLoading] = useState(false);

  // Shop
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [deliverySlots, setDeliverySlots] = useState<DeliverySlotRow[]>([]);
  const [weekdayRules, setWeekdayRules] = useState<WeekdayRule[]>([]);
  const [weekdayIntervals, setWeekdayIntervals] = useState<WeekdayInterval[]>([]);
  const [dateOverrides, setDateOverrides] = useState<DateOverride[]>([]);
  const [overrideIntervals, setOverrideIntervals] = useState<OverrideInterval[]>([]);
  const [pickupSettings, setPickupSettings] = useState<PickupSetting[]>([]);
  const [deliveryScheduleLoading, setDeliveryScheduleLoading] = useState(false);
  const [deliveryScheduleError, setDeliveryScheduleError] = useState<string | null>(null);

  // Cart
  const [cart, setCart] = useState<CartItem[]>([]);
  const total = useMemo(
    () => cart.reduce((sum, item) => sum + Number(item.product.price) * item.quantity, 0),
    [cart]
  );

  // Checkout overlay
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  // Checkout fields
  const [orderFullName, setOrderFullName] = useState("");
  const [orderPhone, setOrderPhone] = useState("");
  const [orderAddress, setOrderAddress] = useState("");
  const [deliveryType, setDeliveryType] = useState<"delivery" | "pickup">("delivery");
  const PICKUP_POINTS = [
    {
      id: "vo",
      title: "Василеостровский рынок",
      address: "Санкт-Петербург, Большой просп. Васильевского острова, 16/14Б этаж 1",
    },
    {
      id: "mos",
      title: "Московский рынок",
      address: "Санкт-Петербург, ул. Решетникова, 12 этаж 1",
    },
    {
      id: "strelna",
      title: "Стрельна",
      address: "посёлок Стрельна, ул. Нижняя Колония, 24",
    },
  ] as const;
  const DEFAULT_DELIVERY_INTERVALS = ["10:00–13:00", "13:00–16:00", "16:00–19:00"] as const;
  const DEFAULT_PICKUP_INTERVALS = ["10:00–20:00"] as const;
  const [pickupPointId, setPickupPointId] = useState<(typeof PICKUP_POINTS)[number]["id"]>("vo");
  const [isPrivateHouse, setIsPrivateHouse] = useState(false);
  const [orderEntrance, setOrderEntrance] = useState("");
  const [orderFloor, setOrderFloor] = useState("");
  const [orderApartment, setOrderApartment] = useState("");
  const [orderIntercom, setOrderIntercom] = useState("");
  const [deliveryDate, setDeliveryDate] = useState("");
  const [deliverySlot, setDeliverySlot] = useState("");
  const [orderComment, setOrderComment] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [promoCode, setPromoCode] = useState("");

  // Admin
  const [isAdmin, setIsAdmin] = useState(false);

  // Profile data
  const [profileData, setProfileData] = useState<UserProfile | null>(null);
  const [profileFormFullName, setProfileFormFullName] = useState("");
  const [profileFormPhone, setProfileFormPhone] = useState("");
  const [profileFormAddress, setProfileFormAddress] = useState("");

  // Profile orders
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [myOrders, setMyOrders] = useState<OrderForUi[]>([]);
  const [selectedMyOrderId, setSelectedMyOrderId] = useState<string | null>(null);
  const selectedMyOrder = useMemo(
    () => myOrders.find((o) => o.id === selectedMyOrderId) || null,
    [myOrders, selectedMyOrderId]
  );

  // Admin orders
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminError, setAdminError] = useState<string | null>(null);
  const [orders, setOrders] = useState<OrderForUi[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  
  const [selectedOverrideDate, setSelectedOverrideDate] = useState("");
  const [newIntervalDay, setNewIntervalDay] = useState<number | null>(null);
  const [newIntervalFrom, setNewIntervalFrom] = useState("");
  const [newIntervalTo, setNewIntervalTo] = useState("");
  const [newOverrideFrom, setNewOverrideFrom] = useState("");
  const [newOverrideTo, setNewOverrideTo] = useState("");
  const [pickupSavingId, setPickupSavingId] = useState<string | null>(null);
  const [adminSection, setAdminSection] = useState<AdminSection>("orders");
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<OrderChatMessage[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const chatListRef = useRef<HTMLDivElement | null>(null);
  const lastChatMessageIdRef = useRef<string | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const [chatAtBottom, setChatAtBottom] = useState(true);
  const [chatUnreadCount, setChatUnreadCount] = useState(0);
  const [chatClosedUnread, setChatClosedUnread] = useState(0);
  const [chatError, setChatError] = useState<string | null>(null);
  const [chatText, setChatText] = useState("");
  const [chatSending, setChatSending] = useState(false);
  const selectedOrder = useMemo(
    () => orders.find((o) => o.id === selectedOrderId) || null,
    [orders, selectedOrderId]
  );


  const weeklyScheduleSlots = useMemo(
    () =>
      buildWeeklyScheduleSlots({
        weekdayRules,
        weekdayIntervals,
        overrides: dateOverrides,
        overrideIntervals,
      }),
    [weekdayRules, weekdayIntervals, dateOverrides, overrideIntervals]
  );

  // ===== Spring indicator animation =====
  const viewIndex = view === "catalog" ? 0 : view === "cart" ? 1 : 2;

  const targetLeft = NAV_PAD + viewIndex * (NAV_BTN_W + NAV_GAP);

  const [indicatorLeft, setIndicatorLeft] = useState<number>(targetLeft);

  useEffect(() => {
    setIndicatorLeft(targetLeft);
  }, [targetLeft]);

  // Telegram init
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
    if (!tg) return;

    tg.ready();

    try {
      tg.setHeaderColor?.(BRAND_BG);
      tg.setBackgroundColor?.(BRAND_BG);
    } catch {}

    try {
      const ua = navigator.userAgent.toLowerCase();
      const isDesktopUA =
        ua.includes("windows") ||
        ua.includes("macintosh") ||
        ua.includes("linux x86_64") ||
        ua.includes("x11");
      const platform = String(tg.platform || "").toLowerCase();
      const isDesktopPlatform =
        platform === "tdesktop" || platform === "macos" || platform === "web" || platform === "weba" || platform === "webk";
      const isPhoneLike = !isDesktopUA && !isDesktopPlatform && window.innerWidth < 900;

      if (isPhoneLike) {
        tg.expand?.();
        try {
          tg.requestFullscreen?.();
        } catch {}
      }
    } catch {}

    setInitData(tg.initData || "");

    const u = (tg.initDataUnsafe?.user || null) as TgUser | null;
    setTgUser(u);

    if (u?.id) setTgUserId(u.id);

    // Скролл только внутри контента
    try {
      document.documentElement.style.height = "100%";
      document.body.style.height = "100%";
      document.body.style.margin = "0";
      document.body.style.overflow = "hidden";
    } catch {}
  }, []);

  useEffect(() => {
    const vv = window.visualViewport;

    const isTextField = (el: HTMLElement | null) => {
      return Boolean(
        el &&
          (el.tagName === "INPUT" ||
            el.tagName === "TEXTAREA" ||
            el.tagName === "SELECT" ||
            el.isContentEditable)
      );
    };

    const updateKeyboard = () => {
      const active = document.activeElement as HTMLElement | null;
      const diff = vv ? window.innerHeight - vv.height : 0;
      setKeyboardOpen(Boolean(isTextField(active) && diff > 0));
    };

    const forceOpen = (event: Event) => {
      const target = event.target as HTMLElement | null;
      if (isTextField(target)) setKeyboardOpen(true);
    };

    const forceClose = () => {
      requestAnimationFrame(() => {
        const active = document.activeElement as HTMLElement | null;
        if (!isTextField(active)) setKeyboardOpen(false);
      });
    };

    if (vv) {
      vv.addEventListener("resize", updateKeyboard);
      vv.addEventListener("scroll", updateKeyboard);
    }
    document.addEventListener("focusin", forceOpen, true);
    document.addEventListener("focusout", forceClose, true);

    return () => {
      if (vv) {
        vv.removeEventListener("resize", updateKeyboard);
        vv.removeEventListener("scroll", updateKeyboard);
      }
      document.removeEventListener("focusin", forceOpen, true);
      document.removeEventListener("focusout", forceClose, true);
    };
  }, []);

  // Detect admin
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

  // Load categories
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

  // Load products
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
    async function loadDeliverySlots() {
      const today = new Date().toISOString().slice(0, 10);

      const { data } = await supabase
        .from("delivery_slots")
        .select("id,slot_date,slot_label,delivery_type,is_active,sort_order")
        .gte("slot_date", today)
        .order("slot_date", { ascending: true })
        .order("sort_order", { ascending: true });

      setDeliverySlots((data || []) as DeliverySlotRow[]);
    }

    loadDeliverySlots();
  }, []);

  async function loadWeeklyDeliverySchedule() {
    setDeliveryScheduleLoading(true);
    setDeliveryScheduleError(null);

    try {
      const res = await fetch("/api/admin/delivery-schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        setDeliveryScheduleError(data?.error || `Ошибка загрузки расписания (HTTP ${res.status})`);
        return;
      }

      setWeekdayRules((data.weekdayRules || []) as WeekdayRule[]);
      setWeekdayIntervals((data.weekdayIntervals || []) as WeekdayInterval[]);
      setDateOverrides((data.overrides || []) as DateOverride[]);
      setOverrideIntervals((data.overrideIntervals || []) as OverrideInterval[]);
      setPickupSettings((data.pickupSettings || []) as PickupSetting[]);
    } catch (e: any) {
      setDeliveryScheduleError(e?.message || "Ошибка сети");
    } finally {
      setDeliveryScheduleLoading(false);
    }
  }

  useEffect(() => {
    loadWeeklyDeliverySchedule();
  }, []);

  // Boot loading ends when basic data is there
  useEffect(() => {
    if (!categoriesLoading && initData !== "") {
      const t = setTimeout(() => setBootLoading(false), 450);
      return () => clearTimeout(t);
    }
  }, [categoriesLoading, initData]);

  // Load user profile
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

        // Автоподставляем в оформление
        setOrderFullName(row.full_name || tgDisplayName());
        setOrderPhone(row.phone || "");
        setOrderAddress(row.address || "");
      } else {
        // Если профиля нет — хотя бы имя телеги подставим
        const fallbackName = tgDisplayName();
        setProfileFormFullName(fallbackName);
        setOrderFullName(fallbackName);
      }
    }

    loadUserProfile();
  }, [tgUserId]);

  function tgDisplayName() {
    const first = tgUser?.first_name || "";
    const last = tgUser?.last_name || "";
    const full = `${first} ${last}`.trim();
    return full || tgUser?.username || "";
  }

function isValidPhone(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.length !== 11) return false;
  if (digits[0] !== "7" && digits[0] !== "8") return false;
  return true;
}

  async function saveProfileData() {
    if (!tgUserId) {
      alert("Не удалось определить Telegram ID");
      return;
    }

if (profileFormPhone && !isValidPhone(profileFormPhone)) {
  alert("Введите корректный номер телефона");
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

    // Автоподставляем в оформление
    setOrderFullName(payload.full_name || tgDisplayName());
    setOrderPhone(payload.phone || "");
    setOrderAddress(payload.address || "");

    alert("Данные сохранены");
  }

  // Cart ops
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

  // Submit order
  async function submitOrder() {
	  if (orderPhone && !isValidPhone(orderPhone)) {
  return alert("Введите корректный номер телефона");
}
    if (!tgUserId) return alert("Ошибка авторизации (нет Telegram user id)");
if (!orderFullName || !orderPhone) {
  return alert("Заполните Имя и телефон");
}
if (deliveryType === "delivery" && !orderAddress.trim()) {
  return alert("Введите адрес доставки");
}
if (deliveryType === "pickup" && !getSelectedPickupPoint()) {
  return alert("Выберите точку самовывоза");
}
if (deliveryType === "delivery" && !deliveryDate) {
  return alert("Выберите дату");
}
if (deliveryType === "delivery" && !getAvailableTimeSlots().includes(deliverySlot)) {
  return alert("Выберите доступный интервал времени");
}
if (cart.length === 0) {
  return alert("🧺 Корзина пока пуста\n\nДобавьте товары из каталога, чтобы оформить заказ.");
}

    const { data, error } = await supabase
      .from("orders")
      .insert([
        {
          user_telegram_id: tgUserId,
          customer_name: orderFullName,
          phone: orderPhone,
          address: deliveryType === "pickup" ? getSelectedPickupPoint().address : buildDeliveryAddress(),
          comment: buildOrderComment(),
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

  // Profile: load my orders
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

  // Admin: list orders
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


  async function loadOrderChat(orderId: string, silent = false) {
    if (!initData) return;

    if (!silent) {
      setChatLoading(true);
    }
    setChatError(null);

    try {
      const res = await fetch("/api/admin/chat/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ initData, orderId }),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        setChatError(data?.error || `Ошибка загрузки чата (HTTP ${res.status})`);
        if (!silent) {
          setChatMessages([]);
        }
        return;
      }

      setChatMessages((data.messages || []) as OrderChatMessage[]);
    } catch (e: any) {
      setChatError(e?.message || "Ошибка сети");
      if (!silent) {
        setChatMessages([]);
      }
    } finally {
      if (!silent) {
        setChatLoading(false);
      }
    }
  }

  async function sendOrderChat(orderId: string) {
    const text = chatText.trim();
    if (!text || !initData) return;

    setChatSending(true);
    setChatError(null);

    try {
      const res = await fetch("/api/admin/chat/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ initData, orderId, text }),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        setChatError(data?.error || `Ошибка отправки (HTTP ${res.status})`);
        return;
      }

      setChatText("");
      await loadOrderChat(orderId);
    } catch (e: any) {
      setChatError(e?.message || "Ошибка сети");
    } finally {
      setChatSending(false);
    }
  }

  function getSelectedPickupPoint() {
    const mapped = pickupSettings
      .filter((p) => p.is_active !== false)
      .map((p) => {
        const existing = PICKUP_POINTS.find((point) => point.title === p.title || point.address === p.address);
        return {
          id: existing?.id || "vo",
          title: p.title,
          address: p.address,
          worktime_text: p.worktime_text,
        };
      });

    const found = mapped.find((p) => p.id === pickupPointId);
    if (found) return found;

    return {
      ...PICKUP_POINTS[0],
      worktime_text: null,
    };
  }

  function buildDeliveryAddress() {
    const parts = [orderAddress.trim()];

    if (!isPrivateHouse) {
      if (orderEntrance.trim()) parts.push(`Подъезд: ${orderEntrance.trim()}`);
      if (orderFloor.trim()) parts.push(`Этаж: ${orderFloor.trim()}`);
      if (orderApartment.trim()) parts.push(`Квартира: ${orderApartment.trim()}`);
      if (orderIntercom.trim()) parts.push(`Домофон: ${orderIntercom.trim()}`);
    } else {
      parts.push("Частный дом");
    }

    return parts.filter(Boolean).join(", ");
  }

  // slot helpers moved to src/lib/domain/deliverySlots.ts

  function getAvailableDeliveryDates() {
    if (deliveryType === "delivery") {
      if (!deliveryScheduleLoading && weekdayRules.length > 0) {
        return getWeeklyAvailableDeliveryDates(weeklyScheduleSlots);
      }

      return getAvailableDeliveryDatesForType(
        deliveryType,
        deliverySlots,
        DEFAULT_DELIVERY_INTERVALS,
        DEFAULT_PICKUP_INTERVALS
      );
    }

    return getAvailableDeliveryDatesForType(
      deliveryType,
      deliverySlots,
      DEFAULT_DELIVERY_INTERVALS,
      DEFAULT_PICKUP_INTERVALS
    );
  }

  function getAvailableTimeSlots() {
    if (deliveryType === "delivery") {
      if (!deliveryScheduleLoading && weekdayRules.length > 0) {
        return getWeeklyAvailableTimeSlots(weeklyScheduleSlots, deliveryDate);
      }

      return getAvailableTimeSlotsForType(
        deliveryType,
        deliveryDate,
        deliverySlots,
        DEFAULT_DELIVERY_INTERVALS,
        DEFAULT_PICKUP_INTERVALS
      );
    }

    return getAvailableTimeSlotsForType(
      deliveryType,
      deliveryDate,
      deliverySlots,
      DEFAULT_DELIVERY_INTERVALS,
      DEFAULT_PICKUP_INTERVALS
    );
  }

  function buildOrderComment() {
    const parts: string[] = [];

    if (deliveryType === "delivery" && deliveryDate) {
      const dateLabel = parseLocalDateHelper(deliveryDate).toLocaleDateString("ru-RU", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
      parts.push(`Дата: ${dateLabel}`);
    }

    if (deliveryType === "delivery" && deliverySlot) {
      parts.push(`Интервал: ${deliverySlot}`);
    }

    if (promoCode.trim()) {
      parts.push(`Промокод: ${promoCode.trim()}`);
    }

    if (orderComment.trim()) {
      parts.push(`Комментарий: ${orderComment.trim()}`);
    }

    return parts.join("\\n");
  }

  useEffect(() => {
    if (deliveryType !== "delivery") return;

    const dates = getAvailableDeliveryDates();
    const hasSelectedDate = dates.some((d) => d.value === deliveryDate);

    if (deliveryDate && !hasSelectedDate) {
      setDeliveryDate("");
      setDeliverySlot("");
      return;
    }

    const slots = getAvailableTimeSlots();
    const hasSelectedSlot = slots.includes(deliverySlot);

    if (deliverySlot && !hasSelectedSlot) {
      setDeliverySlot("");
    }
  }, [
    deliveryType,
    deliveryDate,
    deliverySlot,
    deliverySlots,
    deliveryScheduleLoading,
    weekdayRules,
    weekdayIntervals,
    dateOverrides,
    overrideIntervals,
  ]);

  function openSupport() {
    const SUPPORT_LINK = process.env.NEXT_PUBLIC_SUPPORT_LINK || "";
    if (!SUPPORT_LINK) {
      alert("Не задан NEXT_PUBLIC_SUPPORT_LINK в .env.local");
      return;
    }

    const tg = (window as any)?.Telegram?.WebApp;
    try {
      tg?.openTelegramLink?.(SUPPORT_LINK);
      return;
    } catch {}

    window.open(SUPPORT_LINK, "_blank");
  }

  async function copyPhone(phone: string) {
    try {
      await navigator.clipboard.writeText(phone);
      alert("Номер скопирован");
    } catch {
      alert(`Не удалось скопировать автоматически. Номер: ${phone}`);
    }
  }

  async function openUserChat(telegramUserId?: number, telegramUsername?: string) {
    const tg = (window as any)?.Telegram?.WebApp;

    if (telegramUsername) {
      const clean = telegramUsername.replace(/^@/, "");
      const url = `https://t.me/${clean}`;
      try {
        tg?.openTelegramLink?.(url);
        return;
      } catch {}
      window.open(url, "_blank");
      return;
    }

    if (telegramUserId) {
      try {
        await navigator.clipboard.writeText(String(telegramUserId));
      } catch {}
      alert("У пользователя нет публичного @username. Telegram ID скопирован, но прямой переход в чат по одному ID в mini app работает нестабильно.");
      return;
    }

    alert("Не найден Telegram username или ID пользователя");
  }

  function applyDeliverySchedulePayload(data: any) {
    setWeekdayRules((data?.weekdayRules || []) as WeekdayRule[]);
    setWeekdayIntervals((data?.weekdayIntervals || []) as WeekdayInterval[]);
    setDateOverrides((data?.overrides || []) as DateOverride[]);
    setOverrideIntervals((data?.overrideIntervals || []) as OverrideInterval[]);
    setPickupSettings((data?.pickupSettings || []) as PickupSetting[]);
  }

  async function runDeliveryScheduleAction(action: Record<string, any>) {
    setDeliveryScheduleError(null);
    const scrollTop = contentRef.current?.scrollTop ?? 0;

    try {
      const res = await fetch("/api/admin/delivery-schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        const message = data?.error || `Ошибка сохранения расписания (HTTP ${res.status})`;
        setDeliveryScheduleError(message);
        alert(message);
        return false;
      }

      applyDeliverySchedulePayload(data);
      requestAnimationFrame(() => {
        if (contentRef.current) {
          contentRef.current.scrollTop = scrollTop;
        }
      });
      return true;
    } catch (e: any) {
      const message = e?.message || "Ошибка сети";
      setDeliveryScheduleError(message);
      alert(message);
      return false;
    } finally {
    }
  }

  async function toggleWeekdayRule(ruleId: string, nextEnabled: boolean) {
    setWeekdayRules((prev) =>
      prev.map((rule) => (rule.id === ruleId ? { ...rule, is_enabled: nextEnabled } : rule))
    );

    const ok = await runDeliveryScheduleAction({
      type: "toggleWeekday",
      ruleId,
      is_enabled: nextEnabled,
    });

    if (!ok) {
      await loadWeeklyDeliverySchedule();
    }
  }

  async function toggleWeekdayInterval(intervalId: string, nextEnabled: boolean) {
    setWeekdayIntervals((prev) =>
      prev.map((interval) =>
        interval.id === intervalId ? { ...interval, is_enabled: nextEnabled } : interval
      )
    );

    const ok = await runDeliveryScheduleAction({
      type: "toggleWeekdayInterval",
      intervalId,
      is_enabled: nextEnabled,
    });

    if (!ok) {
      await loadWeeklyDeliverySchedule();
    }
  }

  async function addWeekdayInterval() {
    if (newIntervalDay === null || !newIntervalFrom || !newIntervalTo) {
      alert("Выбери день недели и заполни время начала и конца интервала");
      return;
    }

    const rule = weekdayRules.find((item) => item.day_of_week === newIntervalDay);
    if (!rule) {
      alert("Не найдено правило для выбранного дня недели");
      return;
    }

    const ok = await runDeliveryScheduleAction({
      type: "createWeekdayInterval",
      weekday_rule_id: rule.id,
      time_from: newIntervalFrom,
      time_to: newIntervalTo,
    });

    if (ok) {
      setNewIntervalFrom("");
      setNewIntervalTo("");
    }
  }

  async function deleteWeekdayInterval(intervalId: string) {
    await runDeliveryScheduleAction({
      type: "deleteWeekdayInterval",
      intervalId,
    });
  }

  async function toggleOverrideDayDisabled() {
    if (!selectedOverrideDate) {
      alert("Сначала выбери дату");
      return;
    }

    setDateOverrides((prev) => {
      const existing = prev.find((item) => item.date === selectedOverrideDate);
      if (!existing) {
        return [...prev, { id: "temp-override", date: selectedOverrideDate, is_disabled: true }];
      }
      return prev.map((item) =>
        item.date === selectedOverrideDate ? { ...item, is_disabled: !Boolean(item.is_disabled) } : item
      );
    });

    const ok = await runDeliveryScheduleAction({
      type: "toggleOverrideDayDisabled",
      date: selectedOverrideDate,
    });

    if (!ok) {
      await loadWeeklyDeliverySchedule();
    }
  }

  async function addOverrideInterval() {
    if (!selectedOverrideDate || !newOverrideFrom || !newOverrideTo) {
      alert("Выбери дату и задай время начала и конца интервала");
      return;
    }

    const ok = await runDeliveryScheduleAction({
      type: "createOverrideInterval",
      date: selectedOverrideDate,
      time_from: newOverrideFrom,
      time_to: newOverrideTo,
    });

    if (ok) {
      setNewOverrideFrom("");
      setNewOverrideTo("");
    }
  }

  async function toggleOverrideInterval(intervalId: string, nextEnabled: boolean) {
    setOverrideIntervals((prev) =>
      prev.map((interval) =>
        interval.id === intervalId ? { ...interval, is_enabled: nextEnabled } : interval
      )
    );

    const ok = await runDeliveryScheduleAction({
      type: "toggleOverrideInterval",
      intervalId,
      is_enabled: nextEnabled,
    });

    if (!ok) {
      await loadWeeklyDeliverySchedule();
    }
  }

  async function deleteOverrideInterval(intervalId: string) {
    await runDeliveryScheduleAction({
      type: "deleteOverrideInterval",
      intervalId,
    });
  }

  async function updatePickupWorktime(pickupId: string, worktimeText: string) {
    setPickupSavingId(pickupId);

    try {
      await runDeliveryScheduleAction({
        type: "updatePickupWorktime",
        pickupId,
        worktime_text: worktimeText,
      });
    } finally {
      setPickupSavingId(null);
    }
  }

  function openProfileScreen(screen: Exclude<ProfileScreen, "menu">) {
    setClosingProfileScreen(null);
    setProfileScreen(screen);
  }

  function closeProfileScreen() {
    if (profileScreen === "menu") return;
    setClosingProfileScreen(profileScreen);
    setProfileScreen("menu");
    window.setTimeout(() => {
      setClosingProfileScreen(null);
    }, 220);
  }

  useEffect(() => {
    if (view === "profile" && profileScreen === "history") loadMyOrders();
  }, [view, profileScreen]);

  useEffect(() => {
    if (selectedOrderId && chatOpen) {
      loadOrderChat(selectedOrderId);
    }
  }, [selectedOrderId, chatOpen]);

  useEffect(() => {
    if (!selectedOrderId) return;

    const t = window.setInterval(() => {
      loadOrderChat(selectedOrderId, true);
    }, 5000);

    return () => window.clearInterval(t);
  }, [selectedOrderId]);

  useEffect(() => {
    const lastId = chatMessages.length > 0 ? chatMessages[chatMessages.length - 1].id : null;
    const hasNewLastMessage = lastId !== lastChatMessageIdRef.current;
    const hadLastMessageBefore = lastChatMessageIdRef.current !== null;
    lastChatMessageIdRef.current = lastId;

    if (!hasNewLastMessage) return;

    if (!chatOpen) {
      if (hadLastMessageBefore) {
        const lastMessage = chatMessages[chatMessages.length - 1];
        if (lastMessage?.direction === "incoming") {
          setChatClosedUnread((prev) => prev + 1);
        }
      }
      return;
    }

    const el = chatListRef.current;
    if (!el) return;

    const shouldForceInitialScroll = !hadLastMessageBefore;
    if (shouldForceInitialScroll || chatAtBottom) {
      requestAnimationFrame(() => {
        el.scrollTo({ top: el.scrollHeight, behavior: shouldForceInitialScroll ? "auto" : "smooth" });
        setChatUnreadCount(0);
      });
      return;
    }

    const lastMessage = chatMessages[chatMessages.length - 1];
    if (lastMessage?.direction === "incoming") {
      setChatUnreadCount((prev) => prev + 1);
    }
  }, [chatMessages, chatOpen, chatAtBottom]);

  function scrollChatToBottom() {
    const el = chatListRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    setChatUnreadCount(0);
    setChatAtBottom(true);
  }

  function handleChatScroll() {
    const el = chatListRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    const isNearBottom = distanceFromBottom < 48;
    setChatAtBottom(isNearBottom);
    if (isNearBottom) {
      setChatUnreadCount(0);
    }
  }

  // ===== Layout styles =====
  const root: React.CSSProperties = {
    height: "100vh",
    background: BRAND_BG,
    color: BRAND_INK,
    fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial",
    overflow: "hidden",
    overscrollBehaviorX: "none",
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

  // Лого: чуть увеличили
const logoStyle: React.CSSProperties = {
  height: "clamp(56px, 12vw, 84px)",
  width: "auto",
  display: "block",
  filter: "drop-shadow(0 10px 20px rgba(0,0,0,0.18))",
  pointerEvents: "none",
  userSelect: "none",
  transform: "translateY(34px)",
};

  const navTotalHeight = NAV_PAD * 2 + NAV_BTN_H;
  const contentBottomPadding = `calc(env(safe-area-inset-bottom, 0px) + ${NAV_LIFT}px + ${navTotalHeight}px + 22px)`;

  const content: React.CSSProperties = {
    position: "absolute",
    left: 0,
    right: 0,
    top: `calc(env(safe-area-inset-top, 0px) + ${HEADER_H - 16}px)`,
    bottom: 0,
    overflowY: "auto",
    overflowX: "hidden",
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

  const statusActionBtn = (status: OrderStatus, active: boolean): React.CSSProperties => ({
    padding: "10px 12px",
    borderRadius: 14,
    border: active
      ? `1px solid ${statusColor(status)}`
      : "1px solid rgba(0,0,0,0.10)",
    background: active ? `${statusColor(status)}22` : "rgba(255,255,255,0.85)",
    color: active ? statusColor(status) : BRAND_INK,
    fontWeight: 900,
    cursor: "pointer",
    boxShadow: active ? `0 8px 18px ${statusColor(status)}22` : "none",
  });

  const btnTab = (active: boolean): React.CSSProperties => ({
    padding: "10px 12px",
    borderRadius: 14,
    border: active
                            ? UI_THEME.categoryActive.border
      : "1px solid rgba(0,0,0,0.10)",
    background: active
      ? UI_THEME.tabActive.bg
      : "rgba(255,255,255,0.85)",
    color: BRAND_INK,
    fontWeight: 900,
    cursor: "pointer",
    boxShadow: active
      ? UI_THEME.categoryActive.shadow
      : "none",
    transition: "transform 140ms ease, box-shadow 160ms ease, background 160ms ease, border-color 160ms ease",
  });

  const iosSwitchWrap = (active: boolean): React.CSSProperties => ({
    width: 50,
    height: 30,
    borderRadius: 999,
    border: active ? "1px solid rgba(107, 214, 95, 0.55)" : "1px solid rgba(10,19,23,0.12)",
    background: active ? "#6BD65F" : "rgba(10,19,23,0.08)",
    position: "relative",
    transition: "all 160ms ease",
    cursor: "pointer",
    flexShrink: 0,
    boxShadow: active ? "inset 0 0 0 1px rgba(255,255,255,0.18)" : "inset 0 0 0 1px rgba(255,255,255,0.3)",
  });

  const iosSwitchKnob = (active: boolean): React.CSSProperties => ({
    position: "absolute",
    top: 3,
    left: active ? 23 : 3,
    width: 24,
    height: 24,
    borderRadius: 999,
    background: "#fff",
    boxShadow: "0 4px 10px rgba(0,0,0,0.18)",
    transition: "all 160ms ease",
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


  // ===== Bottom nav =====
  const hideBottomNav = keyboardOpen || checkoutOpen;

  const navWrap: React.CSSProperties = {
    position: "fixed",
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 60,
    paddingBottom: `calc(env(safe-area-inset-bottom, 0px) + ${NAV_LIFT}px)`,
    display: "flex",
    justifyContent: "center",
    pointerEvents: hideBottomNav ? "none" : "none",
    opacity: hideBottomNav ? 0 : 1,
    transform: hideBottomNav ? "translateY(180px)" : "translateY(0)",
    transition: "opacity 160ms ease, transform 160ms ease",
  };

  const navPill: React.CSSProperties = {
    pointerEvents: "auto",
    position: "relative",
    display: "flex",
    gap: NAV_GAP,
    alignItems: "center",
    padding: NAV_PAD,
    borderRadius: 22,
    background: "linear-gradient(180deg, rgba(255,255,255,0.34) 0%, rgba(255,255,255,0.20) 100%)",
    border: "1px solid rgba(255,255,255,0.28)",
    backdropFilter: "blur(18px)",
    WebkitBackdropFilter: "blur(18px)",
    boxShadow: "0 20px 48px rgba(0,0,0,0.24), inset 0 1px 0 rgba(255,255,255,0.30)",
  };

  const IND_INSET = 1;
  const indicator: React.CSSProperties = {
    position: "absolute",
    top: NAV_PAD + IND_INSET,
    left: indicatorLeft + IND_INSET,
    width: NAV_BTN_W - IND_INSET * 2,
    height: NAV_BTN_H - IND_INSET * 2,
    borderRadius: 15,
    background: "linear-gradient(180deg, rgba(255,255,255,0.95) 0%, rgba(243,248,251,0.82) 100%)",
    border: "1px solid rgba(255,255,255,0.62)",
    boxShadow: "0 8px 18px rgba(8,24,33,0.10), inset 0 1px 0 rgba(255,255,255,0.98)",
    transition: "left 240ms cubic-bezier(0.22, 1, 0.36, 1)",
    zIndex: 0,
  };

  const navBtnBase: React.CSSProperties = {
    width: NAV_BTN_W,
    height: NAV_BTN_H,
    borderRadius: 16,
    border: "1px solid rgba(255,255,255,0.10)",
    background: "transparent",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    userSelect: "none",
    WebkitTapHighlightColor: "transparent",
    transition: "transform 140ms ease, opacity 140ms ease, filter 160ms ease",
    position: "relative",
    zIndex: 1,
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

  const avatarSrc =
    tgUser?.photo_url ||
    profileData?.telegram_photo_url ||
    "";

  const activeProfileOverlayScreen =
    profileScreen !== "menu" ? profileScreen : closingProfileScreen;
  const isProfileOverlayVisible = profileScreen !== "menu";

  if (bootLoading) {
    return (
      <div style={root}>
        <style>{`
        @keyframes appShimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        @keyframes orderSheetIn {
          0% { opacity: 0; transform: translateY(28px) scale(0.985); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
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
        button,
        [role="button"] {
          -webkit-tap-highlight-color: transparent;
          -webkit-touch-callout: none;
          user-select: none;
          -webkit-user-select: none;
          touch-action: manipulation;
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
        @keyframes orderSheetIn {
          0% { opacity: 0; transform: translateY(28px) scale(0.985); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
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

      <div ref={contentRef} style={content}>
        {/* CATALOG */}
        {view === "catalog" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={card}>
              <div style={{ fontWeight: 900, fontSize: 16 }}>Категории</div>

              {categoriesLoading ? (
                <div style={{ marginTop: 10, display: "flex", gap: 4, flexWrap: "wrap" }}>
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
                          border: active
                            ? UI_THEME.categoryActive.border
                            : "1px solid rgba(10,19,23,0.12)",
                          background: active
                            ? UI_THEME.categoryActive.bg
                            : "rgba(10,19,23,0.04)",
                          color: BRAND_INK,
                          cursor: "pointer",
                          fontWeight: 900,
                          boxShadow: active ? UI_THEME.categoryActive.shadow : "none",
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
                          borderRadius: 18,
                          border: "1px solid rgba(10,19,23,0.08)",
                          padding: 16,
                          background: "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(248,249,251,0.94) 100%)",
                          boxShadow: "0 12px 24px rgba(10,19,23,0.04), inset 0 1px 0 rgba(255,255,255,0.78)",
                        }}
                      >
                        <div style={{ fontWeight: 900, fontSize: 17, letterSpacing: "-0.02em" }}>{p.title}</div>
                        {p.description && (
                          <div style={{ marginTop: 2, fontSize: 13, opacity: 0.72, lineHeight: 1.45 }}>
                            {p.description}
                          </div>
                        )}

                        <div
                          style={{
                            marginTop: 10,
                            display: "flex",
                            justifyContent: "space-between",
                            gap: 10,
                            alignItems: "center",
                          }}
                        >
                          <div style={{ fontWeight: 900, fontSize: 18, letterSpacing: "-0.02em" }}>
                            {formatPriceRub(p.price)}{" "}
                            <span style={{ fontWeight: 700, opacity: 0.7, fontSize: 12 }}>
                              {p.unit_type === "weight" ? "за кг" : "за шт"}
                            </span>
                          </div>

                          <div
                            style={{
                              width: 112,
                              minWidth: 112,
                              height: 40,
                              display: "flex",
                              justifyContent: "flex-end",
                              alignItems: "center",
                              flexShrink: 0,
                            }}
                          >
                            {!cartItem ? (
                              <button
                                onPointerDown={onPressDown}
                                onPointerUp={onPressUp}
                                onPointerCancel={onPressUp}
                                onPointerLeave={onPressUp}
                                style={{
                                  padding: "0 12px",
                                  width: 112,
                                  height: 40,
                                  justifyContent: "center",
                                  borderRadius: 999,
                                  border: UI_THEME.addButton.border,
                                  background: "linear-gradient(180deg, rgba(43,128,164,0.24) 0%, rgba(43,128,164,0.15) 100%)",
                                  color: BRAND_INK,
                                  fontWeight: 900,
                                  cursor: "pointer",
                                  boxShadow: "0 10px 22px rgba(43,128,164,0.14), inset 0 1px 0 rgba(255,255,255,0.74)",
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 6,
                                  whiteSpace: "nowrap",
                                  transition: "transform 140ms ease, box-shadow 160ms ease, filter 160ms ease",
                                }}
                                onClick={() => addToCart(p)}
                              >
                                + Добавить
                              </button>
                            ) : (
                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "space-between",
                                  gap: 8,
                                  padding: "4px",
                                  width: 112,
                                  minWidth: 112,
                                  height: 40,
                                  borderRadius: 999,
                                  border: "1px solid rgba(43,128,164,0.14)",
                                  background: "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(241,247,250,0.94) 100%)",
                                  boxShadow: "0 10px 18px rgba(43,128,164,0.08), inset 0 1px 0 rgba(255,255,255,0.88)",
                                }}
                              >
                                <button
                                  onPointerDown={onPressDown}
                                  onPointerUp={onPressUp}
                                  onPointerCancel={onPressUp}
                                  onPointerLeave={onPressUp}
                                  style={{
                                    width: 30,
                                    height: 30,
                                    borderRadius: 999,
                                    border: "1px solid rgba(43,128,164,0.18)",
                                    background: "linear-gradient(180deg, rgba(240,249,253,0.98) 0%, rgba(230,243,249,0.94) 100%)",
                                    fontWeight: 900,
                                    color: BRAND_BG,
                                    cursor: "pointer",
                                    boxShadow: "0 8px 16px rgba(43,128,164,0.10), inset 0 1px 0 rgba(255,255,255,0.92)",
                                  }}
                                  onClick={() => changeQuantity(p.id, -1)}
                                >
                                  −
                                </button>

                                <div
                                  style={{
                                    minWidth: 18,
                                    textAlign: "center",
                                    fontWeight: 900,
                                    fontSize: 14,
                                    letterSpacing: "-0.02em",
                                  }}
                                >
                                  {cartItem.quantity}
                                </div>

                                <button
                                  onPointerDown={onPressDown}
                                  onPointerUp={onPressUp}
                                  onPointerCancel={onPressUp}
                                  onPointerLeave={onPressUp}
                                  style={{
                                    width: 30,
                                    height: 30,
                                    borderRadius: 999,
                                    border: "1px solid rgba(43,128,164,0.18)",
                                    background: "linear-gradient(180deg, rgba(240,249,253,0.98) 0%, rgba(230,243,249,0.94) 100%)",
                                    fontWeight: 900,
                                    color: BRAND_BG,
                                    cursor: "pointer",
                                    boxShadow: "0 8px 16px rgba(43,128,164,0.10), inset 0 1px 0 rgba(255,255,255,0.92)",
                                  }}
                                  onClick={() => changeQuantity(p.id, 1)}
                                >
                                  +
                                </button>
                              </div>
                            )}
                          </div>
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

        {/* CART */}
        {view === "cart" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={card}>
              <div style={{ fontWeight: 900, fontSize: 16 }}>Корзина</div>

              {cart.length === 0 ? (
                <div
                  style={{
                    marginTop: 14,
                    padding: 18,
                    borderRadius: 16,
                    border: "1px dashed rgba(10,19,23,0.14)",
                    background: "rgba(10,19,23,0.02)",
                    textAlign: "center",
                  }}
                >
                  <div style={{ fontSize: 26, lineHeight: 1 }}>🧺</div>
                  <div style={{ marginTop: 10, fontWeight: 900, fontSize: 16 }}>
                    Корзина пока пуста
                  </div>
                  <div style={{ marginTop: 6, fontSize: 13, opacity: 0.72 }}>
                    Добавьте товары из каталога, чтобы оформить заказ.
                  </div>
                </div>
              ) : (
                <>
                  <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 10 }}>
                    {cart.map((item) => (
                      <div
                        key={item.product.id}
                        style={{
                          borderRadius: 18,
                          border: "1px solid rgba(10,19,23,0.08)",
                          padding: 16,
                          background: "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(248,249,251,0.94) 100%)",
                          boxShadow: "0 12px 24px rgba(10,19,23,0.04), inset 0 1px 0 rgba(255,255,255,0.78)",
                        }}
                      >
                        <div style={{ fontWeight: 900 }}>{item.product.title}</div>
                        <div style={{ marginTop: 6, opacity: 0.85 }}>
                          {formatPriceRub(item.product.price)}{" "}
                          <span style={{ fontSize: 12, opacity: 0.7 }}>
                            {item.product.unit_type === "weight" ? "за кг" : "за шт"}
                          </span>
                        </div>

                        <div
                          style={{
                            marginTop: 10,
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                            padding: "4px",
                            borderRadius: 999,
                            border: "1px solid rgba(43,128,164,0.14)",
                            background: "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(241,247,250,0.94) 100%)",
                            boxShadow: "0 10px 18px rgba(43,128,164,0.08), inset 0 1px 0 rgba(255,255,255,0.88)",
                            width: "fit-content",
                          }}
                        >
                          <button
                            onPointerDown={onPressDown}
                            onPointerUp={onPressUp}
                            onPointerCancel={onPressUp}
                            onPointerLeave={onPressUp}
                            style={{
                              width: 30,
                              height: 30,
                              borderRadius: 999,
                              border: "1px solid rgba(43,128,164,0.18)",
                              background: "linear-gradient(180deg, rgba(240,249,253,0.98) 0%, rgba(230,243,249,0.94) 100%)",
                              fontWeight: 900,
                              color: BRAND_BG,
                              cursor: "pointer",
                              boxShadow: "0 8px 16px rgba(43,128,164,0.10), inset 0 1px 0 rgba(255,255,255,0.92)",
                            }}
                            onClick={() => changeQuantity(item.product.id, -1)}
                          >
                            −
                          </button>
                          <div
                            style={{
                              minWidth: 18,
                              textAlign: "center",
                              fontWeight: 900,
                              fontSize: 14,
                            }}
                          >
                            {item.quantity}
                          </div>
                          <button
                            onPointerDown={onPressDown}
                            onPointerUp={onPressUp}
                            onPointerCancel={onPressUp}
                            onPointerLeave={onPressUp}
                            style={{
                              width: 30,
                              height: 30,
                              borderRadius: 999,
                              border: "1px solid rgba(43,128,164,0.18)",
                              background: "linear-gradient(180deg, rgba(240,249,253,0.98) 0%, rgba(230,243,249,0.94) 100%)",
                              fontWeight: 900,
                              color: BRAND_BG,
                              cursor: "pointer",
                              boxShadow: "0 8px 16px rgba(43,128,164,0.10), inset 0 1px 0 rgba(255,255,255,0.92)",
                            }}
                            onClick={() => changeQuantity(item.product.id, 1)}
                          >
                            +
                          </button>
                          <button
                            onPointerDown={onPressDown}
                            onPointerUp={onPressUp}
                            onPointerCancel={onPressUp}
                            onPointerLeave={onPressUp}
                            style={{
                              width: 28,
                              height: 28,
                              borderRadius: 999,
                              border: "1px solid rgba(10,19,23,0.10)",
                              background: "#fff",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              cursor: "pointer",
                              padding: 0,
                            }}
                            onClick={() => removeFromCart(item.product.id)}
                            title="Убрать из корзины"
                          >
                            <span style={{ color: "#D43314", fontSize: 18, fontWeight: 900, lineHeight: 1 }}>✕</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div
                    style={{
                      marginTop: 14,
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 10,
                    }}
                  >
                    <div style={{ fontWeight: 900, fontSize: 16 }}>Итого</div>
                    <div style={{ fontWeight: 900, fontSize: 16 }}>{formatPriceRub(total)}</div>
                  </div>

                  <button
                    style={{
                      ...btnPrimary,
                      width: "100%",
                      marginTop: 14,
                      minHeight: 54,
                      fontSize: 16,
                      letterSpacing: "-0.01em",
                      boxShadow: "0 18px 30px rgba(212,51,20,0.24), inset 0 1px 0 rgba(255,255,255,0.18)",
                      transition: "transform 140ms ease, box-shadow 160ms ease, filter 160ms ease",
                    }}
                    onClick={() => setCheckoutOpen(true)}
                    onPointerDown={onPressDown}
                    onPointerUp={onPressUp}
                    onPointerCancel={onPressUp}
                    onPointerLeave={onPressUp}
                  >
                    Оформить заказ
                  </button>
                </>
              )}
            </div>
            <CheckoutOverlay
              isOpen={checkoutOpen}
              headerOffsetTop={`calc(env(safe-area-inset-top, 0px) + ${HEADER_H - 16}px)`}
              bottomPadding={contentBottomPadding}
              backgroundColor={BRAND_BG}
              cardStyle={card}
              ghostButtonStyle={btnGhost}
              primaryButtonStyle={btnPrimary}
              tabButtonStyle={btnTab}
              inputStyle={inputStyle}
              iosSwitchWrap={iosSwitchWrap}
              iosSwitchKnob={iosSwitchKnob}
              brandAccent={BRAND_ACCENT}
              deliveryType={deliveryType}
              pickupPoints={PICKUP_POINTS.map((point) => {
                const setting = pickupSettings.find(
                  (p) => p.title === point.title || p.address === point.address
                );
                return {
                  ...point,
                  address: setting?.address || point.address,
                  worktime_text: setting?.worktime_text || null,
                };
              })}
              pickupPointId={pickupPointId}
              isPrivateHouse={isPrivateHouse}
              orderFullName={orderFullName}
              orderPhone={orderPhone}
              orderAddress={orderAddress}
              orderEntrance={orderEntrance}
              orderFloor={orderFloor}
              orderApartment={orderApartment}
              orderIntercom={orderIntercom}
              deliveryDate={deliveryDate}
              deliverySlot={deliverySlot}
              paymentMethod={paymentMethod}
              promoCode={promoCode}
              orderComment={orderComment}
              totalLabel={formatPriceRub(total)}
              availableDates={getAvailableDeliveryDates()}
              availableTimeSlots={getAvailableTimeSlots()}
              onBack={() => setCheckoutOpen(false)}
              onChangeDeliveryType={(value) => {
                setDeliveryType(value);
                setDeliveryDate("");
                setDeliverySlot("");
              }}
              onChangePickupPointId={(value) => setPickupPointId(value as (typeof PICKUP_POINTS)[number]["id"])}
              onTogglePrivateHouse={() => setIsPrivateHouse(!isPrivateHouse)}
              onChangeFullName={setOrderFullName}
              onChangePhone={setOrderPhone}
              onChangeAddress={setOrderAddress}
              onChangeEntrance={setOrderEntrance}
              onChangeFloor={setOrderFloor}
              onChangeApartment={setOrderApartment}
              onChangeIntercom={setOrderIntercom}
              onChangeDeliveryDate={setDeliveryDate}
              onChangeDeliverySlot={setDeliverySlot}
              onChangePaymentMethod={setPaymentMethod}
              onChangePromoCode={setPromoCode}
              onChangeOrderComment={setOrderComment}
              onSubmit={submitOrder}
            />
          </div>
        )}

        {view === "profile" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <ProfileMainScreen
              cardStyle={card}
              avatarSrc={avatarSrc}
              profileData={profileData}
              tgUser={tgUser}
              tgUserId={tgUserId}
              tgDisplayName={tgDisplayName}
              isAdmin={isAdmin}
              onOpenHistory={() => openProfileScreen("history")}
              onOpenData={() => openProfileScreen("data")}
              onOpenSupport={openSupport}
              onOpenAdmin={() => {
                setSelectedOrderId(null);
                setAdminError(null);
                setOrders([]);
                setAdminSection("orders");
                setView("admin");
                setProfileScreen("menu");
                adminLoad();
                loadWeeklyDeliverySchedule();
              }}
            />

            {activeProfileOverlayScreen && (
              <ProfileOverlay
                isVisible={isProfileOverlayVisible || Boolean(closingProfileScreen)}
                activeScreen={activeProfileOverlayScreen}
                headerOffsetTop={`calc(env(safe-area-inset-top, 0px) + ${HEADER_H - 16}px)`}
                bottomPadding={contentBottomPadding}
                backgroundColor={BRAND_BG}
                cardStyle={card}
                ghostButtonStyle={btnGhost}
                inputStyle={inputStyle}
                primaryButtonStyle={btnPrimary}
                smallMutedStyle={smallMuted}
                selectedMyOrderId={selectedMyOrderId}
                selectedMyOrder={selectedMyOrder}
                profileLoading={profileLoading}
                profileError={profileError}
                myOrders={myOrders}
                profileFormFullName={profileFormFullName}
                profileFormPhone={profileFormPhone}
                profileFormAddress={profileFormAddress}
                profileSaveLoading={profileSaveLoading}
                onBack={() => {
                  if (selectedMyOrderId) {
                    setSelectedMyOrderId(null);
                  } else {
                    closeProfileScreen();
                  }
                }}
                onChangeFullName={setProfileFormFullName}
                onChangePhone={setProfileFormPhone}
                onChangeAddress={setProfileFormAddress}
                onSaveProfile={saveProfileData}
                onSelectOrder={setSelectedMyOrderId}
                formatDateTime={formatDateTime}
                formatPriceRub={formatPriceRub}
                renderStatusBadge={(status) => <StatusBadge status={status} />}
              />
            )}
          </div>
        )}

        {view === "admin" && (
          <div style={card}>
            <AdminHeader
              selectedOrderId={selectedOrderId}
              adminSection={adminSection}
              ghostButtonStyle={btnGhost}
              onBack={() => {
                if (selectedOrderId) {
                  setSelectedOrderId(null);
                  setChatOpen(false);
                  setChatMessages([]);
                  setChatError(null);
                  setChatText("");
                  setChatUnreadCount(0);
                  setChatClosedUnread(0);
                  setChatAtBottom(true);
                  lastChatMessageIdRef.current = null;
                } else if (adminSection === "slots") {
                  setAdminSection("orders");
                } else {
                  setView("profile");
                  setProfileScreen("menu");
                }
              }}
              onToggleSection={() => {
                setAdminSection(adminSection === "orders" ? "slots" : "orders");
                loadWeeklyDeliverySchedule();
              }}
              onRefresh={() => {
                adminLoad();
                loadWeeklyDeliverySchedule();
              }}
            />

            {!selectedOrderId && adminSection === "slots" && (
              <AdminSlotsPanel
                iosSwitchWrap={iosSwitchWrap}
                iosSwitchKnob={iosSwitchKnob}
                inputStyle={inputStyle}
                primaryButtonStyle={btnPrimary}
                ghostButtonStyle={btnGhost}
                tabButtonStyle={btnTab}
                brandAccent={BRAND_ACCENT}
                weekdayRules={weekdayRules}
                weekdayIntervals={weekdayIntervals}
                overrides={dateOverrides}
                overrideIntervals={overrideIntervals}
                pickupSettings={pickupSettings}
                adminSlotsLoading={deliveryScheduleLoading}
                adminSlotsError={deliveryScheduleError}
                selectedOverrideDate={selectedOverrideDate}
                newIntervalDay={newIntervalDay}
                newIntervalFrom={newIntervalFrom}
                newIntervalTo={newIntervalTo}
                newOverrideFrom={newOverrideFrom}
                newOverrideTo={newOverrideTo}
                onChangeSelectedOverrideDate={setSelectedOverrideDate}
                onChangeNewIntervalDay={setNewIntervalDay}
                onChangeNewIntervalFrom={setNewIntervalFrom}
                onChangeNewIntervalTo={setNewIntervalTo}
                onChangeNewOverrideFrom={setNewOverrideFrom}
                onChangeNewOverrideTo={setNewOverrideTo}
                onToggleWeekday={toggleWeekdayRule}
                onToggleWeekdayInterval={toggleWeekdayInterval}
                onAddWeekdayInterval={addWeekdayInterval}
                onDeleteWeekdayInterval={deleteWeekdayInterval}
                onToggleOverrideDayDisabled={toggleOverrideDayDisabled}
                onAddOverrideInterval={addOverrideInterval}
                onToggleOverrideInterval={toggleOverrideInterval}
                onDeleteOverrideInterval={deleteOverrideInterval}
                pickupSavingId={pickupSavingId}
                onUpdatePickupWorktime={updatePickupWorktime}
                renderSkeleton={(key) => <SkeletonBlock key={key} height={64} radius={14} />}
              />
            )}

            {adminLoading ? (
              <>
                {!selectedOrderId && adminSection === "orders" && (
                  <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 10 }}>
                    <SkeletonBlock height={116} radius={16} />
                    <SkeletonBlock height={116} radius={16} />
                    <SkeletonBlock height={116} radius={16} />
                  </div>
                )}
                {selectedOrderId && (
                  <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 10 }}>
                    <SkeletonBlock height={140} radius={16} />
                    <SkeletonBlock height={180} radius={16} />
                    <SkeletonBlock height={220} radius={16} />
                  </div>
                )}
              </>
            ) : adminError ? (
              <div style={{ marginTop: 12, color: BRAND_ACCENT, whiteSpace: "pre-wrap" }}>
                Ошибка: {adminError}
              </div>
            ) : (
              <>
                {!selectedOrderId && adminSection === "orders" && (
                  <AdminOrdersList
                    orders={orders}
                    smallMutedStyle={smallMuted}
                    formatDateTime={formatDateTime}
                    formatPriceRub={formatPriceRub}
                    orderPreviewItems={orderPreviewItems}
                    renderStatusBadge={(status) => <StatusBadge status={status} />}
                    onBeforeOpenOrder={() => {
                      setChatOpen(false);
                      setChatMessages([]);
                      setChatError(null);
                      setChatText("");
                      setChatUnreadCount(0);
                      setChatClosedUnread(0);
                      setChatAtBottom(true);
                      lastChatMessageIdRef.current = null;
                    }}
                    onSelectOrder={setSelectedOrderId}
                  />
                )}

                {selectedOrderId && (
                  <AdminOrderDetails
                    order={selectedOrder}
                    smallMutedStyle={smallMuted}
                    brandAccent={BRAND_ACCENT}
                    formatDateTime={formatDateTime}
                    formatPriceRub={formatPriceRub}
                    orderItemsList={orderItemsList}
                    statusActionBtn={statusActionBtn}
                    onCopyPhone={copyPhone}
                    onSetStatus={setOrderStatus}
                    renderCopyIcon={() => <IconCopy ink={BRAND_INK} />}
                    chatBlock={
                      <OrderChatBlock
                        title="Чат по заказу"
                        chatOpen={chatOpen}
                        chatClosedUnread={chatClosedUnread}
                        chatLoading={chatLoading}
                        chatError={chatError}
                        chatMessages={chatMessages}
                        chatAtBottom={chatAtBottom}
                        chatUnreadCount={chatUnreadCount}
                        chatText={chatText}
                        chatSending={chatSending}
                        inputStyle={inputStyle}
                        primaryButtonStyle={btnPrimary}
                        ghostButtonStyle={btnGhost}
                        brandAccent={BRAND_ACCENT}
                        brandInk={BRAND_INK}
                        chatListRef={chatListRef}
                        onToggleOpen={() => {
                          if (!chatOpen) {
                            setChatMessages([]);
                            setChatError(null);
                            setChatUnreadCount(0);
                            setChatClosedUnread(0);
                            setChatAtBottom(true);
                            lastChatMessageIdRef.current = null;
                            if (!selectedOrder) return;
                            loadOrderChat(selectedOrder.id);
                          } else {
                            setChatClosedUnread(0);
                          }
                          setChatOpen(!chatOpen);
                        }}
                        onRefresh={() => {
                          if (!selectedOrder) return;
                          loadOrderChat(selectedOrder.id);
                        }}
                        onScroll={handleChatScroll}
                        onScrollToBottom={scrollChatToBottom}
                        onChangeText={setChatText}
                        onSend={() => {
                          if (!selectedOrder) return;
                          sendOrderChat(selectedOrder.id);
                        }}
                        formatDateTime={formatDateTime}
                        renderSkeleton={(key, width) => (
                          <SkeletonBlock
                            key={key}
                            height={54}
                            radius={14}
                            style={width ? { width } : {}}
                          />
                        )}
                      />
                    }
                  />
                )}
              </>
            )}
          </div>
        )}
      </div>
      {/* Bottom pill */}
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
            <IconCatalog active={viewIndex === 0} ink={BRAND_INK} accent={BRAND_INK} />
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
              <IconCart active={viewIndex === 1} ink={BRAND_INK} accent={BRAND_INK} />
              {cart.length > 0 && (
                <div
                  style={{
                    position: "absolute",
                    top: -12,
                    right: -10,
                    minWidth: 18,
                    height: 18,
                    padding: cart.length > 9 ? "0 6px" : 0,
                    borderRadius: cart.length > 9 ? 999 : "50%",
                    background: BRAND_ACCENT,
                    color: "#fff",
                    fontSize: 11,
                    fontWeight: 900,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: "0 10px 18px rgba(212,51,20,0.25)",
                    zIndex: 2,
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
              setClosingProfileScreen(null);
            }}
            aria-label="Профиль"
            onPointerDown={onPressDown}
            onPointerUp={onPressUp}
            onPointerCancel={onPressUp}
            onPointerLeave={onPressUp}
          >
            <IconProfile active={viewIndex === 2} ink={BRAND_INK} accent={BRAND_INK} />
          </button>
        </div>
      </div>
    </div>
  );
}

