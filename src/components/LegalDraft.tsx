/**
 * Shared draft language for the privacy and terms pages. These pages are
 * pending legal review; the copy names the operator and the contact variable
 * without inventing a mailbox or a jurisdiction.
 */

export function PendingLegalReview() {
  return (
    <p className="rounded-xl border border-warning/40 bg-warning/10 px-4 py-3 text-warning">
      Pending legal review. This page is a working draft for the operator to
      finish with counsel. A lawyer has not approved it, and it is not legal
      advice.
    </p>
  );
}

export function OperatorContact() {
  const email = process.env.NEXT_PUBLIC_SUPPORT_EMAIL?.trim();
  return (
    <p>
      Novafolio is operated by Peter H. Contact the operator at{" "}
      {email ? (
        <a href={`mailto:${email}`}>{email}</a>
      ) : (
        <>
          the mailbox in <code>NEXT_PUBLIC_SUPPORT_EMAIL</code>. That variable
          is not set on this deployment, so no address is published here.
        </>
      )}
    </p>
  );
}
