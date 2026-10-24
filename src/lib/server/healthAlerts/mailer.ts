import type { MailSender } from "./subscribe";

/** Resend's free HTTPS API. No SDK. Failure is a boolean so the cron can retry next run. */
export const sendResend: MailSender = async (input) => {
  const key = process.env.RESEND_API_KEY?.trim();
  const from = process.env.ALERT_FROM_EMAIL?.trim();
  if (!key || !from) return false;
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [input.to],
        subject: input.subject,
        text: input.text,
        html: input.html,
      }),
      cache: "no-store",
    });
    if (!response.ok) {
      console.error("Resend rejected an alert email", response.status);
      return false;
    }
    return true;
  } catch (error) {
    console.error("Resend request failed", error instanceof Error ? error.message : "unknown");
    return false;
  }
};
