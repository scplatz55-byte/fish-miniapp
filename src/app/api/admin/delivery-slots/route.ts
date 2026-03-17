import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import {
  getTelegramUserFromInitData,
  isTelegramAdmin,
  verifyTelegramInitData,
} from "@/lib/telegramServer";

type ListPayload = {
  initData: string;
  action: { type: "list" };
};

type TogglePayload = {
  initData: string;
  action: { type: "toggle"; id: string; is_active: boolean };
};

type CreatePayload = {
  initData: string;
  action: {
    type: "create";
    slot_date: string;
    slot_label: string;
    delivery_type: "delivery" | "pickup";
    sort_order?: number;
  };
};

type DeletePayload = {
  initData: string;
  action: { type: "delete"; id: string };
};

type Payload = ListPayload | TogglePayload | CreatePayload | DeletePayload;

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Payload;
    const initData = String(body?.initData || "");

    if (!initData) {
      return NextResponse.json({ ok: false, error: "Missing initData" }, { status: 400 });
    }

    const botToken = process.env.TELEGRAM_BOT_TOKEN!;
    if (!botToken) {
      return NextResponse.json({ ok: false, error: "Missing TELEGRAM_BOT_TOKEN" }, { status: 500 });
    }

    const verified = verifyTelegramInitData(initData, botToken);
    if (!verified) {
      return NextResponse.json({ ok: false, error: "Invalid initData" }, { status: 403 });
    }

    const user = getTelegramUserFromInitData(initData);
    const adminId = user?.id ?? null;

    if (!isTelegramAdmin(adminId)) {
      return NextResponse.json({ ok: false, error: "Нет доступа" }, { status: 403 });
    }

    const action = body.action;

    if (action.type === "list") {
      const { data, error } = await supabaseAdmin
        .from("delivery_slots")
        .select("id,slot_date,slot_label,delivery_type,is_active,sort_order")
        .order("slot_date", { ascending: true })
        .order("sort_order", { ascending: true });

      if (error) {
        return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
      }

      return NextResponse.json({ ok: true, slots: data || [] });
    }

    if (action.type === "toggle") {
      const { error } = await supabaseAdmin
        .from("delivery_slots")
        .update({ is_active: action.is_active })
        .eq("id", action.id);

      if (error) {
        return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
      }

      return NextResponse.json({ ok: true });
    }

    if (action.type === "create") {
      const { error } = await supabaseAdmin.from("delivery_slots").insert({
        slot_date: action.slot_date,
        slot_label: action.slot_label,
        delivery_type: action.delivery_type,
        is_active: true,
        sort_order: action.sort_order ?? 0,
      });

      if (error) {
        return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
      }

      return NextResponse.json({ ok: true });
    }

    if (action.type === "delete") {
      const { error } = await supabaseAdmin
        .from("delivery_slots")
        .delete()
        .eq("id", action.id);

      if (error) {
        return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
      }

      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ ok: false, error: "Unknown action" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error?.message || "Unknown error" },
      { status: 500 }
    );
  }
}