import type { Metadata } from "next";
import { HealthAlertLinkForm } from "@/components/HealthAlertLinkForm";
import { InfoPage } from "@/components/InfoPage";
import { getHealthAlertStore } from "@/lib/server/healthAlerts";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Unsubscribe",
  robots: { index: false, follow: false },
};

export default async function UnsubscribeHealthAlertPage(props: {
  searchParams: Promise<{ token?: string | string[] }>;
}) {
  const search = await props.searchParams;
  const token = typeof search.token === "string" ? search.token : "";
  const store = getHealthAlertStore();

  return (
    <InfoPage title="Unsubscribe">
      {!store ? <p>Email alerts are coming soon.</p> : null}
      {store && (token.length < 20 || token.length > 200) ? (
        <p>This unsubscribe link is not valid. If you still get mail, use the link in the latest message.</p>
      ) : null}
      {store && token.length >= 20 && token.length <= 200 ? (
        <HealthAlertLinkForm token={token} action="unsubscribe" />
      ) : null}
    </InfoPage>
  );
}
