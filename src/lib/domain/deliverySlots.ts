export type DeliverySlotType = "delivery" | "pickup";

export type DeliverySlotRowLike = {
  id: string;
  slot_date: string;
  slot_label: string;
  delivery_type: DeliverySlotType;
  is_active: boolean;
  sort_order: number;
};

export function formatLocalDate(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function parseLocalDate(dateStr: string) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1, 12, 0, 0, 0);
}

export function getDefaultGeneratedSlots(
  type: DeliverySlotType,
  deliveryIntervals: readonly string[],
  pickupIntervals: readonly string[]
) {
  const result: DeliverySlotRowLike[] = [];
  const now = new Date();
  const labels = type === "delivery" ? deliveryIntervals : pickupIntervals;

  for (let i = 0; i < 35; i++) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i, 12, 0, 0, 0);
    const day = d.getDay();
    if (day !== 3 && day !== 5) continue;

    const slotDate = formatLocalDate(d);
    labels.forEach((label, idx) => {
      result.push({
        id: `generated-${type}-${slotDate}-${label}`,
        slot_date: slotDate,
        slot_label: label,
        delivery_type: type,
        is_active: true,
        sort_order: idx,
      });
    });
  }

  return result;
}

export function getEffectiveSlots(
  type: DeliverySlotType,
  deliverySlots: DeliverySlotRowLike[],
  deliveryIntervals: readonly string[],
  pickupIntervals: readonly string[]
) {
  const defaults = getDefaultGeneratedSlots(type, deliveryIntervals, pickupIntervals);
  const overrides = deliverySlots.filter((slot) => slot.delivery_type === type);
  const overrideDates = new Set(overrides.map((slot) => slot.slot_date));

  const merged = [
    ...defaults.filter((slot) => !overrideDates.has(slot.slot_date)),
    ...overrides.filter((slot) => slot.is_active),
  ];

  const now = new Date();
  const byDate = new Map<string, DeliverySlotRowLike[]>();

  merged.forEach((slot) => {
    const cutoff = parseLocalDate(slot.slot_date);
    cutoff.setDate(cutoff.getDate() - 1);
    cutoff.setHours(21, 0, 0, 0);

    if (now >= cutoff) return;

    const list = byDate.get(slot.slot_date) || [];
    list.push(slot);
    byDate.set(slot.slot_date, list);
  });

  const nearestTwoDates = Array.from(byDate.keys()).sort().slice(0, 2);

  return nearestTwoDates
    .flatMap((date) => (byDate.get(date) || []).sort((a, b) => a.sort_order - b.sort_order))
    .sort((a, b) => {
      if (a.slot_date !== b.slot_date) return a.slot_date.localeCompare(b.slot_date);
      return a.sort_order - b.sort_order;
    });
}

export function getAvailableDeliveryDatesForType(
  type: DeliverySlotType,
  deliverySlots: DeliverySlotRowLike[],
  deliveryIntervals: readonly string[],
  pickupIntervals: readonly string[]
) {
  const unique = new Map<string, string>();

  getEffectiveSlots(type, deliverySlots, deliveryIntervals, pickupIntervals).forEach((slot) => {
    if (!unique.has(slot.slot_date)) {
      const d = parseLocalDate(slot.slot_date);
      const label = d.toLocaleDateString("ru-RU", {
        day: "2-digit",
        month: "2-digit",
        weekday: "short",
      });
      unique.set(slot.slot_date, label);
    }
  });

  return Array.from(unique.entries()).map(([value, label]) => ({ value, label }));
}

export function getAvailableTimeSlotsForType(
  type: DeliverySlotType,
  selectedDate: string,
  deliverySlots: DeliverySlotRowLike[],
  deliveryIntervals: readonly string[],
  pickupIntervals: readonly string[]
) {
  return getEffectiveSlots(type, deliverySlots, deliveryIntervals, pickupIntervals)
    .filter((slot) => slot.slot_date === selectedDate)
    .map((slot) => slot.slot_label);
}
