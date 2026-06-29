// Vercel Cron Job — triggers Supabase push notifications every hour
export default async function handler(_req, res) {
  try {
    const resp = await fetch(
      "https://kwmfywfardkorybizdex.supabase.co/functions/v1/send-bill-reminders",
      { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" }
    );
    const data = await resp.json();
    return res.status(200).json({ ok: true, sent: data.sent });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
