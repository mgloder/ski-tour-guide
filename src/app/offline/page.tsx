export const metadata = { title: "Offline — The Ski Handbook" };

export default function OfflinePage() {
  return (
    <div style={{ padding: "3rem 1.5rem", maxWidth: "32rem" }}>
      <p style={{ fontSize: "0.65rem", textTransform: "uppercase", letterSpacing: "0.08em", opacity: 0.4, marginBottom: "0.5rem" }}>
        No connection
      </p>
      <p style={{ fontWeight: 900, fontSize: "2rem", lineHeight: 1.1, marginBottom: "1rem" }}>
        You're offline
      </p>
      <p style={{ opacity: 0.6, marginBottom: "1.5rem" }}>
        The Ski Handbook needs a connection for live data. Previously loaded pages and piste maps are still available — navigate back or reconnect to continue.
      </p>
      <a
        href="/"
        style={{
          border: "2px solid currentColor",
          display: "inline-block",
          padding: "0.5rem 1.25rem",
          fontWeight: 900,
          fontSize: "0.75rem",
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          textDecoration: "none",
          color: "inherit",
        }}
      >
        ← Home
      </a>
    </div>
  );
}
