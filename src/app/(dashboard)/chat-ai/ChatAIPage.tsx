'use client';
import Link from 'next/link';
import { AIChat } from "@/components/features/components/AIChat";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Bot, Key, AlertCircle, ExternalLink } from "lucide-react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";

declare global {
  interface Window {
    aistudio: {
      hasSelectedApiKey: () => Promise<boolean>;
      openSelectKey: () => Promise<void>;
    };
  }
}

export default function ChatAIPage() {
  const [hasKey, setHasKey] = useState<boolean | null>(null);

  useEffect(() => {
    checkKey();
  }, []);

  const checkKey = async () => {
    try {
      if (typeof window === 'undefined' || !window.aistudio) {
        setHasKey(false);
        return;
      }
      const selected = await window.aistudio.hasSelectedApiKey();
      setHasKey(selected);
    } catch (e) {
      console.error("Failed to check API key", e);
      setHasKey(false);
    }
  };

  const handleSelectKey = async () => {
    try {
      if (typeof window === 'undefined' || !window.aistudio) {
        console.warn("AI Studio extension not detected");
        return;
      }
      await window.aistudio.openSelectKey();
      setHasKey(true); // Assume success as per guidelines
    } catch (e) {
      console.error("Failed to open key selector", e);
    }
  };

  return (
    <div className="animate-in fade-in duration-500">
      <div className="max-w-5xl mx-auto h-[calc(100vh-4rem)] sm:h-[calc(100vh-8rem)] flex flex-col sm:px-4">
        <Card className="flex-1 flex flex-col overflow-hidden border-0 sm:border border-border/40 shadow-none sm:shadow-2xl rounded-none sm:rounded-3xl bg-white/70 backdrop-blur-xl">
          <CardHeader className="border-b bg-white/40 p-3 sm:p-5 shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-teal-500/20 rotate-3">
                  <Bot className="w-6 h-6 sm:w-7 sm:h-7 text-white -rotate-3" />
                </div>
                <div>
                  <CardTitle className="text-lg sm:text-xl font-black tracking-tight text-slate-900">CVSKJ Intelligence</CardTitle>
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    <p className="text-[10px] sm:text-xs font-medium text-slate-500">Sistem Analisis Aktif</p>
                  </div>
                </div>
              </div>
              {hasKey && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSelectKey}
                  className="hidden sm:flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider border-slate-200 hover:bg-slate-50"
                >
                  <Key className="w-3 h-3" />
                  Ganti API Key
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="flex-1 p-0 overflow-hidden relative">
            {hasKey === false ? (
              <div className="h-full flex flex-col items-center justify-center p-8 text-center space-y-6">
                <div className="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center">
                  <Key className="w-10 h-10 text-amber-600" />
                </div>
                <div className="max-w-md space-y-2">
                  <h3 className="text-xl font-bold text-slate-900">Quota Terlampaui</h3>
                  <p className="text-sm text-slate-500 leading-relaxed">
                    Sistem sedang mengalami lonjakan penggunaan. Untuk terus menggunakan fitur AI, silakan gunakan API Key Anda sendiri dari Google AI Studio.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 w-full max-w-sm">
                  <Button
                    onClick={handleSelectKey}
                    className="flex-1 bg-teal-600 hover:bg-teal-700 h-12 rounded-xl shadow-lg shadow-teal-600/20"
                  >
                    <Key className="w-4 h-4 mr-2" />
                    Pilih API Key
                  </Button>
                  <Button
                    variant="outline"
                    asChild
                    className="flex-1 h-12 rounded-xl"
                  >
                    <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer">
                      Info Billing
                      <ExternalLink className="w-3 h-3 ml-2" />
                    </a>
                  </Button>
                </div>

                <div className="flex items-start gap-3 p-4 bg-slate-50 rounded-2xl text-left max-w-md">
                  <AlertCircle className="w-5 h-5 text-slate-400 shrink-0 mt-0.5" />
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Pastikan API Key berasal dari project Google Cloud yang sudah mengaktifkan billing. Anda bisa mendapatkan key gratis dengan limit tertentu di <a href="https://aistudio.google.com/" target="_blank" rel="noopener noreferrer" className="text-teal-600 font-bold underline">AI Studio</a>.
                  </p>
                </div>
              </div>
            ) : hasKey === null ? (
              <div className="h-full flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-teal-500/30 border-t-teal-500 rounded-full animate-spin" />
              </div>
            ) : (
              <AIChat onQuotaExceeded={() => setHasKey(false)} />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
