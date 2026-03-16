import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(request: Request) {
  try {
    const update = await request.json();

    const message = update?.message;
    if (!message) {
      return NextResponse.json({ ok: true });
    }

    const telegramUserId = Number(message?.from?.id || 0);
    const text = String(message?.text || "").trim();
    const incomingMessageId = Number(message?.message_id || 0);
    const replyToBotMessageId = Number(message?.reply_to_message?.message_id || 0);

    if (!telegramUserId || !text) {
      return NextResponse.json({ ok: true });
    }

    let orderId: string | null = null;

    if (replyToBotMessageId) {
      const { data: repliedMessage } = await supabaseAdmin
        .from("order_chat_messages")
        .select("order_id")
        .eq("bot_message_id", replyToBotMessageId)
        .maybeSingle();

      orderId = repliedMessage?.order_id || null;
    }

    if (!orderId) {
      const { data: lastOrder } = await supabaseAdmin
        .from("orders")
        .select("id")
        .eq("user_telegram_id", telegramUserId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      orderId = lastOrder?.id || null;
    }

    if (!orderId) {
      return NextResponse.json({ ok: true });
    }

    await supabaseAdmin.from("order_chat_messages").insert({
      order_id: orderId,
      telegram_user_id: telegramUserId,
      direction: "incoming",
      text,
      bot_message_id: incomingMessageId,
      reply_to_bot_message_id: replyToBotMessageId || null,
      sender_role: "customer",
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: true });
  }
}