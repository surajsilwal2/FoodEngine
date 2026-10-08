export default function StatusBadge({
  label,
  approved,
}: {
  label: string;
  approved: boolean;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
        approved ? "bg-success/10 text-success" : "bg-warning/10 text-warning"
      }`}
    >
      <span
        aria-hidden="true"
        className={`size-1.5 rounded-full ${approved ? "bg-success" : "bg-warning"}`}
      />
      {label}
    </span>
  );
}