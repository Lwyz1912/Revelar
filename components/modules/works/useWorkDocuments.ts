import { type ChangeEvent, useEffect, useRef, useState } from "react";
import { deleteAppFile, uploadAppFile } from "@/lib/app-files.client";
import type { ShowToast } from "@/hooks/use-toast";
import type { AppFileRef, Work, WorkContract, WorkContractStatus } from "@/types/revelar";

export function useWorkDocuments({
  work,
  onUpdate,
  update,
  addActivity,
  toast,
}: {
  work: Work;
  onUpdate: (update: Work | ((current: Work) => Work)) => void;
  update: (changes: Partial<Work>) => void;
  addActivity: (title: string, icon?: string) => void;
  toast: ShowToast;
}) {
  const [contractFiles, setContractFiles] = useState<{
    sourceFile?: AppFileRef;
    signedFile?: AppFileRef;
  }>(() => {
    const legacy = work.contract?.file;
    const sourceFile =
      work.contract?.sourceFile ?? (legacy && /\.docx?$/i.test(legacy.name) ? legacy : undefined);
    const signedFile =
      work.contract?.signedFile ?? (legacy && !/\.docx?$/i.test(legacy.name) ? legacy : undefined);
    return { sourceFile, signedFile };
  });
  const [contractUpload, setContractUpload] = useState<{
    role: "sourceFile" | "signedFile";
    status: "uploading" | "error";
    message?: string;
  } | null>(null);
  const workFileRef = useRef<HTMLInputElement>(null);
  const contractSourceFileRef = useRef<HTMLInputElement>(null);
  const contractSignedFileRef = useRef<HTMLInputElement>(null);
  const contract: WorkContract = work.contract ?? {
    status: (work.stages.find((stage) => stage.label === "Contrato")?.done
      ? "signed"
      : "pending") as WorkContractStatus,
    title: `Contrato · ${work.title}`,
    content: "",
    updatedAt: new Date().toISOString(),
  };
  const legacyContractFile = contract.file;
  const legacyIsSource = Boolean(legacyContractFile && /\.docx?$/i.test(legacyContractFile.name));
  const sourceContractFile =
    contractFiles.sourceFile ??
    contract.sourceFile ??
    (legacyIsSource ? legacyContractFile : undefined);
  const signedContractFile =
    contractFiles.signedFile ??
    contract.signedFile ??
    (!legacyIsSource ? legacyContractFile : undefined);
  const preferredContractFile = signedContractFile ?? sourceContractFile;
  const updateContract = (changes: Partial<WorkContract>) => {
    onUpdate((current) => {
      const currentContract = current.contract ?? contract;
      return {
        ...current,
        contract: { ...currentContract, ...changes, updatedAt: new Date().toISOString() },
      };
    });
  };
  const uploadContractFile = async (file: File | undefined, role: "sourceFile" | "signedFile") => {
    if (!file) return;
    setContractUpload({ role, status: "uploading" });
    try {
      const uploaded = await uploadAppFile(
        file,
        role === "sourceFile" ? "contract-source" : "contract-signed",
        String(work.id),
      );
      const previous = role === "sourceFile" ? sourceContractFile : signedContractFile;
      setContractFiles((current) => ({ ...current, [role]: uploaded }));
      updateContract({
        sourceFile: sourceContractFile,
        signedFile: signedContractFile,
        [role]: uploaded,
        file: undefined,
        status: contract.status === "not_required" ? "pending" : contract.status,
      });
      if (previous && previous.id !== uploaded.id) {
        await deleteAppFile(previous).catch(() => undefined);
      }
      setContractUpload(null);
      toast(
        role === "sourceFile"
          ? "Arquivo de trabalho vinculado ao contrato"
          : "Contrato assinado vinculado ao trabalho",
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "Não foi possível enviar o contrato";
      setContractUpload({ role, status: "error", message });
      toast(message, "error");
    }
  };
  const removeContractFile = async (role: "sourceFile" | "signedFile") => {
    const file = role === "sourceFile" ? sourceContractFile : signedContractFile;
    if (!file) return;
    await deleteAppFile(file).catch(() => undefined);
    setContractFiles((current) => ({ ...current, [role]: undefined }));
    updateContract({
      sourceFile: sourceContractFile,
      signedFile: signedContractFile,
      [role]: undefined,
      file: undefined,
    });
    toast("Arquivo do contrato removido");
  };
  useEffect(() => {
    let cancelled = false;
    void fetch(`/api/files?scope=contract&relatedId=${encodeURIComponent(String(work.id))}`, {
      cache: "no-store",
    })
      .then(async (response) =>
        response.ok
          ? ((await response.json()) as {
              files?: Array<AppFileRef & { scope?: string }>;
            })
          : null,
      )
      .then((result) => {
        if (cancelled || !result?.files?.length) return;
        const sourceFile = result.files.find(
          (file) => file.scope === "contract-source" || /\.docx?$/i.test(file.name),
        );
        const signedFile = result.files.find(
          (file) => file.scope === "contract-signed" || /\.pdf$/i.test(file.name),
        );
        if (!sourceFile && !signedFile) return;
        setContractFiles((current) => ({
          sourceFile: sourceFile ?? current.sourceFile,
          signedFile: signedFile ?? current.signedFile,
        }));
        onUpdate((current) => {
          const nextSource = sourceFile ?? current.contract?.sourceFile;
          const nextSigned = signedFile ?? current.contract?.signedFile;
          if (
            current.contract?.sourceFile?.id === nextSource?.id &&
            current.contract?.signedFile?.id === nextSigned?.id &&
            !current.contract?.file
          ) {
            return current;
          }
          return {
            ...current,
            contract: {
              ...(current.contract ?? {
                status: "pending" as const,
                title: `Contrato · ${current.title}`,
                content: "",
                updatedAt: new Date().toISOString(),
              }),
              sourceFile: nextSource,
              signedFile: nextSigned,
              file: undefined,
              updatedAt: current.contract?.updatedAt ?? new Date().toISOString(),
            },
          };
        });
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [onUpdate, work.id]);
  const addWorkFiles = async (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files || []);
    if (!selectedFiles.length) return;
    try {
      const uploaded: AppFileRef[] = [];
      for (const file of selectedFiles) {
        uploaded.push(await uploadAppFile(file, "work", String(work.id)));
      }
      update({ attachments: [...work.attachments, ...uploaded] });
      addActivity(`${uploaded.length} arquivo(s) enviado(s) e sincronizado(s)`, "□");
      toast("Arquivos salvos no trabalho");
    } catch (error) {
      toast(
        error instanceof Error ? error.message : "Não foi possível enviar os arquivos",
        "error",
      );
    }
    event.target.value = "";
  };
  return {
    workFileRef,
    contractSourceFileRef,
    contractSignedFileRef,
    contract,
    sourceContractFile,
    signedContractFile,
    preferredContractFile,
    contractUpload,
    updateContract,
    uploadContractFile,
    removeContractFile,
    addWorkFiles,
  };
}
