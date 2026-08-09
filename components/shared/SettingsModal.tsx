"use client";

import { useState } from "react";

import { notificationCategoryOptions } from "@/config/notifications";
import { palettes } from "@/config/themes";
import type { NotificationPreferences, Palette, ThemeMode } from "@/types/revelar";

type SettingsModalProps = {
  themeMode: ThemeMode;
  palette: Palette;
  onThemeModeChange: (mode: ThemeMode) => void;
  onPaletteChange: (palette: Palette) => void;
  onClose: () => void;
  onSave: () => void;
  notificationPreferences: NotificationPreferences;
  onNotificationPreferencesChange: (preferences: NotificationPreferences) => void;
  onRequestBrowserPermission: () => Promise<"default" | "denied" | "granted" | "unsupported">;
};

export function SettingsModal({
  themeMode,
  palette,
  onThemeModeChange,
  onPaletteChange,
  onClose,
  onSave,
  notificationPreferences,
  onNotificationPreferencesChange,
  onRequestBrowserPermission,
}: SettingsModalProps) {
  const [tab, setTab] = useState<"appearance" | "notifications">("appearance");
  const [customReminder, setCustomReminder] = useState("");

  const toggleReminder = (day: number) => {
    const exists = notificationPreferences.reminderDays.includes(day);
    onNotificationPreferencesChange({
      ...notificationPreferences,
      reminderDays: exists
        ? notificationPreferences.reminderDays.filter((item) => item !== day)
        : [...notificationPreferences.reminderDays, day].sort((a, b) => b - a),
    });
  };

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
            <h2 id="settings-title">Configurações gerais</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Fechar">
            ×
          </button>
        </header>
        <nav className="settings-tabs" aria-label="Áreas das configurações">
          <button
            type="button"
            className={tab === "appearance" ? "active" : ""}
            onClick={() => setTab("appearance")}
          >
            Aparência
          </button>
          <button
            type="button"
            className={tab === "notifications" ? "active" : ""}
            onClick={() => setTab("notifications")}
          >
            Notificações
          </button>
        </nav>

        {tab === "appearance" ? (
          <>
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
          </>
        ) : (
          <>
            <div className="settings-section notification-permission-card">
              <div>
                <span className="settings-bell">♢</span>
                <span>
                  <h3>Avisos no navegador e telefone</h3>
                  <p>
                    Funciona quando a permissão é concedida. No telefone, instale o Revelar. na tela
                    inicial.
                  </p>
                </span>
              </div>
              <button
                type="button"
                className={
                  notificationPreferences.browserEnabled ? "permission-active" : "outline-button"
                }
                onClick={() => void onRequestBrowserPermission()}
              >
                {notificationPreferences.browserEnabled ? "Ativado" : "Ativar avisos"}
              </button>
            </div>
            <div className="settings-section">
              <h3>Quero receber avisos sobre</h3>
              <div className="notification-preference-list">
                {notificationCategoryOptions.map((option) => (
                  <label key={option.id}>
                    <span>
                      <strong>{option.label}</strong>
                      <small>{option.description}</small>
                    </span>
                    <input
                      type="checkbox"
                      checked={notificationPreferences.categories[option.id]}
                      onChange={() =>
                        onNotificationPreferencesChange({
                          ...notificationPreferences,
                          categories: {
                            ...notificationPreferences.categories,
                            [option.id]: !notificationPreferences.categories[option.id],
                          },
                        })
                      }
                    />
                  </label>
                ))}
              </div>
            </div>
            <div className="settings-section">
              <h3>Antecedência dos lembretes</h3>
              <p>Escolha quantos dias antes o aviso deve aparecer.</p>
              <div className="reminder-days">
                {[7, 3, 1, 0].map((day) => (
                  <button
                    type="button"
                    key={day}
                    className={notificationPreferences.reminderDays.includes(day) ? "active" : ""}
                    onClick={() => toggleReminder(day)}
                  >
                    {day === 0 ? "No dia" : `${day}d antes`}
                  </button>
                ))}
              </div>
              <div className="custom-reminder">
                <input
                  type="number"
                  min="1"
                  max="365"
                  value={customReminder}
                  onChange={(event) => setCustomReminder(event.target.value)}
                  placeholder="Outro prazo"
                />
                <button
                  type="button"
                  onClick={() => {
                    const day = Number(customReminder);
                    if (
                      day > 0 &&
                      day <= 365 &&
                      !notificationPreferences.reminderDays.includes(day)
                    ) {
                      toggleReminder(day);
                      setCustomReminder("");
                    }
                  }}
                >
                  Adicionar
                </button>
              </div>
            </div>
          </>
        )}
        <footer>
          <button className="primary-button" type="button" onClick={onSave}>
            Salvar configurações
          </button>
        </footer>
      </section>
    </div>
  );
}
