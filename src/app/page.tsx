'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload, FileArchive, Key, Loader2,
  ChevronDown, Download, ArrowLeft,
  ShieldCheck, AlertTriangle, CheckCircle, XCircle,
  FileText, Sparkles, Info, Github, ExternalLink, Building2, Star, Mail,
  Zap, Lock, Code2, Clock, Apple, Cpu
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import Link from 'next/link';
import { UserButton, SignedOut, SignedIn, useAuth, useClerk } from '@clerk/nextjs';

type AuditPhase = 'idle' | 'uploading' | 'analyzing' | 'complete' | 'error';

const providerModels: Record<string, { label: string; value: string }[]> = {
  anthropic: [
    { label: 'Claude Sonnet 4', value: 'claude-sonnet-4-20250514' },
    { label: 'Claude 3.5 Sonnet', value: 'claude-3-5-sonnet-20241022' },
    { label: 'Claude 3.5 Haiku', value: 'claude-3-5-haiku-20241022' },
    { label: 'Claude Opus 4', value: 'claude-opus-4-20250514' },
  ],
  openai: [
    { label: 'GPT-4o', value: 'gpt-4o' },
    { label: 'GPT-4o Mini', value: 'gpt-4o-mini' },
    { label: 'GPT-4 Turbo', value: 'gpt-4-turbo' },
    { label: 'o1', value: 'o1' },
    { label: 'o3 Mini', value: 'o3-mini' },
  ],
  gemini: [
    { label: 'Gemini 2.5 Flash', value: 'gemini-2.5-flash' },
    { label: 'Gemini 2.5 Pro', value: 'gemini-2.5-pro' },
    { label: 'Gemini 2.0 Flash', value: 'gemini-2.0-flash' },
    { label: 'Gemini 1.5 Pro', value: 'gemini-1.5-pro' },
  ],
  openrouter: [
    { label: 'Claude 3.5 Sonnet', value: 'anthropic/claude-3.5-sonnet' },
    { label: 'GPT-4o', value: 'openai/gpt-4o' },
    { label: 'Gemini Pro', value: 'google/gemini-pro-1.5' },
    { label: 'Llama 3.1 405B', value: 'meta-llama/llama-3.1-405b-instruct' },
    { label: 'Mixtral 8x22B', value: 'mistralai/mixtral-8x22b-instruct' },
  ],
};

const selectStyle = {
  backgroundImage: 'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22white%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E")',
  backgroundRepeat: 'no-repeat' as const,
  backgroundPosition: 'right 8px center',
  paddingRight: '24px',
};

export default function AuditPage() {
  const [file, setFile] = useState<File | null>(null);
  const [claudeApiKey, setClaudeApiKey] = useState('');
  const [provider, setProvider] = useState('anthropic');
  const [model, setModel] = useState('claude-sonnet-4-20250514');
  const [context, setContext] = useState('');
  const [phase, setPhase] = useState<AuditPhase>('idle');
  const [reportContent, setReportContent] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [filesScanned, setFilesScanned] = useState(0);
  const [visitorCount, setVisitorCount] = useState<number | null>(null);
  const [starCount, setStarCount] = useState<number | null>(null);
  const [fileNames, setFileNames] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [showFileList, setShowFileList] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const reportRef = useRef<HTMLDivElement>(null);
  const completeReportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem('claude_api_key');
    if (saved) setClaudeApiKey(saved);
    fetch('/api/visitor')
      .then(res => res.json())
      .then(data => { setVisitorCount(data.count || 0); })
      .catch(() => { setVisitorCount(0); });
    fetch('/api/github-stars')
      .then(res => res.json())
      .then(data => { setStarCount(data.stars ?? 0); })
      .catch(() => { setStarCount(0); });
  }, []);

  useEffect(() => {
    if (claudeApiKey) localStorage.setItem('claude_api_key', claudeApiKey);
  }, [claudeApiKey]);


  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      const ext = droppedFile.name.split('.').pop()?.toLowerCase();
      if (ext !== 'ipa') {
        setErrorMessage('Please upload an .ipa file');
      } else if (droppedFile.size > 150 * 1024 * 1024) {
        setErrorMessage('File exceeds maximum size of 150MB');
      } else {
        setFile(droppedFile);
        setErrorMessage('');
      }
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      const ext = selected.name.split('.').pop()?.toLowerCase();
      if (ext !== 'ipa') {
        setErrorMessage('Please upload an .ipa file');
        e.target.value = '';
        return;
      }
      if (selected.size > 150 * 1024 * 1024) {
        setErrorMessage('File exceeds maximum size of 150MB');
        e.target.value = '';
        return;
      }
      setFile(selected);
      setErrorMessage('');
    }
    e.target.value = '';
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const { isSignedIn } = useAuth();
  const { openSignIn, openSignUp } = useClerk();

  const handleRunAudit = async () => {
    if (!file || !claudeApiKey.trim()) return;

    if (!isSignedIn) {
      openSignIn();
      return;
    }
    setPhase('uploading');
    setReportContent('');
    setErrorMessage('');
    setFilesScanned(0);
    setFileNames([]);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('claudeApiKey', claudeApiKey.trim());
    formData.append('provider', provider);
    formData.append('model', model);
    formData.append('context', context);

    try {
      setPhase('analyzing');
      const response = await fetch('/api/audit', { method: 'POST', body: formData });
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Audit request failed');
      }
      if (!response.body) throw new Error('No response body');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let accumulated = '';
      let totalScannedTemp = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const parsed = JSON.parse(line);
            if (parsed.type === 'meta') {
              setFilesScanned(parsed.filesScanned);
              totalScannedTemp = parsed.filesScanned;
              setFileNames(parsed.fileNames || []);
            } else if (parsed.type === 'content') {
              accumulated += parsed.text;
              setReportContent(accumulated);
            } else if (parsed.type === 'error') {
              throw new Error(parsed.message);
            }
          } catch (e: any) {
            if (e.message === 'Stream interrupted') throw e;
          }
        }
      }

      setPhase('complete');
      fetch('/api/save-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportContent: accumulated, filesScanned: totalScannedTemp })
      }).catch(() => {});

    } catch (err: any) {
      console.error('Audit error:', err);
      setErrorMessage(err.message || 'An unexpected error occurred');
      setPhase('error');
    }
  };

  const handleExportReport = () => {
    if (!reportContent) return;
    try {
      const blob = new Blob([reportContent], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `appstore-audit-report-${new Date().toISOString().slice(0, 10)}.md`;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => { URL.revokeObjectURL(url); document.body.removeChild(a); }, 500);
    } catch (err) {
      console.error('Markdown export failed:', err);
      setErrorMessage('Failed to export markdown report');
    }
  };

  const handleExportPdf = async () => {
    if (!reportContent || !completeReportRef.current) return;
    try {
      const html2pdf = (await import('html2pdf.js')).default;

      // Build a wrapper with branded header + watermark + report content
      const wrapper = document.createElement('div');
      wrapper.style.position = 'relative';
      wrapper.style.backgroundColor = '#ffffff';
      wrapper.style.padding = '24px';
      wrapper.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      wrapper.style.color = '#1a1a1a';
      wrapper.style.width = '800px';

      // Branded header
      const header = document.createElement('div');
      header.style.borderBottom = '2px solid #7c3aed';
      header.style.paddingBottom = '12px';
      header.style.marginBottom = '20px';
      header.style.display = 'flex';
      header.style.justifyContent = 'space-between';
      header.style.alignItems = 'center';
      header.innerHTML = `
        <div style="display:flex;align-items:center;gap:10px;">
          <div style="background:linear-gradient(135deg,#7c3aed,#3b82f6);width:28px;height:28px;border-radius:8px;display:flex;align-items:center;justify-content:center;">
            <span style="color:#fff;font-size:14px;font-weight:900;">G</span>
          </div>
          <div>
            <div style="font-size:16px;font-weight:800;color:#000;">Gracias AI</div>
            <div style="font-size:9px;color:#666;letter-spacing:1px;text-transform:uppercase;">App Store Compliance Auditor</div>
          </div>
        </div>
        <div style="text-align:right;font-size:9px;color:#666;">
          <div><a href="https://www.producthunt.com/posts/gracias-ai" style="color:#f97316;text-decoration:none;font-weight:600;">Product Hunt</a> &nbsp;|&nbsp; <a href="https://github.com/atharvnaik1/GraciasAi-Appstore-Policy-Auditor-Opensource" style="color:#666;text-decoration:none;">GitHub</a></div>
          <div style="margin-top:2px;">business@gracias.sh</div>
        </div>
      `;
      wrapper.appendChild(header);

      // Watermark
      const watermark = document.createElement('div');
      watermark.style.position = 'fixed';
      watermark.style.top = '50%';
      watermark.style.left = '50%';
      watermark.style.transform = 'translate(-50%, -50%) rotate(-35deg)';
      watermark.style.fontSize = '80px';
      watermark.style.fontWeight = '900';
      watermark.style.color = 'rgba(124, 58, 237, 0.04)';
      watermark.style.pointerEvents = 'none';
      watermark.style.zIndex = '0';
      watermark.style.whiteSpace = 'nowrap';
      watermark.textContent = 'Gracias AI';
      wrapper.appendChild(watermark);

      // Clone report content
      const clone = completeReportRef.current.cloneNode(true) as HTMLElement;
      clone.style.maxHeight = 'none';
      clone.style.overflow = 'visible';
      clone.style.position = 'relative';
      clone.style.zIndex = '1';
      clone.querySelectorAll('*').forEach((el) => {
        const htmlEl = el as HTMLElement;
        htmlEl.style.color = '#1a1a1a';
        htmlEl.style.backgroundColor = 'transparent';
        htmlEl.style.backgroundImage = 'none';
        htmlEl.style.webkitBackgroundClip = 'unset';
        htmlEl.style.webkitTextFillColor = 'unset';
        htmlEl.style.borderColor = '#e5e5e5';
      });
      clone.querySelectorAll('h1, h2, h3').forEach((el) => { (el as HTMLElement).style.color = '#000000'; });
      clone.querySelectorAll('th').forEach((el) => { const h = el as HTMLElement; h.style.backgroundColor = '#f5f5f5'; h.style.color = '#000000'; });
      clone.querySelectorAll('code').forEach((el) => { const h = el as HTMLElement; h.style.backgroundColor = '#f0f0f0'; h.style.color = '#d63384'; });
      wrapper.appendChild(clone);

      wrapper.style.position = 'absolute';
      wrapper.style.left = '-9999px';
      document.body.appendChild(wrapper);
      await html2pdf().from(wrapper).set({
        margin: 10,
        filename: `gracias-ai-audit-report-${new Date().toISOString().slice(0, 10)}.pdf`,
        image: { type: 'jpeg' as 'jpeg' | 'png' | 'webp', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, logging: false, scrollY: 0 },
        jsPDF: { unit: 'mm' as const, format: 'a4' as const, orientation: 'portrait' as 'portrait' | 'landscape' },
      } as any).save();
      document.body.removeChild(wrapper);
    } catch (err) {
      console.error('PDF export failed:', err);
      setErrorMessage('Failed to export PDF report');
    }
  };

  const isReady = file && claudeApiKey.trim();

  return (
    <main className="min-h-[100dvh] w-full bg-background text-foreground selection:bg-primary/30 relative overflow-hidden font-sans">
      {/* Full-Screen Auth Gate */}
      <SignedOut>
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-3xl">
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff03_1px,transparent_1px),linear-gradient(to_bottom,#ffffff03_1px,transparent_1px)] bg-[size:40px_40px]" />
            <motion.div animate={{ scale: [1, 1.3, 1], opacity: [0.08, 0.18, 0.08] }} transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }} className="absolute top-[-20%] left-[-10%] w-[700px] h-[700px] bg-primary/25 rounded-full blur-[200px]" />
            <motion.div animate={{ scale: [1, 1.4, 1], opacity: [0.06, 0.14, 0.06] }} transition={{ duration: 14, repeat: Infinity, ease: "easeInOut", delay: 3 }} className="absolute bottom-[-20%] right-[-10%] w-[800px] h-[800px] bg-blue-600/20 rounded-full blur-[200px]" />
            <motion.div animate={{ scale: [1, 1.2, 1], opacity: [0.04, 0.1, 0.04] }} transition={{ duration: 12, repeat: Infinity, ease: "easeInOut", delay: 5 }} className="absolute top-[30%] left-[40%] w-[500px] h-[500px] bg-violet-500/15 rounded-full blur-[180px]" />
            <div className="absolute inset-0 bg-gradient-to-b from-white/[0.02] via-transparent to-white/[0.01]" />
          </div>
          <div className="relative z-10 flex flex-col items-center w-full max-w-md px-4">
            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="flex flex-col items-center mb-10">
              <div className="bg-gradient-to-br from-primary to-blue-500 w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg shadow-primary/30 ring-1 ring-white/10 mb-5">
                <Apple className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-3xl md:text-4xl font-black text-white mb-3">Gracias AI</h1>
              <p className="text-white/60 text-sm md:text-base text-center leading-relaxed max-w-xs">AI-Powered App Store Compliance Auditor</p>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.15 }} className="w-full rounded-3xl bg-white/[0.04] border border-white/[0.08] shadow-2xl shadow-black/40 backdrop-blur-2xl p-8 md:p-10">
              <h2 className="text-white text-lg font-bold text-center mb-2">Welcome back</h2>
              <p className="text-white/50 text-sm text-center mb-8">Sign in to start auditing your apps</p>
              <button onClick={() => openSignIn()} className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-primary to-blue-600 text-white font-bold text-sm shadow-lg shadow-primary/25 hover:shadow-primary/40 hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center gap-2">
                <Lock className="w-4 h-4" /> Sign In
              </button>
              <div className="flex items-center gap-3 my-6">
                <div className="flex-1 h-px bg-white/[0.08]" />
                <span className="text-white/30 text-xs font-medium">OR</span>
                <div className="flex-1 h-px bg-white/[0.08]" />
              </div>
              <button onClick={() => openSignUp()} className="w-full py-3.5 rounded-2xl bg-white/[0.06] border border-white/[0.1] text-white font-bold text-sm hover:bg-white/[0.1] active:scale-[0.98] transition-all flex items-center justify-center gap-2">
                <Sparkles className="w-4 h-4 text-blue-400" /> Create Account
              </button>
            </motion.div>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }} className="mt-8 flex items-center justify-center gap-5 text-xs">
              <span className="flex items-center gap-1.5 text-white/40"><Lock className="w-3 h-3 text-green-400/70" /> Zero data storage</span>
              <span className="flex items-center gap-1.5 text-white/40"><Code2 className="w-3 h-3 text-blue-400/70" /> Open source</span>
            </motion.div>
          </div>
        </div>
      </SignedOut>

      {/* Animated Background */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:32px_32px]" />
        <motion.div
          animate={{ scale: [1, 1.2, 1], opacity: [0.15, 0.3, 0.15] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-[-15%] left-[-15%] w-[600px] h-[600px] bg-primary/20 rounded-full blur-[150px]"
        />
        <motion.div
          animate={{ scale: [1, 1.3, 1], opacity: [0.1, 0.25, 0.1] }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          className="absolute bottom-[-15%] right-[-15%] w-[700px] h-[700px] bg-blue-600/15 rounded-full blur-[150px]"
        />
        <motion.div
          animate={{ scale: [1, 1.4, 1], opacity: [0.05, 0.15, 0.05] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 4 }}
          className="absolute top-[40%] left-[50%] w-[400px] h-[400px] bg-green-500/10 rounded-full blur-[120px]"
        />
      </div>

      {/* Security Banner */}
      <div className="w-full bg-gradient-to-r from-green-500/10 via-primary/5 to-green-500/10 border-b border-green-500/10 text-center py-2.5 px-4 relative z-30 backdrop-blur-md">
        <p className="text-xs md:text-sm font-medium flex items-center justify-center gap-2">
          <Lock className="w-3.5 h-3.5 text-green-400" />
          <span className="text-green-400 font-semibold">Zero-Trust Architecture</span>
          <span className="text-muted-foreground hidden sm:inline">Your code never touches our servers. BYOK + ephemeral processing.</span>
        </p>
      </div>

      {/* Navigation */}
      <header className="w-full border-b border-white/5 bg-black/30 backdrop-blur-2xl relative z-30 sticky top-0">
        <div className="max-w-7xl mx-auto px-4 md:px-6 h-14 md:h-16 flex items-center justify-between">
          <Link href="https://gracias.sh" target="_blank" className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
            <div className="bg-gradient-to-br from-primary to-blue-500 w-8 h-8 rounded-xl flex items-center justify-center shadow-lg shadow-primary/25">
              <Apple className="w-4 h-4 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="text-base font-black text-white leading-tight">Gracias AI</span>
              <span className="text-[9px] font-medium text-muted-foreground leading-tight tracking-wider uppercase hidden sm:block">App Store Auditor</span>
            </div>
          </Link>

          <nav className="hidden lg:flex items-center gap-1">
            {['About', 'How it Works', 'Security'].map((item) => (
              <a key={item} href={`#${item.toLowerCase().replace(/\s+/g, '-')}`}
                className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-white hover:bg-white/5 rounded-lg transition-all">
                {item}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-2 md:gap-3">
            <Link
              href="https://github.com/atharvnaik1/GraciasAi-Appstore-Policy-Auditor-Opensource"
              target="_blank"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium text-white transition-all"
            >
              <Github className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">GitHub</span>
              {starCount !== null && starCount > 0 && (
                <>
                  <Star className="w-3 h-3 text-yellow-400" />
                  <span className="text-yellow-400">{starCount.toLocaleString()}</span>
                </>
              )}
            </Link>
            <SignedOut>
              <button
                onClick={() => openSignIn()}
                className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-primary to-blue-600 text-xs font-bold text-white hover:opacity-90 transition-opacity"
              >
                Sign In
              </button>
            </SignedOut>
            <SignedIn>
              <UserButton />
            </SignedIn>
          </div>
        </div>
      </header>

      <div className="relative z-10 max-w-6xl mx-auto px-4 md:px-6">
        <AnimatePresence mode="wait">
          {/* ═══════════════ IDLE / ERROR STATE ═══════════════ */}
          {(phase === 'idle' || phase === 'error') && (
            <motion.div
              key="idle"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5 }}
            >
              {/* Hero Section */}
              <div className="text-center pt-12 md:pt-20 pb-10 md:pb-16">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-xs font-semibold text-primary mb-6"
                >
                  <Zap className="w-3.5 h-3.5" />
                  AI-Powered Compliance Auditing for iOS
                </motion.div>

                <motion.h1
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="text-4xl md:text-6xl lg:text-7xl font-black tracking-tight mb-6 drop-shadow-[0_2px_10px_rgba(0,0,0,0.5)]"
                >
                  <span className="text-white">Audit Your iOS App</span>
                  <br />
                  <span className="text-white">Before </span>
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#a78bfa] via-[#818cf8] to-[#60a5fa] [-webkit-text-stroke:0.5px_rgba(255,255,255,0.1)]">Apple Does</span>
                </motion.h1>

                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="text-muted-foreground text-base md:text-xl max-w-2xl mx-auto leading-relaxed mb-4"
                >
                  Upload your iOS project and get a comprehensive audit against Apple&apos;s Review Guidelines.
                  Catch rejection risks before you submit.
                </motion.p>

                {/* Trust indicators */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className="flex items-center justify-center gap-6 text-xs text-muted-foreground mt-6"
                >
                  <span className="flex items-center gap-1.5"><Lock className="w-3 h-3 text-green-400" /> Zero data storage</span>
                  <span className="flex items-center gap-1.5"><Code2 className="w-3 h-3 text-blue-400" /> Open source</span>
                  <span className="flex items-center gap-1.5"><Clock className="w-3 h-3 text-amber-400" /> Results in ~60s</span>
                </motion.div>

                {/* AI Provider Logos */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                  className="mt-8 flex flex-col items-center gap-3"
                >
                  <span className="text-[11px] uppercase tracking-widest text-muted-foreground/60 font-medium">Powered by</span>
                  <div className="flex items-center justify-center gap-6 md:gap-8">
                    <img src="/logos/gemini.svg" alt="Gemini" className="h-7 w-7 opacity-60 hover:opacity-100 transition-opacity" draggable={false} />
                    <img src="/logos/openai.svg" alt="OpenAI" className="h-7 w-7 opacity-60 hover:opacity-100 transition-opacity" draggable={false} />
                    <img src="/logos/anthropic.svg" alt="Anthropic" className="h-7 w-7 opacity-60 hover:opacity-100 transition-opacity" draggable={false} />
                    <img src="/logos/openrouter.svg" alt="OpenRouter" className="h-7 w-7 opacity-60 hover:opacity-100 transition-opacity" draggable={false} />
                  </div>
                </motion.div>
              </div>

              {/* Main Audit Form */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="max-w-4xl mx-auto"
              >
                <div className="glassmorphism rounded-3xl p-6 md:p-8 border border-white/10 shadow-2xl shadow-primary/5">
                  <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                    {/* Upload Area — spans 3 cols */}
                    <div className="lg:col-span-3">
                      <div
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        onClick={() => fileInputRef.current?.click()}
                        className={`relative cursor-pointer rounded-2xl overflow-hidden transition-all duration-300 h-full min-h-[200px] md:min-h-[240px] flex flex-col items-center justify-center group border-2 border-dashed ${
                          isDragging
                            ? 'border-primary bg-primary/5'
                            : file
                              ? 'border-green-500/50 bg-green-500/5'
                              : 'border-white/10 hover:border-primary/30 hover:bg-white/[0.02]'
                        }`}
                      >
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept=".ipa"
                          onChange={handleFileSelect}
                          className="hidden"
                        />
                        <div className="p-6 flex flex-col items-center justify-center text-center w-full">
                          {file ? (
                            <motion.div
                              initial={{ scale: 0.9, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              className="flex flex-col items-center gap-3"
                            >
                              <div className="p-3 rounded-2xl bg-green-500/10 border border-green-500/20">
                                <FileArchive className="w-8 h-8 text-green-400" />
                              </div>
                              <div>
                                <p className="text-white font-semibold text-sm md:text-base break-all line-clamp-1 max-w-[280px]">{file.name}</p>
                                <p className="text-muted-foreground text-xs mt-1">{formatFileSize(file.size)}</p>
                              </div>
                              <button
                                onClick={(e) => { e.stopPropagation(); setFile(null); }}
                                className="px-3 py-1.5 text-xs font-medium text-red-400 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-lg transition-all flex items-center gap-1.5"
                              >
                                <XCircle className="w-3.5 h-3.5" /> Remove
                              </button>
                            </motion.div>
                          ) : (
                            <div className="flex flex-col items-center">
                              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 mb-4 group-hover:border-primary/20 group-hover:bg-primary/5 transition-all">
                                <Upload className="w-7 h-7 text-muted-foreground group-hover:text-primary transition-colors" />
                              </div>
                              <p className="text-white font-semibold text-sm md:text-base mb-1">
                                Drop your .ipa file here
                              </p>
                              <p className="text-muted-foreground text-xs mb-3">
                                <span className="text-primary">.ipa</span> files up to 150MB
                              </p>
                              <span className="text-[10px] text-muted-foreground/60 font-medium">
                                .swift, .m, .plist, .entitlements, .storyboard &amp; more
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Config Area — spans 2 cols */}
                    <div className="lg:col-span-2 flex flex-col gap-4">
                      {/* Provider + Model */}
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 mb-1">
                          <Cpu className="w-3.5 h-3.5 text-primary" />
                          <span className="text-xs font-semibold text-white">AI Provider</span>
                        </div>
                        <select
                          value={provider}
                          onChange={(e) => {
                            const p = e.target.value;
                            setProvider(p);
                            setModel(providerModels[p][0].value);
                          }}
                          className="w-full bg-white/5 border border-white/10 text-xs text-white font-medium px-3 py-2.5 rounded-xl outline-none focus:ring-1 focus:ring-primary/50 appearance-none cursor-pointer hover:bg-white/[0.08] transition-colors"
                          style={selectStyle}
                        >
                          <option value="anthropic">Anthropic (Claude)</option>
                          <option value="openai">OpenAI (GPT)</option>
                          <option value="gemini">Google Gemini</option>
                          <option value="openrouter">OpenRouter</option>
                        </select>
                        <select
                          value={model}
                          onChange={(e) => setModel(e.target.value)}
                          className="w-full bg-white/5 border border-white/10 text-xs text-muted-foreground font-medium px-3 py-2.5 rounded-xl outline-none focus:ring-1 focus:ring-blue-500/50 appearance-none cursor-pointer hover:bg-white/[0.08] transition-colors"
                          style={selectStyle}
                        >
                          {providerModels[provider]?.map((m) => (
                            <option key={m.value} value={m.value}>{m.label}</option>
                          ))}
                        </select>
                      </div>

                      {/* API Key */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Key className="w-3.5 h-3.5 text-amber-400" />
                          <span className="text-xs font-semibold text-white">API Key</span>
                        </div>
                        <div className="flex items-stretch gap-2">
                          <input
                            type={showApiKey ? 'text' : 'password'}
                            value={claudeApiKey}
                            onChange={(e) => setClaudeApiKey(e.target.value)}
                            placeholder={provider === 'gemini' ? 'AIzaSy...' : `sk-${provider === 'anthropic' ? 'ant-' : provider === 'openrouter' ? 'or-' : 'proj-'}...`}
                            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all font-mono"
                          />
                          {claudeApiKey && (
                            <button
                              type="button"
                              onClick={() => setShowApiKey(!showApiKey)}
                              className="px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-[10px] font-medium text-muted-foreground hover:text-white hover:bg-white/10 transition-colors shrink-0"
                            >
                              {showApiKey ? 'Hide' : 'Show'}
                            </button>
                          )}
                        </div>
                        <p className="text-[10px] text-muted-foreground/50 leading-tight">Stored locally in your browser. Never sent to our servers.</p>
                      </div>

                      {/* Context */}
                      <div className="flex-1 flex flex-col space-y-2">
                        <div className="flex items-center gap-2">
                          <Info className="w-3.5 h-3.5 text-blue-400" />
                          <span className="text-xs font-semibold text-white">Context <span className="text-muted-foreground font-normal">(optional)</span></span>
                        </div>
                        <textarea
                          value={context}
                          onChange={(e) => setContext(e.target.value)}
                          placeholder="e.g., Health & Fitness category, uses HealthKit, has auto-renewable subscriptions..."
                          className="w-full flex-1 min-h-[60px] bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all resize-none custom-scrollbar"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Error */}
                  <AnimatePresence>
                    {errorMessage && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden mt-4"
                      >
                        <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-3 flex items-center gap-3">
                          <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                          <p className="text-red-300 text-xs">{errorMessage}</p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Submit */}
                  <div className="mt-6">
                    <button
                      onClick={handleRunAudit}
                      disabled={!isReady}
                      className={`relative w-full py-3.5 md:py-4 rounded-2xl font-bold text-sm md:text-base flex items-center justify-center gap-2.5 transition-all duration-300 overflow-hidden ${
                        isReady
                          ? 'bg-gradient-to-r from-primary to-blue-600 text-white shadow-lg shadow-primary/25 hover:shadow-primary/40 hover:scale-[1.01] active:scale-[0.99]'
                          : 'bg-white/5 text-muted-foreground/50 cursor-not-allowed border border-white/5'
                      }`}
                    >
                      <ShieldCheck className="w-5 h-5" />
                      Run Compliance Audit
                    </button>
                  </div>
                </div>
              </motion.div>

              {/* Feature Cards */}
              <div id="about" className="mt-20 md:mt-28">
                <div className="text-center mb-12">
                  <h2 className="text-3xl md:text-4xl font-black text-white mb-3">Why Gracias AI?</h2>
                  <p className="text-muted-foreground text-sm md:text-base max-w-xl mx-auto">Stop guessing if your app will pass review. Get definitive answers before you submit.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-5">
                  {[
                    {
                      icon: <ShieldCheck className="w-5 h-5 text-primary" />,
                      iconBg: 'bg-primary/10 border-primary/20',
                      title: 'Full Guidelines Coverage',
                      desc: 'Checks all 6 major App Store Review Guideline categories: Safety, Performance, Business, Design, Legal & Privacy, and Technical.',
                    },
                    {
                      icon: <Zap className="w-5 h-5 text-amber-400" />,
                      iconBg: 'bg-amber-500/10 border-amber-500/20',
                      title: 'Real-Time Streaming',
                      desc: 'Watch your audit report generate live. Results stream in real-time so you can start reading while the analysis continues.',
                    },
                    {
                      icon: <Lock className="w-5 h-5 text-green-400" />,
                      iconBg: 'bg-green-500/10 border-green-500/20',
                      title: 'Zero Trust Security',
                      desc: 'Your code is processed in ephemeral temp storage and deleted immediately. API keys stay in your browser, never on our servers.',
                    },
                    {
                      icon: <Code2 className="w-5 h-5 text-blue-400" />,
                      iconBg: 'bg-blue-500/10 border-blue-500/20',
                      title: '100% Open Source',
                      desc: 'Every line of code is public on GitHub. Inspect exactly how your data is handled, or contribute improvements.',
                    },
                    {
                      icon: <Cpu className="w-5 h-5 text-purple-400" />,
                      iconBg: 'bg-purple-500/10 border-purple-500/20',
                      title: 'Multi-Provider BYOK',
                      desc: 'Bring your own key from Anthropic, OpenAI, Google Gemini, or OpenRouter. Choose the model that works best for you.',
                    },
                    {
                      icon: <FileText className="w-5 h-5 text-cyan-400" />,
                      iconBg: 'bg-cyan-500/10 border-cyan-500/20',
                      title: 'Actionable Reports',
                      desc: 'Get a prioritized remediation plan with severity ratings, exact file paths, and effort estimates. Export as PDF or Markdown.',
                    },
                  ].map((card, i) => (
                    <motion.div
                      key={card.title}
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.08 }}
                      className="p-5 md:p-6 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-white/10 hover:bg-white/[0.04] transition-all group"
                    >
                      <div className={`w-10 h-10 ${card.iconBg} border rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                        {card.icon}
                      </div>
                      <h3 className="text-white font-bold text-sm mb-2">{card.title}</h3>
                      <p className="text-muted-foreground text-xs leading-relaxed">{card.desc}</p>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* How it Works */}
              <div id="how-it-works" className="mt-20 md:mt-28">
                <div className="text-center mb-12">
                  <h2 className="text-3xl md:text-4xl font-black text-white mb-3">Three Steps to Compliance</h2>
                  <p className="text-muted-foreground text-sm md:text-base max-w-xl mx-auto">From upload to actionable results in under a minute.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {[
                    {
                      step: '01',
                      color: 'from-primary to-purple-600',
                      title: 'Upload Your Project',
                      desc: 'Drop your .ipa file and we extract all relevant iOS source files while skipping compiled binaries and build artifacts.',
                      icon: <Upload className="w-5 h-5" />,
                    },
                    {
                      step: '02',
                      color: 'from-blue-500 to-cyan-500',
                      title: 'AI Analyzes Your Code',
                      desc: 'Your code is sent directly to your chosen AI provider using your API key. We act as a secure passthrough, nothing stored.',
                      icon: <Cpu className="w-5 h-5" />,
                    },
                    {
                      step: '03',
                      color: 'from-green-500 to-emerald-500',
                      title: 'Get Your Audit Report',
                      desc: 'Receive a comprehensive compliance report with pass/fail indicators, severity ratings, and a prioritized fix list.',
                      icon: <CheckCircle className="w-5 h-5" />,
                    },
                  ].map((item, i) => (
                    <motion.div
                      key={item.step}
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.15 }}
                      className="relative p-6 md:p-8 rounded-2xl bg-white/[0.02] border border-white/5 overflow-hidden group hover:border-white/10 transition-all"
                    >
                      <div className="absolute top-4 right-4 text-5xl md:text-6xl font-black text-white/[0.03] group-hover:text-white/[0.06] transition-colors select-none">{item.step}</div>
                      <div className={`w-10 h-10 bg-gradient-to-br ${item.color} rounded-xl flex items-center justify-center mb-5 text-white shadow-lg`}>
                        {item.icon}
                      </div>
                      <h3 className="text-white font-bold text-base mb-2">{item.title}</h3>
                      <p className="text-muted-foreground text-sm leading-relaxed">{item.desc}</p>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Security Section */}
              <div id="security" className="mt-20 md:mt-28 mb-16">
                <div className="rounded-3xl border border-white/5 bg-gradient-to-br from-green-500/5 via-transparent to-primary/5 p-8 md:p-12 overflow-hidden relative">
                  <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-green-500/30 to-transparent" />

                  <div className="flex flex-col md:flex-row items-center gap-8 md:gap-12">
                    <div className="shrink-0">
                      <div className="relative">
                        <div className="absolute inset-0 bg-green-500/20 blur-[50px] rounded-full" />
                        <div className="w-28 h-28 md:w-36 md:h-36 border border-green-500/20 bg-black/50 rounded-full flex items-center justify-center relative backdrop-blur-md">
                          <ShieldCheck className="w-14 h-14 md:w-18 md:h-18 text-green-400" />
                        </div>
                      </div>
                    </div>

                    <div>
                      <h2 className="text-2xl md:text-3xl font-black text-white mb-4">Enterprise-Grade Security</h2>
                      <p className="text-muted-foreground text-sm md:text-base mb-6 leading-relaxed max-w-2xl">
                        Your source code is your most valuable IP. Every architectural decision we made prioritizes your security.
                      </p>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        {[
                          { title: 'No Cloud Storage', desc: 'Files are processed in ephemeral temp directories and deleted immediately after audit.' },
                          { title: 'Bring Your Own Key', desc: 'Your API key goes directly to your AI provider. We never store or log it.' },
                          { title: 'Fully Auditable', desc: 'Read every line of our open-source code on GitHub. Full transparency.' },
                        ].map((item) => (
                          <div key={item.title} className="flex gap-3">
                            <CheckCircle className="w-4 h-4 text-green-400 shrink-0 mt-0.5" />
                            <div>
                              <p className="text-white text-sm font-semibold mb-1">{item.title}</p>
                              <p className="text-muted-foreground text-xs leading-relaxed">{item.desc}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <footer className="border-t border-white/5 py-8 md:py-10">
                <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <Link href="https://gracias.sh" target="_blank" className="flex items-center gap-2 text-sm font-bold text-white hover:opacity-80 transition-opacity">
                      <div className="bg-gradient-to-br from-primary to-blue-600 w-5 h-5 rounded flex items-center justify-center">
                        <Apple className="w-2.5 h-2.5 text-white" />
                      </div>
                      Gracias AI
                    </Link>
                    <span className="text-xs text-muted-foreground">&copy; {new Date().getFullYear()}</span>
                    {visitorCount !== null && (
                      <span className="text-xs text-muted-foreground">{visitorCount.toLocaleString()} visitors</span>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <a href="https://gracias.sh/privacy" className="hover:text-white transition-colors">Privacy</a>
                    <a href="https://gracias.sh/about" className="hover:text-white transition-colors">About</a>
                    <a href="mailto:hello@gracias.sh" className="hover:text-white transition-colors">Contact</a>
                    <a href="https://github.com/atharvnaik1/GraciasAi-Appstore-Policy-Auditor-Opensource" className="flex items-center gap-1 hover:text-white transition-colors">
                      Source <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              </footer>
            </motion.div>
          )}

          {/* ═══════════════ ANALYZING STATE ═══════════════ */}
          {(phase === 'uploading' || phase === 'analyzing') && (
            <motion.div
              key="analyzing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="max-w-4xl mx-auto py-12 md:py-16"
            >
              <div className="glassmorphism rounded-3xl p-8 md:p-12 relative overflow-hidden border border-white/10">
                {/* Pulse rings */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-15">
                  <motion.div animate={{ scale: [1, 3], opacity: [0.5, 0] }} transition={{ duration: 3, repeat: Infinity }} className="absolute w-20 h-20 border border-primary rounded-full" />
                  <motion.div animate={{ scale: [1, 3], opacity: [0.5, 0] }} transition={{ duration: 3, repeat: Infinity, delay: 1 }} className="absolute w-20 h-20 border border-blue-500 rounded-full" />
                  <motion.div animate={{ scale: [1, 3], opacity: [0.5, 0] }} transition={{ duration: 3, repeat: Infinity, delay: 2 }} className="absolute w-20 h-20 border border-green-500 rounded-full" />
                </div>

                <div className="relative z-10 flex flex-col items-center text-center">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
                    className="p-4 rounded-full bg-gradient-to-tr from-primary/20 to-blue-500/20 border border-white/10 shadow-lg shadow-primary/20 mb-8"
                  >
                    <Loader2 className="w-10 h-10 text-white" />
                  </motion.div>

                  <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">
                    {phase === 'uploading' ? 'Extracting Bundle' : 'Analyzing Your Code'}
                  </h2>

                  <AnimatePresence mode="wait">
                    <motion.p
                      key={phase + filesScanned}
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -5 }}
                      className="text-muted-foreground text-sm md:text-base mb-8"
                    >
                      {phase === 'uploading'
                        ? 'Decompressing and parsing source files...'
                        : filesScanned > 0
                          ? `Auditing ${filesScanned} source files against App Store guidelines...`
                          : 'Establishing context window...'}
                    </motion.p>
                  </AnimatePresence>

                  {/* Progress bar */}
                  <div className="w-full max-w-sm mb-6">
                    <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full w-1/3 bg-gradient-to-r from-primary to-blue-400 rounded-full"
                        animate={{ x: ['-100%', '300%'] }}
                        transition={{ duration: 2, ease: "easeInOut", repeat: Infinity }}
                      />
                    </div>
                  </div>

                  {/* File list */}
                  {filesScanned > 0 && (
                    <div className="w-full max-w-sm">
                      <button
                        onClick={() => setShowFileList(!showFileList)}
                        className="w-full py-2 px-3 rounded-xl bg-white/5 hover:bg-white/[0.08] border border-white/5 text-xs font-medium text-muted-foreground hover:text-white transition-all flex items-center justify-between"
                      >
                        <span className="flex items-center gap-2">
                          <FileText className="w-3.5 h-3.5 text-primary" />
                          {filesScanned} files queued
                        </span>
                        <motion.div animate={{ rotate: showFileList ? 180 : 0 }}>
                          <ChevronDown className="w-3.5 h-3.5" />
                        </motion.div>
                      </button>

                      <AnimatePresence>
                        {showFileList && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1, marginTop: 8 }}
                            exit={{ height: 0, opacity: 0, marginTop: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="max-h-40 overflow-y-auto bg-black/40 border border-white/5 rounded-xl p-3 custom-scrollbar text-left">
                              {fileNames.map((name, i) => (
                                <div key={i} className="text-[10px] text-muted-foreground font-mono py-1 flex items-center gap-2 border-b border-white/[0.03] last:border-0">
                                  <div className="w-1 h-1 rounded-full bg-primary/50 shrink-0" />
                                  <span className="truncate">{name}</span>
                                </div>
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )}
                </div>
              </div>

              {/* Live streaming preview */}
              {reportContent && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-6 glassmorphism rounded-2xl overflow-hidden border border-primary/20"
                >
                  <div className="px-4 py-3 border-b border-white/10 bg-black/40 flex items-center gap-2.5 sticky top-0 z-20">
                    <div className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
                    </div>
                    <span className="text-xs font-semibold text-white/70 uppercase tracking-wider">Live Stream</span>
                  </div>
                  <div ref={reportRef} className="p-5 md:p-8 max-h-[400px] overflow-y-auto custom-scrollbar bg-black/20">
                    <div className="prose prose-invert max-w-none text-xs md:text-sm leading-relaxed">
                      <ReactMarkdown>{reportContent}</ReactMarkdown>
                    </div>
                  </div>
                </motion.div>
              )}
            </motion.div>
          )}

          {/* ═══════════════ COMPLETE STATE ═══════════════ */}
          {phase === 'complete' && reportContent && (
            <motion.div
              key="complete"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="py-8 md:py-12 space-y-6"
            >
              {/* Status bar */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-2xl bg-green-500/5 border border-green-500/20">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-green-500/15 border border-green-500/20">
                    <CheckCircle className="w-5 h-5 text-green-400" />
                  </div>
                  <div>
                    <h3 className="text-white font-bold text-sm">Audit Complete</h3>
                    <p className="text-muted-foreground text-xs">{filesScanned} files analyzed</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    onClick={handleExportReport}
                    className="flex-1 sm:flex-none px-4 py-2.5 bg-white text-black hover:bg-gray-100 font-semibold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all"
                  >
                    <Download className="w-3.5 h-3.5" /> Markdown
                  </button>
                  <button
                    onClick={handleExportPdf}
                    className="flex-1 sm:flex-none px-4 py-2.5 bg-blue-600 text-white hover:bg-blue-700 font-semibold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all"
                  >
                    <FileText className="w-3.5 h-3.5" /> PDF
                  </button>
                  <button
                    onClick={() => { setPhase('idle'); setReportContent(''); setFile(null); }}
                    className="flex-1 sm:flex-none px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-semibold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" /> New Audit
                  </button>
                </div>
              </div>

              {/* Report */}
              <div className="rounded-2xl overflow-hidden border border-white/10 bg-black/30">
                <div className="px-5 md:px-8 py-3 border-b border-white/10 bg-black/50 sticky top-0 z-20 backdrop-blur-xl">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="bg-gradient-to-br from-primary to-blue-500 w-6 h-6 rounded-lg flex items-center justify-center">
                        <Apple className="w-3 h-3 text-white" />
                      </div>
                      <span className="text-sm font-bold text-white">Gracias AI</span>
                      <span className="text-[10px] text-muted-foreground font-medium hidden sm:inline">Compliance Report</span>
                    </div>
                    <span className="text-[10px] text-muted-foreground font-medium">
                      {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-2 pt-2 border-t border-white/5">
                    <a href="https://www.producthunt.com/posts/gracias-ai" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-[10px] text-orange-400/80 hover:text-orange-400 font-medium transition-colors">
                      <Zap className="w-3 h-3" /> Product Hunt
                    </a>
                    <a href="mailto:business@gracias.sh" className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-white font-medium transition-colors">
                      <Mail className="w-3 h-3" /> business@gracias.sh
                    </a>
                    <a href="https://github.com/atharvnaik1/GraciasAi-Appstore-Policy-Auditor-Opensource" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-white font-medium transition-colors">
                      <Github className="w-3 h-3" /> Source
                    </a>
                  </div>
                </div>

                <div className="p-5 md:p-10 overflow-y-auto max-h-[75vh] custom-scrollbar">
                  <div ref={completeReportRef} className="prose prose-invert max-w-none text-sm md:text-base leading-relaxed prose-headings:text-foreground prose-p:text-muted-foreground prose-p:leading-relaxed prose-li:text-muted-foreground prose-li:my-1 prose-strong:text-white prose-strong:font-bold prose-a:text-primary prose-a:transition-colors prose-code:text-primary prose-code:bg-primary/10 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md prose-code:font-mono prose-code:text-xs prose-code:border prose-code:border-primary/20 prose-pre:bg-black/50 prose-pre:border prose-pre:border-white/10 prose-pre:rounded-xl prose-pre:p-4">
                    <ReactMarkdown>{reportContent}</ReactMarkdown>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

    </main>
  );
}
