import type { SVGProps } from "react";

export type RevelarIconName =
  | "overview"
  | "agenda"
  | "clients"
  | "works"
  | "gallery"
  | "editing"
  | "finance"
  | "products"
  | "quotes"
  | "contracts"
  | "locations"
  | "diary"
  | "whatsapp"
  | "settings"
  | "sun"
  | "moon"
  | "bell"
  | "search"
  | "back"
  | "send"
  | "plus"
  | "sparkle"
  | "more";

type RevelarIconProps = SVGProps<SVGSVGElement> & {
  name: RevelarIconName;
  title?: string;
};

function IconDrawing({ name }: { name: RevelarIconName }) {
  switch (name) {
    case "overview":
      return (
        <>
          <rect x="3.5" y="3.5" width="7" height="7" rx="2" />
          <rect x="13.5" y="3.5" width="7" height="7" rx="2" />
          <rect x="3.5" y="13.5" width="7" height="7" rx="2" />
          <path d="M17 14v6M14 17h6" />
        </>
      );
    case "agenda":
      return (
        <>
          <path d="M6.5 4.5H5A2.5 2.5 0 0 0 2.5 7v11A2.5 2.5 0 0 0 5 20.5h14a2.5 2.5 0 0 0 2.5-2.5V7A2.5 2.5 0 0 0 19 4.5h-1.5" />
          <path d="M8 3v3M16 3v3M6.5 4.5h11M2.5 9h19" />
          <path d="m8.5 15 2 2 4.5-5" />
        </>
      );
    case "clients":
      return (
        <>
          <circle cx="9" cy="8" r="3.5" />
          <path d="M2.8 20c.5-4 2.5-6 6.2-6s5.7 2 6.2 6" />
          <path d="M15.5 5.2a3.4 3.4 0 0 1 0 6.4M17 14.4c2.5.6 3.8 2.4 4.2 5.1" />
        </>
      );
    case "works":
      return (
        <>
          <path d="M8 6V4.7A1.7 1.7 0 0 1 9.7 3h4.6A1.7 1.7 0 0 1 16 4.7V6" />
          <rect x="2.5" y="6" width="19" height="14.5" rx="3" />
          <path d="M2.5 11.5c5.9 3.1 13.1 3.1 19 0M10 13h4" />
        </>
      );
    case "gallery":
      return (
        <>
          <rect x="3" y="3" width="18" height="18" rx="3" />
          <circle cx="9" cy="9" r="2" />
          <path d="m4.5 18 5-5 3.2 3.2 2.3-2.3 4.5 4.1" />
        </>
      );
    case "editing":
      return (
        <>
          <path d="M4 6h7M15 6h5M4 12h2M10 12h10M4 18h10M18 18h2" />
          <circle cx="13" cy="6" r="2" />
          <circle cx="8" cy="12" r="2" />
          <circle cx="16" cy="18" r="2" />
        </>
      );
    case "finance":
      return (
        <>
          <path d="M6 3.5h8.5A3.5 3.5 0 0 1 18 7v14l-3-2-3 2-3-2-3 2z" />
          <path d="M9 8h6M9 12h3" />
          <circle cx="17.5" cy="14.5" r="4" />
          <path d="M17.5 12.4v4.2M16.2 13.2h2a.9.9 0 0 1 0 1.8h-1.4a.9.9 0 0 0 0 1.8h2" />
        </>
      );
    case "products":
      return (
        <>
          <path d="M4.5 8.5h15l-1 12h-13z" />
          <path d="M8.5 10V7a3.5 3.5 0 0 1 7 0v3" />
          <path d="M9 15h6" />
        </>
      );
    case "quotes":
      return (
        <>
          <path d="M6 2.5h8l4 4V21.5H6z" />
          <path d="M14 2.5v4h4M9 11h6M9 15h4" />
          <path d="M4 6H3v15.5h11" />
        </>
      );
    case "contracts":
      return (
        <>
          <path d="M5 2.5h9l5 5v14H5z" />
          <path d="M14 2.5v5h5M8.5 12h7M8.5 15h5" />
          <path d="m9 19 2-1.5 1.4 1 2.6-2" />
        </>
      );
    case "locations":
      return (
        <>
          <path d="M20 10c0 5.5-8 11.5-8 11.5S4 15.5 4 10a8 8 0 1 1 16 0Z" />
          <circle cx="12" cy="10" r="2.7" />
        </>
      );
    case "diary":
      return (
        <>
          <path d="M3.5 5.5A2.5 2.5 0 0 1 6 3h5v17H6a2.5 2.5 0 0 0-2.5 2zM20.5 5.5A2.5 2.5 0 0 0 18 3h-5v17h5a2.5 2.5 0 0 1 2.5 2z" />
          <path d="M6.5 7H9M15 7h2.5" />
        </>
      );
    case "whatsapp":
      return (
        <>
          <path d="M20.5 11.5a8.5 8.5 0 0 1-12.6 7.4L3 20.5l1.6-4.7A8.5 8.5 0 1 1 20.5 11.5Z" />
          <path d="M8.1 7.8c.5 4 3.1 6.6 7.1 7.1l1.3-1.8-2.4-1.2-1.1 1c-1.3-.5-2.4-1.6-2.9-2.9l1-1.1-1.2-2.4z" />
        </>
      );
    case "settings":
      return (
        <>
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.8 1.8 0 0 0 .36 2l.08.08-2.76 2.76-.08-.08a1.8 1.8 0 0 0-2-.36 1.8 1.8 0 0 0-1.08 1.66V21H10v-.11A1.8 1.8 0 0 0 8.9 19.2a1.8 1.8 0 0 0-2 .36l-.08.08-2.76-2.76.08-.08a1.8 1.8 0 0 0 .36-2A1.8 1.8 0 0 0 2.9 13.7H2.8V9.8h.11A1.8 1.8 0 0 0 4.6 8.7a1.8 1.8 0 0 0-.36-2l-.08-.08 2.76-2.76.08.08a1.8 1.8 0 0 0 2 .36A1.8 1.8 0 0 0 10.08 2.7V2.6H14v.11a1.8 1.8 0 0 0 1.08 1.66 1.8 1.8 0 0 0 2-.36l.08-.08 2.76 2.76-.08.08a1.8 1.8 0 0 0-.36 2 1.8 1.8 0 0 0 1.66 1.08h.11v3.9h-.11A1.8 1.8 0 0 0 19.4 15Z" />
        </>
      );
    case "sun":
      return (
        <>
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
        </>
      );
    case "moon":
      return <path d="M20.5 15.5A8.8 8.8 0 0 1 8.5 3.7 8.8 8.8 0 1 0 20.5 15.5Z" />;
    case "bell":
      return (
        <>
          <path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9Z" />
          <path d="M9.5 21h5" />
        </>
      );
    case "search":
      return (
        <>
          <circle cx="10.5" cy="10.5" r="6.5" />
          <path d="m15.5 15.5 5 5" />
        </>
      );
    case "back":
      return <path d="m15 18-6-6 6-6M9 12h11" />;
    case "send":
      return <path d="m3 4 18 8-18 8 3-8zm3 8h15" />;
    case "plus":
      return <path d="M12 5v14M5 12h14" />;
    case "sparkle":
      return (
        <>
          <path d="M12 2.5c.7 5.2 2.3 6.8 7.5 7.5-5.2.7-6.8 2.3-7.5 7.5-.7-5.2-2.3-6.8-7.5-7.5 5.2-.7 6.8-2.3 7.5-7.5Z" />
          <path d="M19 16.5c.25 1.8.7 2.25 2.5 2.5-1.8.25-2.25.7-2.5 2.5-.25-1.8-.7-2.25-2.5-2.5 1.8-.25 2.25-.7 2.5-2.5Z" />
        </>
      );
    case "more":
      return (
        <>
          <circle cx="5" cy="12" r="1" fill="currentColor" stroke="none" />
          <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
          <circle cx="19" cy="12" r="1" fill="currentColor" stroke="none" />
        </>
      );
  }
}

export function RevelarIcon({ name, title, className = "", ...props }: RevelarIconProps) {
  return (
    <svg
      className={`revelar-icon ${className}`.trim()}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.65"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={title ? undefined : true}
      role={title ? "img" : undefined}
      {...props}
    >
      {title && <title>{title}</title>}
      <IconDrawing name={name} />
    </svg>
  );
}
