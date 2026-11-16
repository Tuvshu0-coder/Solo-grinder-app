"use client";
import { useFormStatus } from "react-dom";

/** Submit button that disables itself and shows `pending` text while the form action runs. */
export function PendingButton({ children, pending, className = "btn" }: { children: React.ReactNode; pending: string; className?: string }) {
  const { pending: busy } = useFormStatus();
  return (
    <button className={className} disabled={busy}>
      {busy ? pending : children}
    </button>
  );
}
