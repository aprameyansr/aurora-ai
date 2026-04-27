"use client";

import { createContext, useContext, useState, ReactNode } from "react";

type AppContextType = {
  file: File | null;
  setFile: (f: File | null) => void;
  uploadedFileName: string | null;
  setUploadedFileName: (n: string | null) => void;
  columns: string[];
  setColumns: (c: string[]) => void;
  suggestedSensitive: string[];
  setSuggestedSensitive: (s: string[]) => void;
  target: string;
  setTarget: (t: string) => void;
  sensitive: string;
  setSensitive: (s: string) => void;
  biasMetrics: any | null;
  setBiasMetrics: (m: any) => void;
  explanation: any | null;
  setExplanation: (e: any) => void;
  mitigationResult: any | null;
  setMitigationResult: (m: any) => void;
  auditReport: any | null;
  setAuditReport: (r: any) => void;
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [file, setFile] = useState<File | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [columns, setColumns] = useState<string[]>([]);
  const [suggestedSensitive, setSuggestedSensitive] = useState<string[]>([]);
  const [target, setTarget] = useState("");
  const [sensitive, setSensitive] = useState("");
  const [biasMetrics, setBiasMetrics] = useState<any>(null);
  const [explanation, setExplanation] = useState<any>(null);
  const [mitigationResult, setMitigationResult] = useState<any>(null);
  const [auditReport, setAuditReport] = useState<any>(null);

  return (
    <AppContext.Provider value={{
      file, setFile,
      uploadedFileName, setUploadedFileName,
      columns, setColumns,
      suggestedSensitive, setSuggestedSensitive,
      target, setTarget,
      sensitive, setSensitive,
      biasMetrics, setBiasMetrics,
      explanation, setExplanation,
      mitigationResult, setMitigationResult,
      auditReport, setAuditReport,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useAppContext must be used inside AppProvider");
  return ctx;
}
