"use client";

import { useEffect, useRef, useState } from "react";

import {
  fileDownloadUrl,
  fileExtension,
  fileViewUrl,
  formatFileSize,
} from "@/lib/app-files.client";
import type { AppFileRef } from "@/types/revelar";

function previewKind(file: AppFileRef) {
  const extension = fileExtension(file).toLowerCase();
  if (file.type === "application/pdf" || extension === "pdf") return "pdf";
  if (
    file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    extension === "docx"
  )
    return "docx";
  if (
    file.type.startsWith("image/") ||
    ["jpg", "jpeg", "png", "webp", "gif", "svg"].includes(extension)
  )
    return "image";
  return "other";
}

export function FileViewer({
  file,
  onClose,
  onReplace,
  onDelete,
}: {
  file: AppFileRef;
  onClose: () => void;
  onReplace?: () => void;
  onDelete?: () => void;
}) {
  const [zoom, setZoom] = useState(100);
  const [expanded, setExpanded] = useState(false);
  const [docxState, setDocxState] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const docxRoot = useRef<HTMLDivElement>(null);
  const kind = previewKind(file);

  useEffect(() => {
    if (kind !== "docx" || !docxRoot.current) return;
    let cancelled = false;
    setDocxState("loading");
    docxRoot.current.innerHTML = "";
    void Promise.all([fetch(fileViewUrl(file)), import("docx-preview")])
      .then(async ([response, renderer]) => {
        if (!response.ok) throw new Error("Arquivo indisponível");
        const blob = await response.blob();
        if (cancelled || !docxRoot.current) return;
        await renderer.renderAsync(blob, docxRoot.current, undefined, {
          className: "revelar-docx",
          inWrapper: true,
          ignoreWidth: false,
          ignoreHeight: false,
          renderHeaders: true,
          renderFooters: true,
          renderFootnotes: true,
          useBase64URL: true,
        });
        if (!cancelled) setDocxState("ready");
      })
      .catch(() => {
        if (!cancelled) setDocxState("error");
      });
    return () => {
      cancelled = true;
    };
  }, [file, kind]);

  return (
    <div
      className={`file-viewer-backdrop ${expanded ? "expanded" : ""}`}
      role="presentation"
      onMouseDown={onClose}
    >
      <section
        className="file-viewer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="file-viewer-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="file-viewer-header">
          <div>
            <span>
              {fileExtension(file)} · {formatFileSize(file.size)}
            </span>
            <h2 id="file-viewer-title">{file.name}</h2>
          </div>
          <div className="file-viewer-toolbar">
            <button
              type="button"
              onClick={() => setZoom((value) => Math.max(50, value - 10))}
              aria-label="Diminuir zoom"
            >
              −
            </button>
            <output>{zoom}%</output>
            <button
              type="button"
              onClick={() => setZoom((value) => Math.min(200, value + 10))}
              aria-label="Aumentar zoom"
            >
              ＋
            </button>
            <button type="button" onClick={() => setExpanded((value) => !value)}>
              {expanded ? "Reduzir" : "Tela cheia"}
            </button>
            <button
              className="file-viewer-close"
              type="button"
              onClick={onClose}
              aria-label="Fechar"
            >
              ×
            </button>
          </div>
        </header>
        <div className={`file-viewer-canvas kind-${kind}`}>
          {kind === "pdf" && (
            <iframe
              key={zoom}
              title={`Prévia de ${file.name}`}
              src={`${fileViewUrl(file)}#zoom=${zoom}&view=FitH&toolbar=0`}
            />
          )}
          {kind === "image" && (
            <div className="file-viewer-scaled" style={{ transform: `scale(${zoom / 100})` }}>
              <img src={fileViewUrl(file)} alt={`Prévia de ${file.name}`} />
            </div>
          )}
          {kind === "docx" && (
            <>
              {docxState === "loading" && (
                <div className="file-viewer-message">Preparando o documento…</div>
              )}
              {docxState === "error" && (
                <div className="file-viewer-message">
                  <strong>Não foi possível montar a prévia.</strong>
                  <p>O arquivo original continua disponível para baixar.</p>
                </div>
              )}
              <div
                className="file-viewer-scaled docx-canvas"
                style={{ transform: `scale(${zoom / 100})` }}
                ref={docxRoot}
              />
            </>
          )}
          {kind === "other" && (
            <div className="file-viewer-message">
              <span>{fileExtension(file)}</span>
              <strong>Prévia completa indisponível para este formato</strong>
              <p>Nome, tamanho e tipo ficam visíveis aqui; o original pode ser baixado.</p>
            </div>
          )}
        </div>
        <footer className="file-viewer-footer">
          <span>Arquivo salvo e sincronizado no Revelar.</span>
          <div>
            {onReplace && (
              <button type="button" onClick={onReplace}>
                Substituir
              </button>
            )}
            {onDelete && (
              <button className="danger-action" type="button" onClick={onDelete}>
                Excluir
              </button>
            )}
            <a className="primary-button" href={fileDownloadUrl(file)} download={file.name}>
              ↓ Baixar
            </a>
          </div>
        </footer>
      </section>
    </div>
  );
}
