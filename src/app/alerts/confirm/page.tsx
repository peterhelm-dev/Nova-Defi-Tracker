import type { Metadata } from "next";
import { HealthAlertLinkForm } from "@/components/HealthAlertLinkForm";
import { InfoPage } from "@/components/InfoPage";
import { getHealthAlertStore } from "@/lib/server/healthAlerts";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Confirm health alert",
  robots: { index: false, follow: false },
};

export default async function ConfirmHealthAlertPage(props: {
  searchParams: Promise<{ token?: string | string[] }>;
}) {
  const search = await props.searchParams;
  const token = typeof search.token === "string" ? search.token : "";
  const store = getHealthAlertStore();

  return (
    <InfoPage title="Health factor alert">
      {!store ? <p>Email alerts are coming soon.</p> : null}
      {store && (token.length < 20 || token.length > 200) ? (
        <p>This confirmation link is not valid. It may have already been used. You can request a new one from the portfolio page.</p>
      ) : null}
      {store && token.length >= 20 && token.length <= 200 ? <HealthAlertLinkForm token={token} action="confirm" /> : null}
    </InfoPage>
  );
}
