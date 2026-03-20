import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type WeekdayRuleRow = {
  id: string;
  day_of_week: number;
  is_enabled: boolean;
};

type WeekdayIntervalRow = {
  id: string;
  weekday_rule_id: string;
  time_from: string;
  time_to: string;
  is_enabled: boolean;
  sort_order: number;
};

type DateOverrideRow = {
  id: string;
  date: string;
  is_disabled: boolean | null;
};

type OverrideIntervalRow = {
  id: string;
  override_id: string;
  time_from: string;
  time_to: string;
  is_enabled: boolean;
};

type PickupSettingRow = {
  id: string;
  title: string;
  address: string;
  worktime_text: string | null;
  is_active: boolean | null;
};

type Action =
  | { type: "list" }
  | { type: "toggleWeekday"; ruleId: string; is_enabled: boolean }
  | { type: "createWeekdayInterval"; weekday_rule_id: string; time_from: string; time_to: string }
  | { type: "toggleWeekdayInterval"; intervalId: string; is_enabled: boolean }
  | { type: "deleteWeekdayInterval"; intervalId: string }
  | { type: "toggleOverrideDayDisabled"; date: string }
  | { type: "createOverrideInterval"; date: string; time_from: string; time_to: string }
  | { type: "toggleOverrideInterval"; intervalId: string; is_enabled: boolean }
  | { type: "deleteOverrideInterval"; intervalId: string }
  | { type: "updatePickupWorktime"; pickupId: string; worktime_text: string };

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRole, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function ensureWeekdaySeed() {
  const { data, error } = await supabaseAdmin
    .from("delivery_weekday_rules")
    .select("id, day_of_week, is_enabled")
    .order("day_of_week", { ascending: true });

  if (error) throw error;

  const existing = (data || []) as WeekdayRuleRow[];
  if (existing.length >= 7) return existing;

  const present = new Set(existing.map((row) => row.day_of_week));
  const missing = Array.from({ length: 7 }, (_, day) => day)
    .filter((day) => !present.has(day))
    .map((day) => ({ day_of_week: day, is_enabled: day === 3 || day === 5 }));

  if (missing.length > 0) {
    const { error: insertError } = await supabaseAdmin
      .from("delivery_weekday_rules")
      .insert(missing);

    if (insertError) throw insertError;
  }

  const { data: fresh, error: freshError } = await supabaseAdmin
    .from("delivery_weekday_rules")
    .select("id, day_of_week, is_enabled")
    .order("day_of_week", { ascending: true });

  if (freshError) throw freshError;
  return (fresh || []) as WeekdayRuleRow[];
}

async function ensureDefaultIntervals(rules: WeekdayRuleRow[]) {
  const { data, error } = await supabaseAdmin
    .from("delivery_weekday_intervals")
    .select("id, weekday_rule_id")
    .in("weekday_rule_id", rules.map((row) => row.id));

  if (error) throw error;

  const existing = data || [];
  if (existing.length > 0) return;

  const targetRules = rules.filter((row) => row.day_of_week === 3 || row.day_of_week === 5);
  const defaults = [
    { time_from: "10:00", time_to: "13:00", sort_order: 0 },
    { time_from: "13:00", time_to: "16:00", sort_order: 1 },
    { time_from: "16:00", time_to: "19:00", sort_order: 2 },
  ];

  const rows = targetRules.flatMap((rule) =>
    defaults.map((slot) => ({
      weekday_rule_id: rule.id,
      time_from: slot.time_from,
      time_to: slot.time_to,
      is_enabled: true,
      sort_order: slot.sort_order,
    }))
  );

  if (rows.length === 0) return;

  const { error: insertError } = await supabaseAdmin
    .from("delivery_weekday_intervals")
    .insert(rows);

  if (insertError) throw insertError;
}

async function ensurePickupSeed() {
  const { data, error } = await supabaseAdmin
    .from("pickup_settings")
    .select("id")
    .limit(1);

  if (error) throw error;
  if ((data || []).length > 0) return;

  const rows = [
    {
      title: "Василеостровский рынок",
      address: "Санкт-Петербург, Большой просп. Васильевского острова, 16/14Б этаж 1",
      worktime_text: "Режим работы магазина: 9:00–21:00 ежедневно.",
      is_active: true,
    },
    {
      title: "Московский рынок",
      address: "Санкт-Петербург, ул. Решетникова, 12 этаж 1",
      worktime_text: "Режим работы магазина: 9:00–21:00 ежедневно.",
      is_active: true,
    },
    {
      title: "Стрельна",
      address: "посёлок Стрельна, ул. Нижняя Колония, 24",
      worktime_text: "Режим работы магазина: 10:00–21:00 ежедневно.",
      is_active: true,
    },
  ];

  const { error: insertError } = await supabaseAdmin.from("pickup_settings").insert(rows);
  if (insertError) throw insertError;
}

async function ensureSeed() {
  const weekdayRules = await ensureWeekdaySeed();
  await ensureDefaultIntervals(weekdayRules);
  await ensurePickupSeed();
}

async function readFullSchedule() {
  const [weekdayRulesRes, intervalsRes, overridesRes, overrideIntervalsRes, pickupRes] =
    await Promise.all([
      supabaseAdmin
        .from("delivery_weekday_rules")
        .select("id, day_of_week, is_enabled")
        .order("day_of_week", { ascending: true }),
      supabaseAdmin
        .from("delivery_weekday_intervals")
        .select("id, weekday_rule_id, time_from, time_to, is_enabled, sort_order")
        .order("sort_order", { ascending: true })
        .order("time_from", { ascending: true }),
      supabaseAdmin
        .from("delivery_date_overrides")
        .select("id, date, is_disabled")
        .order("date", { ascending: true }),
      supabaseAdmin
        .from("delivery_override_intervals")
        .select("id, override_id, time_from, time_to, is_enabled")
        .order("time_from", { ascending: true }),
      supabaseAdmin
        .from("pickup_settings")
        .select("id, title, address, worktime_text, is_active")
        .order("title", { ascending: true }),
    ]);

  if (weekdayRulesRes.error) throw weekdayRulesRes.error;
  if (intervalsRes.error) throw intervalsRes.error;
  if (overridesRes.error) throw overridesRes.error;
  if (overrideIntervalsRes.error) throw overrideIntervalsRes.error;
  if (pickupRes.error) throw pickupRes.error;

  return {
    weekdayRules: (weekdayRulesRes.data || []) as WeekdayRuleRow[],
    weekdayIntervals: (intervalsRes.data || []) as WeekdayIntervalRow[],
    overrides: (overridesRes.data || []) as DateOverrideRow[],
    overrideIntervals: (overrideIntervalsRes.data || []) as OverrideIntervalRow[],
    pickupSettings: (pickupRes.data || []) as PickupSettingRow[],
  };
}

async function findOrCreateOverride(date: string) {
  const { data: existing, error: existingError } = await supabaseAdmin
    .from("delivery_date_overrides")
    .select("id, date, is_disabled")
    .eq("date", date)
    .maybeSingle();

  if (existingError) throw existingError;
  if (existing) return existing as DateOverrideRow;

  const { data: created, error: createError } = await supabaseAdmin
    .from("delivery_date_overrides")
    .insert({ date, is_disabled: false })
    .select("id, date, is_disabled")
    .single();

  if (createError) throw createError;
  return created as DateOverrideRow;
}

async function handleAction(action: Action) {
  if (action.type === "list") return;

  if (action.type === "toggleWeekday") {
    const { error } = await supabaseAdmin
      .from("delivery_weekday_rules")
      .update({ is_enabled: action.is_enabled })
      .eq("id", action.ruleId);

    if (error) throw error;
    return;
  }

  if (action.type === "createWeekdayInterval") {
    const { data: current, error: currentError } = await supabaseAdmin
      .from("delivery_weekday_intervals")
      .select("sort_order")
      .eq("weekday_rule_id", action.weekday_rule_id)
      .order("sort_order", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (currentError) throw currentError;

    const nextSortOrder = typeof current?.sort_order === "number" ? current.sort_order + 1 : 0;

    const { error } = await supabaseAdmin.from("delivery_weekday_intervals").insert({
      weekday_rule_id: action.weekday_rule_id,
      time_from: action.time_from,
      time_to: action.time_to,
      is_enabled: true,
      sort_order: nextSortOrder,
    });

    if (error) throw error;
    return;
  }

  if (action.type === "toggleWeekdayInterval") {
    const { error } = await supabaseAdmin
      .from("delivery_weekday_intervals")
      .update({ is_enabled: action.is_enabled })
      .eq("id", action.intervalId);

    if (error) throw error;
    return;
  }

  if (action.type === "deleteWeekdayInterval") {
    const { error } = await supabaseAdmin
      .from("delivery_weekday_intervals")
      .delete()
      .eq("id", action.intervalId);

    if (error) throw error;
    return;
  }

  if (action.type === "toggleOverrideDayDisabled") {
    const override = await findOrCreateOverride(action.date);

    const { error } = await supabaseAdmin
      .from("delivery_date_overrides")
      .update({ is_disabled: !Boolean(override.is_disabled) })
      .eq("id", override.id);

    if (error) throw error;
    return;
  }

  if (action.type === "createOverrideInterval") {
    const override = await findOrCreateOverride(action.date);

    const { error } = await supabaseAdmin.from("delivery_override_intervals").insert({
      override_id: override.id,
      time_from: action.time_from,
      time_to: action.time_to,
      is_enabled: true,
    });

    if (error) throw error;
    return;
  }

  if (action.type === "toggleOverrideInterval") {
    const { error } = await supabaseAdmin
      .from("delivery_override_intervals")
      .update({ is_enabled: action.is_enabled })
      .eq("id", action.intervalId);

    if (error) throw error;
    return;
  }

  if (action.type === "deleteOverrideInterval") {
    const { error } = await supabaseAdmin
      .from("delivery_override_intervals")
      .delete()
      .eq("id", action.intervalId);

    if (error) throw error;
    return;
  }

  if (action.type === "updatePickupWorktime") {
    const { error } = await supabaseAdmin
      .from("pickup_settings")
      .update({ worktime_text: action.worktime_text })
      .eq("id", action.pickupId);

    if (error) throw error;
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!supabaseUrl || !supabaseServiceRole) {
      return NextResponse.json(
        { ok: false, error: "Supabase env vars are missing" },
        { status: 500 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const action = (body?.action || { type: "list" }) as Action;

    await ensureSeed();
    await handleAction(action);
    const full = await readFullSchedule();

    return NextResponse.json({ ok: true, ...full });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error?.message || "Unknown error" },
      { status: 500 }
    );
  }
}
