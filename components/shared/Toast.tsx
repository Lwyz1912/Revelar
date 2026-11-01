import type { ToastMessage } from "@/hooks/use-toast";

type ToastProps = { message: ToastMessage | null };

export function Toast({ message }: ToastProps) {
  if (!message) return null;

  return (
    <div
      className={`toast toast-${message.tone}`}
      role={message.tone === "error" ? "alert" : "status"}
      aria-live={message.tone === "error" ? "assertive" : "polite"}
    >
      <span aria-hidden="true">
        {message.tone === "error" ? "!" : message.tone === "info" ? "i" : "✓"}
      </span>
      {message.text}
    </div>
  );
}
