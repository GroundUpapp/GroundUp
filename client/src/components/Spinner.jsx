export default function Spinner({ className = '' }) {
  return (
    <div
      role="status"
      aria-label="Loading"
      className={`h-6 w-6 animate-spin rounded-full border-2 border-amber-900/40 border-t-amber-400 ${className}`}
    />
  );
}
