import { navItems } from "@/config/navigation";
import { RevelarIcon } from "@/components/shared/RevelarIcon";
import type { AppSection } from "@/types/revelar";

type SidebarProps = {
  activeNav: AppSection;
  onNavigate: (label: AppSection) => void;
  onOpenHelp: () => void;
  onOpenSettings: () => void;
  onToast: (message: string) => void;
};

export function Sidebar({
  activeNav,
  onNavigate,
  onOpenHelp,
  onOpenSettings,
  onToast,
}: SidebarProps) {
  return (
    <aside className="sidebar">
      <div className="brand">
        <img className="brand-logo" src="/brand/revelar-logo-horizontal.svg" alt="Revelar." />
        <span>Fotografia & gestão</span>
      </div>
      <nav className="side-nav" aria-label="Navegação principal">
        <p>ESTÚDIO</p>
        {navItems.slice(0, 5).map((item) => (
          <button
            key={item.label}
            className={activeNav === item.label ? "active" : ""}
            aria-label={item.label}
            title={item.label}
            onClick={() => onNavigate(item.label)}
            type="button"
            aria-current={activeNav === item.label ? "page" : undefined}
          >
            <RevelarIcon name={item.icon} />
            <span>{item.label}</span>
          </button>
        ))}
        <p className="nav-group">FERRAMENTAS</p>
        {navItems.slice(5).map((item) => (
          <button
            key={item.label}
            className={`${activeNav === item.label ? "active" : ""} ${!item.available ? "planned" : ""}`}
            aria-label={item.label}
            title={item.label}
            onClick={() => onNavigate(item.label)}
            type="button"
            aria-current={activeNav === item.label ? "page" : undefined}
          >
            <RevelarIcon name={item.icon} />
            <span>{item.label}</span>
            {!item.available && <small className="nav-status">Em breve</small>}
          </button>
        ))}
      </nav>
      <div className="sidebar-bottom">
        <button type="button" onClick={onOpenHelp} aria-label="Ajuda" title="Ajuda">
          <span className="help-glyph" aria-hidden="true">
            ?
          </span>
          <span>Ajuda</span>
        </button>
        <button
          type="button"
          onClick={onOpenSettings}
          aria-label="Configurações"
          title="Configurações"
        >
          <RevelarIcon name="settings" />
          <span>Configurações</span>
        </button>
        <button
          className="profile"
          aria-label="Perfil da Maryana"
          title="Maryana"
          type="button"
          onClick={() => onToast("Perfil da Maryana")}
        >
          <span className="avatar">M</span>
          <span>
            <strong>Maryana</strong>
            <small>Fotógrafa</small>
          </span>
          <b>›</b>
        </button>
      </div>
    </aside>
  );
}
