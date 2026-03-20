export type WeekdayRule = {
  id: string;
  day_of_week: number;
  is_enabled: boolean;
};

export type WeekdayInterval = {
  id: string;
  weekday_rule_id: string;
  time_from: string;
  time_to: string;
  is_enabled: boolean;
  sort_order: number;
};

export type DateOverride = {
  id: string;
  date: string;
  is_disabled: boolean | null;
};

export type OverrideInterval = {
  id: string;
  override_id: string;
  time_from: string;
  time_to: string;
  is_enabled: boolean;
};

export type DeliveryScheduleSlot = {
  date: string;
  label: string;
  time_from: string;
  time_to: string;
  source: "weekly" | "override";
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

export function makeIntervalLabel(timeFrom: string, timeTo: string) {
  return `${timeFrom}–${timeTo}`;
}

export function getDateCutoff(dateStr: string) {
  const cutoff = parseLocalDate(dateStr);
  cutoff.setDate(cutoff.getDate() - 1);
  cutoff.setHours(21, 0, 0, 0);
  return cutoff;
}

export function isDateVisibleByCutoff(dateStr: string, now = new Date()) {
  return now < getDateCutoff(dateStr);
}

export function isDateWithinWindow(dateStr: string, now = new Date(), daysAhead = 6) {
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + daysAhead);

  const d = parseLocalDate(dateStr);
  return d >= start && d <= end;
}

function sortSlots(a: DeliveryScheduleSlot, b: DeliveryScheduleSlot) {
  if (a.date !== b.date) return a.date.localeCompare(b.date);
  if (a.time_from !== b.time_from) return a.time_from.localeCompare(b.time_from);
  return a.time_to.localeCompare(b.time_to);
}

export function buildWeeklyScheduleSlots(params: {
  weekdayRules: WeekdayRule[];
  weekdayIntervals: WeekdayInterval[];
  overrides: DateOverride[];
  overrideIntervals: OverrideInterval[];
  now?: Date;
  daysAhead?: number;
}) {
  const {
    weekdayRules,
    weekdayIntervals,
    overrides,
    overrideIntervals,
    now = new Date(),
    daysAhead = 6,
  } = params;

  const ruleByDay = new Map<number, WeekdayRule>();
  weekdayRules.forEach((rule) => {
    ruleByDay.set(rule.day_of_week, rule);
  });

  const intervalsByRuleId = new Map<string, WeekdayInterval[]>();
  weekdayIntervals.forEach((interval) => {
    const list = intervalsByRuleId.get(interval.weekday_rule_id) || [];
    list.push(interval);
    intervalsByRuleId.set(interval.weekday_rule_id, list);
  });

  intervalsByRuleId.forEach((list) => {
    list.sort((a, b) => {
      if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
      if (a.time_from !== b.time_from) return a.time_from.localeCompare(b.time_from);
      return a.time_to.localeCompare(b.time_to);
    });
  });

  const overrideByDate = new Map<string, DateOverride>();
  overrides.forEach((override) => {
    overrideByDate.set(override.date, override);
  });

  const overrideIntervalsByOverrideId = new Map<string, OverrideInterval[]>();
  overrideIntervals.forEach((interval) => {
    const list = overrideIntervalsByOverrideId.get(interval.override_id) || [];
    list.push(interval);
    overrideIntervalsByOverrideId.set(interval.override_id, list);
  });

  overrideIntervalsByOverrideId.forEach((list) => {
    list.sort((a, b) => {
      if (a.time_from !== b.time_from) return a.time_from.localeCompare(b.time_from);
      return a.time_to.localeCompare(b.time_to);
    });
  });

  const result: DeliveryScheduleSlot[] = [];

  for (let i = 0; i <= daysAhead; i++) {
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i, 12, 0, 0, 0);
    const dateStr = formatLocalDate(date);

    if (!isDateWithinWindow(dateStr, now, daysAhead)) continue;
    if (!isDateVisibleByCutoff(dateStr, now)) continue;

    const override = overrideByDate.get(dateStr);
    if (override?.is_disabled) continue;

    if (override) {
      const overrideList = (overrideIntervalsByOverrideId.get(override.id) || []).filter(
        (interval) => interval.is_enabled
      );

      overrideList.forEach((interval) => {
        result.push({
          date: dateStr,
          label: makeIntervalLabel(interval.time_from, interval.time_to),
          time_from: interval.time_from,
          time_to: interval.time_to,
          source: "override",
        });
      });

      continue;
    }

    const weekday = date.getDay();
    const rule = ruleByDay.get(weekday);
    if (!rule || !rule.is_enabled) continue;

    const baseIntervals = (intervalsByRuleId.get(rule.id) || []).filter((interval) => interval.is_enabled);

    baseIntervals.forEach((interval) => {
      result.push({
        date: dateStr,
        label: makeIntervalLabel(interval.time_from, interval.time_to),
        time_from: interval.time_from,
        time_to: interval.time_to,
        source: "weekly",
      });
    });
  }

  return result.sort(sortSlots);
}

export function getAvailableDeliveryDates(scheduleSlots: DeliveryScheduleSlot[]) {
  const unique = new Map<string, string>();

  scheduleSlots.forEach((slot) => {
    if (!unique.has(slot.date)) {
      const d = parseLocalDate(slot.date);
      unique.set(
        slot.date,
        d.toLocaleDateString("ru-RU", {
          day: "2-digit",
          month: "2-digit",
          weekday: "short",
        })
      );
    }
  });

  return Array.from(unique.entries()).map(([value, label]) => ({ value, label }));
}

export function getAvailableTimeSlots(scheduleSlots: DeliveryScheduleSlot[], selectedDate: string) {
  return scheduleSlots.filter((slot) => slot.date === selectedDate).map((slot) => slot.label);
}

export function getEffectivePreview(scheduleSlots: DeliveryScheduleSlot[]) {
  const byDate = new Map<string, string[]>();

  scheduleSlots.forEach((slot) => {
    const list = byDate.get(slot.date) || [];
    list.push(slot.label);
    byDate.set(slot.date, list);
  });

  return Array.from(byDate.entries()).map(([date, labels]) => ({
    date,
    labels,
  }));
}
