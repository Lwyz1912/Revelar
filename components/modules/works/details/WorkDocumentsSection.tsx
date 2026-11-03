import {
  deleteAppFile,
  fileDownloadUrl,
  formatFileSize,
  isAppFileRef,
} from "@/lib/app-files.client";
import type { AppFileRef, WorkContractStatus } from "@/types/revelar";
import { attachmentExtension, attachmentName } from "../work-attachments";
import type { WorkDetailsController } from "../useWorkDetailsController";

type Props = {
  state: Pick<
    WorkDetailsController,
    | "addWorkFiles"
    | "contract"
    | "contractSignedFileRef"
    | "contractSourceFileRef"
    | "contractUpload"
    | "openAttachment"
    | "preferredContractFile"
    | "removeContractFile"
    | "setPreviewStoredFile"
    | "signedContractFile"
    | "sourceContractFile"
    | "update"
    | "updateContract"
    | "work"
    | "workFileRef"
  >;
};

function ContractFileItem({
  file,
  role,
  label,
  onPreview,
  onRemove,
}: {
  file?: AppFileRef;
  role: "sourceFile" | "signedFile";
  label: string;
  onPreview: (file: AppFileRef) => void;
  onRemove: (role: "sourceFile" | "signedFile") => void;
}) {
  if (!file) return null;
  return (
    <article className="work-contract-file-item">
      <span className="work-contract-file-icon" aria-hidden="true">
        {role === "sourceFile" ? "DOCX" : "PDF"}
      </span>
      <div>
        <strong>{label}</strong>
        <small>
          {file.name} · {formatFileSize(file.size)}
        </small>
      </div>
      <button type="button" onClick={() => onPreview(file)}>
        Visualizar
      </button>
      <a href={fileDownloadUrl(file)} download={file.name}>
        Baixar
      </a>
      <button
        className="icon-button danger-icon-button"
        type="button"
        title={`Remover ${label.toLowerCase()}`}
        aria-label={`Remover ${label.toLowerCase()}`}
        onClick={() => onRemove(role)}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4 7h16M9 7V4h6v3m-8 0 1 13h8l1-13M10 11v5m4-5v5" />
        </svg>
      </button>
    </article>
  );
}

export function WorkDocumentsSection({ state }: Props) {
  const {
    addWorkFiles,
    contract,
    contractSignedFileRef,
    contractSourceFileRef,
    contractUpload,
    openAttachment,
    preferredContractFile,
    removeContractFile,
    setPreviewStoredFile,
    signedContractFile,
    sourceContractFile,
    update,
    updateContract,
    work,
    workFileRef,
  } = state;
  return (
    <section className="tab-single card work-documents-hub">
      <div className="detail-section-heading work-documents-heading">
        <div>
          <p>DOCUMENTOS DO TRABALHO</p>
          <h2>Contratos, comprovantes e materiais</h2>
          <small>Arquivos organizados, acessíveis e vinculados permanentemente ao trabalho.</small>
        </div>
      </div>
      <input ref={workFileRef} type="file" multiple hidden onChange={addWorkFiles} />
      <section className="work-document-contract-card">
        <header className="work-document-contract-header">
          <div className="work-document-type" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <path d="M6 3h8l4 4v14H6zM14 3v5h4M9 12h6M9 16h6" />
            </svg>
          </div>
          <div className="work-document-contract-copy">
            <span>CONTRATO PRINCIPAL</span>
            <h3>{contract.title}</h3>
            <small>
              {preferredContractFile
                ? "Os arquivos vinculados a este trabalho estão abaixo."
                : "Adicione o documento de trabalho, o PDF assinado ou ambos."}
            </small>
          </div>
          <label className={`work-contract-status status-${contract.status}`}>
            <span>Situação</span>
            <select
              value={contract.status}
              onChange={(event) =>
                updateContract({ status: event.target.value as WorkContractStatus })
              }
            >
              <option value="not_required">Não necessário</option>
              <option value="pending">Pendente</option>
              <option value="sent">Enviado</option>
              <option value="signed">Assinado</option>
            </select>
          </label>
        </header>
        {contractUpload && (
          <p
            className={`contract-upload-feedback is-${contractUpload.status}`}
            role={contractUpload.status === "error" ? "alert" : "status"}
          >
            {contractUpload.status === "uploading"
              ? "Salvando o arquivo no contrato…"
              : contractUpload.message}
          </p>
        )}
        <div className="work-document-contract-files">
          <ContractFileItem
            role="sourceFile"
            label="Documento de trabalho"
            file={sourceContractFile}
            onPreview={setPreviewStoredFile}
            onRemove={(role) => void removeContractFile(role)}
          />
          <ContractFileItem
            role="signedFile"
            label="PDF assinado"
            file={signedContractFile}
            onPreview={setPreviewStoredFile}
            onRemove={(role) => void removeContractFile(role)}
          />
          {!sourceContractFile && !signedContractFile && (
            <div className="work-contract-file-empty">
              <span>▱</span>
              <div>
                <strong>Nenhum contrato anexado</strong>
                <small>O arquivo aparecerá aqui assim que o envio terminar.</small>
              </div>
            </div>
          )}
        </div>
        <div className="work-document-contract-actions">
          <button
            type="button"
            disabled={contractUpload?.status === "uploading"}
            onClick={() => contractSourceFileRef.current?.click()}
          >
            {contractUpload?.status === "uploading" && contractUpload.role === "sourceFile"
              ? "Enviando DOCX…"
              : sourceContractFile
                ? "Substituir DOCX"
                : "＋ Adicionar DOCX"}
          </button>
          <button
            type="button"
            disabled={contractUpload?.status === "uploading"}
            onClick={() => contractSignedFileRef.current?.click()}
          >
            {contractUpload?.status === "uploading" && contractUpload.role === "signedFile"
              ? "Enviando PDF…"
              : signedContractFile
                ? "Substituir PDF"
                : "＋ Adicionar PDF assinado"}
          </button>
        </div>
      </section>
      <div className="work-document-list-heading">
        <div>
          <div>
            <span>OUTROS DOCUMENTOS</span>
            <strong>Comprovantes e materiais</strong>
            <small>{work.attachments.length} arquivo(s)</small>
          </div>
          <button
            className="outline-button"
            type="button"
            onClick={() => workFileRef.current?.click()}
          >
            ＋ Adicionar arquivo
          </button>
        </div>
      </div>
      <div className="work-file-grid">
        {work.attachments.map((file, index) => (
          <article key={`${isAppFileRef(file) ? file.id : file}-${index}`}>
            <span>{attachmentExtension(attachmentName(file)).toUpperCase()}</span>
            <button className="file-main-action" type="button" onClick={() => openAttachment(file)}>
              <strong>{attachmentName(file)}</strong>
              <small>
                {attachmentExtension(attachmentName(file)).toUpperCase()}
                {isAppFileRef(file)
                  ? ` · ${formatFileSize(file.size)} · sincronizado`
                  : " · demonstrativo"}
              </small>
            </button>
            <span className="file-actions">
              <button type="button" onClick={() => openAttachment(file)}>
                Visualizar
              </button>
              {isAppFileRef(file) && (
                <a href={fileDownloadUrl(file)} download={file.name}>
                  Baixar
                </a>
              )}
              <button
                className="remove-file"
                type="button"
                aria-label={`Remover ${attachmentName(file)}`}
                onClick={() => {
                  if (isAppFileRef(file)) void deleteAppFile(file).catch(() => undefined);
                  update({
                    attachments: work.attachments.filter((_, fileIndex) => fileIndex !== index),
                  });
                }}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M4 7h16M9 7V4h6v3m-8 0 1 13h8l1-13M10 11v5m4-5v5" />
                </svg>
              </button>
            </span>
          </article>
        ))}
        {work.attachments.length === 0 && (
          <div className="empty-state">
            <span>□</span>
            <h2>Nenhum arquivo anexado</h2>
            <p>Adicione contratos, comprovantes ou referências.</p>
          </div>
        )}
      </div>
    </section>
  );
}
