export function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={`card ${className}`}>{children}</div>;
}

export function SectionHead({
  title,
  right,
}: {
  title: string;
  right?: React.ReactNode;
}) {
  return (
    <div className="section-head">
      <h2 className="text-xl tracking-tight m-0">{title}</h2>
      {right}
    </div>
  );
}

export function EmptyState({ message }: { message: string }) {
  return (
    <div className="text-muted text-sm text-center py-8 border border-dashed border-line rounded-xl">
      {message}
    </div>
  );
}
