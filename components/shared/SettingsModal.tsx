import { palettes } from "@/config/themes";
import type { Palette, ThemeMode } from "@/types/revelar";

type SettingsModalProps = {
  themeMode: ThemeMode;
  palette: Palette;
  onThemeModeChange: (mode: ThemeMode) => void;
  onPaletteChange: (palette: Palette) => void;
  onClose: () => void;
  onSave: () => void;
};

export function SettingsModal({
  themeMode,
  palette,
  onThemeModeChange,
  onPaletteChange,
  onClose,
  onSave,
}: SettingsModalProps) {
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="settings-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header>
          <div>
            <p>CONFIGURAÇÕES</p>
            <h2 id="settings-title">Aparência</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Fechar">
            ×
          </button>
        </header>
        <div className="settings-section">
          <h3>Modo</h3>
          <p>Escolha como o Revelar aparece para você.</p>
          <div className="segmented">
            {(["system", "light", "dark"] as ThemeMode[]).map((mode) => (
              <button
                type="button"
                key={mode}
                className={themeMode === mode ? "selected" : ""}
                onClick={() => onThemeModeChange(mode)}
              >
                {mode === "system" ? "Automático" : mode === "light" ? "Claro" : "Escuro"}
              </button>
            ))}
          </div>
        </div>
        <div className="settings-section">
          <h3>Paleta</h3>
          <p>Mude as cores sem perder a identidade profissional.</p>
          <div className="palette-grid">
            {palettes.map((option) => (
              <button
                type="button"
                key={option.id}
                className={palette === option.id ? "selected" : ""}
                onClick={() => onPaletteChange(option.id)}
              >
                <span className="color-dots">
                  {option.colors.map((color) => (
                    <i key={color} style={{ background: color }} />
                  ))}
                </span>
                <strong>{option.name}</strong>
                <small>{palette === option.id ? "Ativo" : "Visualizar"}</small>
              </button>
            ))}
          </div>
        </div>
        <footer>
          <button className="primary-button" type="button" onClick={onSave}>
            Salvar aparência
          </button>
        </footer>
      </section>
    </div>
  );
}
