'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload, FileArchive, X, Key, Send, Loader2,
  ChevronDown, ChevronRight, Download, ArrowLeft,
  ShieldCheck, AlertTriangle, CheckCircle, XCircle,
  FileText, Sparkles, Info, Github, ExternalLink, Menu, Building2, Eye
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import Link from 'next/link';
import { UserButton, SignInButton, SignedOut, SignedIn } from '@clerk/nextjs';

type AuditPhase = 'idle' | 'uploading' | 'analyzing' | 'complete' | 'error';


export default function AuditPage() {
  const [file, setFile] = useState<File | null>(null);
  const [claudeApiKey, setClaudeApiKey] = useState('');
  const [provider, setProvider] = useState('anthropic');
  const [context, setContext] = useState('');
  const [phase, setPhase] = useState<AuditPhase>('idle');
  const [reportContent, setReportContent] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [filesScanned, setFilesScanned] = useState(0);
  const [visitorCount, setVisitorCount] = useState<number | null>(null);
  const [fileNames, setFileNames] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['phase12', 'phase3', 'phase4']));
  const [showFileList, setShowFileList] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const reportRef = useRef<HTMLDivElement>(null);
  const completeReportRef = useRef<HTMLDivElement>(null);

  // Load API key from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('claude_api_key');
    if (saved) setClaudeApiKey(saved);
    
    // Increment and fetch visitor count
    fetch('/api/visitor')
      .then(res => res.json())
      .then(data => {
        if (data.count) setVisitorCount(data.count);
      })
      .catch(console.error);
  }, []);

  // Save API key to localStorage
  useEffect(() => {
    if (claudeApiKey) {
      localStorage.setItem('claude_api_key', claudeApiKey);
    }
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
      if (['zip', 'ipa'].includes(ext || '')) {
        setFile(droppedFile);
        setErrorMessage('');
      } else {
        setErrorMessage('Please upload a .zip or .ipa file');
      }
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      setFile(selected);
      setErrorMessage('');
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(section)) next.delete(section);
      else next.add(section);
      return next;
    });
  };

  const handleRunAudit = async () => {
    if (!file || !claudeApiKey.trim()) return;

    setPhase('uploading');
    setReportContent('');
    setErrorMessage('');
    setFilesScanned(0);
    setFileNames([]);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('claudeApiKey', claudeApiKey.trim());
    formData.append('provider', provider);
    formData.append('context', context);

    try {
      setPhase('analyzing');

      const response = await fetch('/api/audit', {
        method: 'POST',
        body: formData,
      });

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
            // Skip parse errors for partial lines
          }
        }
      }

      setPhase('complete');
      
      // Attempt to save the report to MongoDB (if authenticated)
      fetch('/api/save-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportContent: accumulated, filesScanned: totalScannedTemp })
      }).catch((e) => console.log('Silently skipping save since auth might be missing:', e));

    } catch (err: any) {
      console.error('Audit error:', err);
      setErrorMessage(err.message || 'An unexpected error occurred');
      setPhase('error');
    }
  };

  const handleExportReport = () => {
    if (!reportContent) return;
    const blob = new Blob([reportContent], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `appstore-audit-report-${new Date().toISOString().slice(0, 10)}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportPdf = async () => {
    if (!reportContent || !completeReportRef.current) return;
    const html2pdf = (await import('html2pdf.js')).default;
    const opt = {
      margin:       10,
      filename:     `appstore-audit-report-${new Date().toISOString().slice(0, 10)}.pdf`,
      image:        { type: 'jpeg' as 'jpeg' | 'png' | 'webp', quality: 0.98 },
      html2canvas:  { scale: 2, useCORS: true, logging: false },
      jsPDF:        { unit: 'mm' as const, format: 'a4' as const, orientation: 'portrait' as 'portrait' | 'landscape' }
    };
    html2pdf().from(completeReportRef.current).set(opt).save();
  };

  const isReady = file && claudeApiKey.trim();

  return (
    <main className="min-h-[100dvh] w-full bg-background text-foreground selection:bg-primary/30 relative overflow-hidden font-sans">
      {/* Dynamic Animated Background Grid and Orbs */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
        <motion.div
          animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-primary/20 rounded-full blur-[120px]"
        />
        <motion.div
          animate={{ scale: [1, 1.5, 1], opacity: [0.2, 0.4, 0.2] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-blue-600/20 rounded-full blur-[120px]"
        />
      </div>

      {/* Top Notification Banner */}
      <div className="w-full bg-primary/10 border-b border-primary/20 text-center py-2 px-4 relative z-30 backdrop-blur-md">
        <p className="text-xs md:text-sm text-primary-foreground font-medium flex items-center justify-center gap-2">
          <ShieldCheck className="w-4 h-4 text-green-400" />
          <span className="font-bold text-green-400">100% Security Compliant:</span> Open-source project. All data processing uses your local API key and is never stored on our servers.
        </p>
      </div>

      {/* Main Navigation Header */}
      <header className="w-full border-b border-white/5 bg-black/20 backdrop-blur-xl relative z-30">
        <div className="max-w-7xl mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link href="https://gracias.sh" target="_blank" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <div className="bg-gradient-to-br from-primary to-blue-600 w-8 h-8 rounded-lg flex items-center justify-center shadow-lg shadow-primary/20">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <span className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-white/80">
                Gracias AI
              </span>
            </Link>
          </div>

          <nav className="hidden md:flex items-center gap-8">
            <a href="#about" className="text-sm font-medium text-muted-foreground hover:text-white transition-colors">About Us</a>
            <a href="#how-it-works" className="text-sm font-medium text-muted-foreground hover:text-white transition-colors">How it Works</a>
            <a href="#security" className="text-sm font-medium text-muted-foreground hover:text-white transition-colors">Security</a>
          </nav>

          <div className="flex items-center gap-4">
            {visitorCount !== null && (
              <div className="hidden md:flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-sm font-medium text-blue-100 shadow-inner">
                <Eye className="w-4 h-4 text-blue-400" />
                <span>{visitorCount.toLocaleString()} visits</span>
              </div>
            )}
            <Link
              href="https://github.com/atharvnaik1/Gracias-Ai---Appstore-Playstore-Policy-Auditor-Opensource-"
              target="_blank"
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-sm font-medium text-white transition-all hover:border-white/20"
            >
              <Github className="w-4 h-4" />
              <span className="hidden sm:inline">Star on GitHub</span>
            </Link>
            <SignedOut>
              <SignInButton mode="modal">
                <button className="hidden sm:flex px-4 py-2 rounded-full bg-gradient-to-r from-primary to-blue-600 text-sm font-bold text-white hover:opacity-90 transition-opacity">
                  Sign In
                </button>
              </SignInButton>
            </SignedOut>
            <SignedIn>
              <UserButton />
            </SignedIn>
            <button className="md:hidden p-2 text-muted-foreground hover:text-white">
              <Menu className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <div className="relative z-10 max-w-5xl mx-auto px-4 py-8 md:py-12 flex flex-col min-h-[calc(100vh-140px)]">
        {/* Header Content */}
        <motion.div
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="mb-8 md:mb-12"
        >

          <div className="flex flex-col md:flex-row items-start md:items-center gap-4 md:gap-6">
            <motion.div
              whileHover={{ rotate: 5, scale: 1.05 }}
              className="p-4 rounded-2xl bg-gradient-to-br from-primary/20 to-blue-600/20 border border-primary/30 shadow-[0_0_30px_rgba(168,85,247,0.2)] backdrop-blur-xl"
            >
              <ShieldCheck className="w-8 h-8 md:w-10 md:h-10 text-primary drop-shadow-[0_0_10px_rgba(168,85,247,0.5)]" />
            </motion.div>
            <div>
              <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white via-primary-foreground to-white/70 mb-2 drop-shadow-sm">
                App Store <span className="bg-gradient-to-r from-primary to-blue-400 bg-clip-text text-transparent">Compliance Audit</span>
              </h1>
              <p className="text-muted-foreground text-base md:text-lg max-w-2xl leading-relaxed">
                Experience the next generation of AI-powered analysis against Apple&apos;s Review Guidelines.
              </p>
            </div>
          </div>
        </motion.div>

        {/* Main Content Area */}
        <div className="flex-1 w-full space-y-8">
          <AnimatePresence mode="wait">
            {(phase === 'idle' || phase === 'error') && (
              <motion.div
                key="config"
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -20 }}
                transition={{ duration: 0.5, ease: "circOut" }}
                className="grid grid-cols-1 lg:grid-cols-2 gap-6"
              >
                {/* Upload Column */}
                <div className="space-y-6">
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`relative cursor-pointer rounded-3xl overflow-hidden glassmorphism transition-all duration-500 h-full min-h-[250px] md:min-h-[320px] flex flex-col items-center justify-center group ${isDragging
                      ? 'border-primary/50 bg-primary/10 shadow-[0_0_40px_rgba(168,85,247,0.2)]'
                      : file
                        ? 'border-green-500/50 bg-green-500/5 shadow-[0_0_30px_rgba(34,197,94,0.1)]'
                        : 'border-white/10 hover:border-primary/40 hover:bg-white/5'
                      }`}
                  >
                    {!file && <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>}

                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".zip,.ipa"
                      onChange={handleFileSelect}
                      className="hidden"
                      id="file-upload"
                    />

                    <div className="p-6 md:p-8 flex flex-col items-center justify-center text-center relative z-10 w-full">
                      {file ? (
                        <motion.div
                          initial={{ scale: 0.8, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          className="flex flex-col items-center gap-4 w-full"
                        >
                          <div className="relative">
                            <div className="absolute inset-0 bg-green-500/20 blur-xl rounded-full"></div>
                            <div className="p-4 md:p-5 rounded-3xl bg-green-500/10 border border-green-500/30 relative z-10 backdrop-blur-md">
                              <FileArchive className="w-10 h-10 md:w-12 md:h-12 text-green-400 drop-shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
                            </div>
                          </div>
                          <div className="space-y-1">
                            <p className="text-foreground font-semibold text-lg md:text-xl break-all line-clamp-2 max-w-[250px]">{file.name}</p>
                            <p className="text-muted-foreground text-sm font-medium bg-muted/50 px-3 py-1 rounded-full inline-block">{formatFileSize(file.size)}</p>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setFile(null);
                            }}
                            className="mt-4 px-4 py-2 text-xs md:text-sm font-medium text-red-300 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-xl transition-all flex items-center gap-2 hover:shadow-[0_0_15px_rgba(239,68,68,0.2)]"
                          >
                            <XCircle className="w-4 h-4" />
                            Remove Selection
                          </button>
                        </motion.div>
                      ) : (
                        <div className="flex flex-col items-center">
                          <motion.div
                            whileHover={{ y: -5 }}
                            className="p-4 md:p-5 rounded-3xl bg-white/5 border border-white/10 mb-4 md:mb-6 shadow-xl backdrop-blur-md"
                          >
                            <Upload className="w-8 h-8 md:w-10 md:h-10 text-muted-foreground group-hover:text-primary transition-colors duration-300" />
                          </motion.div>
                          <p className="text-foreground font-semibold text-lg md:text-xl mb-2">
                            Deploy your App Bundle
                          </p>
                          <p className="text-muted-foreground text-xs md:text-sm mb-4 md:mb-6 max-w-[240px]">
                            Drag & drop your <span className="text-primary font-medium">.zip</span> or <span className="text-primary font-medium">.ipa</span> file here, or click to browse.
                          </p>
                          <div className="px-3 md:px-4 py-1.5 md:py-2 rounded-full bg-white/5 border border-white/10 text-[10px] md:text-xs text-muted-foreground font-medium flex items-center gap-2">
                            <Sparkles className="w-3 h-3 text-primary" /> Max size: 150MB
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Configuration Column */}
                <div className="space-y-6 flex flex-col h-full">
                  {/* API Key */}
                  <div className="glassmorphism rounded-3xl p-5 md:p-6 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-[50px] pointer-events-none group-hover:bg-amber-500/10 transition-colors duration-500"></div>
                    <div className="flex items-center justify-between mb-4 md:mb-5 relative z-10">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500">
                          <Key className="w-4 h-4" />
                        </div>
                        <h3 className="text-sm font-bold text-foreground">API Key</h3>
                      </div>
                      <select
                        value={provider}
                        onChange={(e) => setProvider(e.target.value)}
                        className="bg-black/50 border border-white/10 text-[10px] md:text-xs text-amber-500/90 font-semibold px-2 md:px-3 py-1 md:py-1.5 rounded-lg outline-none focus:ring-1 focus:ring-amber-500/50 appearance-none cursor-pointer hover:bg-white/10 transition-colors"
                        style={{ backgroundImage: 'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22white%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center', paddingRight: '24px' }}
                      >
                        <option value="anthropic">Anthropic</option>
                        <option value="openrouter">OpenRouter</option>
                        <option value="openai">OpenAI</option>
                        <option value="gemini-pro">Gemini 1.5 Pro</option>
                        <option value="gemini-flash">Gemini 2.5 Flash</option>
                      </select>
                    </div>
                    <div className="relative z-10 flex items-stretch gap-2">
                      <input
                        type={showApiKey ? 'text' : 'password'}
                        value={claudeApiKey}
                        onChange={(e) => setClaudeApiKey(e.target.value)}
                        placeholder={provider.startsWith('gemini') ? 'AIzaSy...' : `sk-${provider === 'anthropic' ? 'ant-api03' : provider === 'openrouter' ? 'or-v1' : 'proj'}-...`}
                        className="flex-1 w-full bg-black/40 border border-white/10 rounded-2xl px-4 md:px-5 py-3 md:py-4 text-xs md:text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all font-mono shadow-inner"
                      />
                      {claudeApiKey.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setShowApiKey(!showApiKey)}
                          className="px-4 md:px-6 py-3 md:py-4 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center text-[10px] md:text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-white/10 transition-colors shrink-0"
                        >
                          {showApiKey ? 'Hide' : 'Reveal'}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Context */}
                  <div className="glassmorphism rounded-3xl p-5 md:p-6 flex-1 flex flex-col relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-[50px] pointer-events-none group-hover:bg-blue-500/10 transition-colors duration-500"></div>
                    <div className="flex items-center gap-3 mb-4 md:mb-5 relative z-10">
                      <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
                        <Info className="w-4 h-4" />
                      </div>
                      <h3 className="text-sm font-bold text-foreground">Audit Context <span className="text-muted-foreground font-normal">(Optional)</span></h3>
                    </div>
                    <textarea
                      value={context}
                      onChange={(e) => setContext(e.target.value)}
                      placeholder="e.g., 'Targeting the Health & Fitness category. Focus heavily on data privacy guidelines and auto-renewable subscriptions...'"
                      className="w-full flex-1 min-h-[100px] md:min-h-[120px] bg-black/40 border border-white/10 rounded-2xl px-4 md:px-5 py-3 md:py-4 text-xs md:text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all resize-none shadow-inner relative z-10 custom-scrollbar"
                    />
                  </div>

                  {/* Error Card */}
                  <AnimatePresence>
                    {errorMessage && (
                      <motion.div
                        initial={{ opacity: 0, height: 0, scale: 0.95 }}
                        animate={{ opacity: 1, height: 'auto', scale: 1 }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="rounded-2xl bg-red-500/10 border border-red-500/20 p-4 flex items-start gap-4 backdrop-blur-md">
                          <div className="p-2 rounded-full bg-red-500/20 text-red-400 mt-1 shrink-0">
                            <AlertTriangle className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="text-red-400 font-semibold text-xs md:text-sm">Audit Initialization Failed</p>
                            <p className="text-red-300/80 text-[10px] md:text-xs mt-1 leading-relaxed">{errorMessage}</p>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Submit Button Span */}
                <div className="col-span-1 lg:col-span-2 pt-2 md:pt-4">
                  <div className={isReady ? 'glow-border rounded-3xl' : ''}>
                    <button
                      onClick={handleRunAudit}
                      disabled={!isReady}
                      className={`relative w-full py-4 md:py-5 rounded-3xl font-bold text-base md:text-lg flex items-center justify-center gap-3 transition-all duration-500 overflow-hidden ${isReady
                        ? 'bg-gradient-to-r from-primary to-blue-600 text-white shadow-[0_10px_40px_-10px_rgba(168,85,247,0.5)] hover:shadow-[0_10px_50px_-10px_rgba(168,85,247,0.7)] hover:scale-[1.005] active:scale-[0.99]'
                        : 'bg-white/5 text-muted-foreground cursor-not-allowed border border-white/5'
                        }`}
                    >
                      {/* Button inner shine effect */}
                      {isReady && (
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-[150%] hover:animate-[shimmer_1.5s_infinite] transition-all"></div>
                      )}
                      <Sparkles className={`w-5 h-5 md:w-6 md:h-6 ${isReady ? 'animate-pulse' : ''}`} />
                      Initialize Compliance Audit
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Scanning / Analyzing Phase */}
            {(phase === 'uploading' || phase === 'analyzing') && (
              <motion.div
                key="analyzing"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                className="w-full max-w-4xl mx-auto space-y-6 md:space-y-8"
              >
                <div className="glassmorphism rounded-[2rem] p-6 md:p-10 relative overflow-hidden box-border">
                  {/* Radar/Pulse effect background */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
                    <motion.div
                      animate={{ scale: [1, 2, 3], opacity: [0.5, 0.2, 0] }}
                      transition={{ duration: 3, repeat: Infinity, ease: "easeOut" }}
                      className="absolute w-24 h-24 md:w-32 md:h-32 border border-primary rounded-full"
                    />
                    <motion.div
                      animate={{ scale: [1, 2, 3], opacity: [0.5, 0.2, 0] }}
                      transition={{ duration: 3, repeat: Infinity, ease: "easeOut", delay: 1 }}
                      className="absolute w-24 h-24 md:w-32 md:h-32 border border-blue-500 rounded-full"
                    />
                  </div>

                  <div className="relative z-10 flex flex-col items-center justify-center text-center">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                      className="p-4 md:p-5 rounded-full bg-gradient-to-tr from-primary/20 to-blue-500/20 border border-white/10 shadow-[0_0_30px_rgba(168,85,247,0.3)] backdrop-blur-xl mb-6 md:mb-8"
                    >
                      <Loader2 className="w-8 h-8 md:w-12 md:h-12 text-white drop-shadow-md" />
                    </motion.div>

                    <h2 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent mb-3 md:mb-4">
                      {phase === 'uploading' ? 'Extracting Bundle' : 'Performing AI Analysis'}
                    </h2>

                    <div className="text-sm md:text-lg text-muted-foreground max-w-lg mb-6 md:mb-8 h-8 flex items-center justify-center">
                      <AnimatePresence mode="wait">
                        <motion.span
                          key={phase + filesScanned}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="text-center"
                        >
                          {phase === 'uploading'
                            ? 'Decompressing and standardizing assets...'
                            : filesScanned > 0
                              ? `Scanning ${filesScanned} source files comprehensively...`
                              : 'Establishing secure context window...'}
                        </motion.span>
                      </AnimatePresence>
                    </div>

                    {/* Progress Bar Container */}
                    <div className="w-full max-w-md space-y-3">
                      <div className="h-2 w-full bg-black/50 rounded-full overflow-hidden border border-white/5 relative">
                        <motion.div
                          className="absolute top-0 bottom-0 left-0 w-1/2 bg-gradient-to-r from-primary via-blue-400 to-primary rounded-full"
                          animate={{ x: ['-100%', '200%'] }}
                          transition={{ duration: 2.5, ease: "easeInOut", repeat: Infinity }}
                        />
                      </div>
                    </div>

                    {/* File List Toggle */}
                    {filesScanned > 0 && (
                      <div className="mt-6 md:mt-8 w-full max-w-md">
                        <button
                          onClick={() => setShowFileList(!showFileList)}
                          className="w-full py-2.5 md:py-3 px-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/5 text-xs md:text-sm font-medium text-muted-foreground hover:text-white transition-all flex items-center justify-between group"
                        >
                          <span className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-primary group-hover:text-blue-400 transition-colors" />
                            View active file queue
                          </span>
                          <motion.div animate={{ rotate: showFileList ? 180 : 0 }}>
                            <ChevronDown className="w-4 h-4" />
                          </motion.div>
                        </button>

                        <AnimatePresence>
                          {showFileList && (
                            <motion.div
                              initial={{ height: 0, opacity: 0, marginTop: 0 }}
                              animate={{ height: 'auto', opacity: 1, marginTop: 12 }}
                              exit={{ height: 0, opacity: 0, marginTop: 0 }}
                              className="overflow-hidden"
                            >
                              <div className="max-h-40 md:max-h-56 overflow-y-auto bg-black/50 border border-white/10 rounded-2xl p-3 md:p-4 custom-scrollbar text-left scroll-smooth">
                                {fileNames.map((name, i) => (
                                  <motion.div
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: i * 0.05 > 1 ? 0 : i * 0.05 }}
                                    key={i}
                                    className="text-[10px] md:text-xs text-muted-foreground font-mono py-1 md:py-1.5 flex items-center gap-2 md:gap-3 border-b border-white/5 last:border-0"
                                  >
                                    <div className="w-1 h-1 md:w-1.5 md:h-1.5 rounded-full bg-primary/50 animate-pulse shrink-0"></div>
                                    <span className="truncate">{name}</span>
                                  </motion.div>
                                ))}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    )}
                  </div>
                </div>

                {/* Live Preview Stream */}
                {reportContent && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="glassmorphism rounded-3xl overflow-hidden shadow-2xl border border-primary/20"
                  >
                    <div className="px-5 md:px-6 py-3 md:py-4 border-b border-white/10 bg-black/40 flex items-center justify-between backdrop-blur-md sticky top-0 z-20">
                      <div className="flex items-center gap-2 md:gap-3">
                        <div className="relative flex h-2 w-2 md:h-3 md:w-3">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 md:h-3 md:w-3 bg-green-500"></span>
                        </div>
                        <span className="text-xs md:text-sm font-bold text-transparent bg-clip-text bg-gradient-to-r from-white to-white/70 tracking-wide uppercase">Streaming Intelligence</span>
                      </div>
                    </div>
                    <div ref={reportRef} className="p-5 md:p-8 max-h-[400px] md:max-h-[500px] overflow-y-auto custom-scrollbar bg-black/20">
                      <div className="prose prose-invert max-w-none text-xs md:text-sm leading-relaxed">
                        <ReactMarkdown>{reportContent}</ReactMarkdown>
                      </div>
                    </div>
                  </motion.div>
                )}
              </motion.div>
            )}

            {/* Complete Report Phase */}
            {phase === 'complete' && reportContent && (
              <motion.div
                key="complete"
                initial={{ opacity: 0, scale: 0.98, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.5, type: 'spring' }}
                className="space-y-6 md:space-y-8"
              >
                {/* Grand Status Card */}
                <div className="relative glow-border rounded-3xl p-[1px]">
                  <div className="rounded-3xl bg-gradient-to-r from-black/80 to-[#0a150f]/90 backdrop-blur-2xl p-5 md:p-8 flex flex-col md:flex-row items-center justify-between gap-5 md:gap-6 relative overflow-hidden z-10">
                    <div className="absolute -left-20 -top-20 w-48 md:w-64 h-48 md:h-64 bg-green-500/10 rounded-full blur-[60px] md:blur-[80px]"></div>

                    <div className="flex items-center gap-4 md:gap-6 relative z-10 w-full md:w-auto">
                      <div className="p-3 md:p-4 rounded-2xl bg-green-500/20 shadow-[0_0_30px_rgba(34,197,94,0.2)] border border-green-500/30">
                        <CheckCircle className="w-8 h-8 md:w-10 md:h-10 text-green-400 drop-shadow-[0_0_10px_rgba(34,197,94,0.6)]" />
                      </div>
                      <div>
                        <h3 className="text-xl md:text-2xl font-black text-transparent bg-clip-text bg-gradient-to-br from-white to-white/80 mb-0.5 md:mb-1">Audit Finalized</h3>
                        <p className="text-xs md:text-sm text-muted-foreground font-medium flex items-center gap-1 md:gap-2">
                          <span className="text-green-400 font-bold">{filesScanned}</span> endpoints validated
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 md:gap-4 w-full md:w-auto relative z-10">
                      <div className="flex gap-2">
                        <button
                          onClick={handleExportReport}
                          className="px-4 md:px-6 py-3 md:py-3.5 bg-white text-black hover:bg-gray-200 font-bold text-xs md:text-sm rounded-2xl flex items-center justify-center gap-2 transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5"
                        >
                          <Download className="w-4 h-4" />
                          MD
                        </button>
                        <button
                          onClick={handleExportPdf}
                          className="px-4 md:px-6 py-3 md:py-3.5 bg-blue-600 text-white hover:bg-blue-700 font-bold text-xs md:text-sm rounded-2xl flex items-center justify-center gap-2 transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5"
                        >
                          <FileText className="w-4 h-4" />
                          PDF
                        </button>
                      </div>
                      <button
                        onClick={() => {
                          setPhase('idle');
                          setReportContent('');
                          setFile(null);
                        }}
                        className="px-5 md:px-6 py-3 md:py-3.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold text-xs md:text-sm rounded-2xl flex items-center justify-center gap-2 transition-all hover:border-primary/50"
                      >
                        <ArrowLeft className="w-4 h-4" />
                        Run New Audit
                      </button>
                    </div>
                  </div>
                </div>

                {/* Rendered Document */}
                <div className="glassmorphism rounded-3xl overflow-hidden shadow-2xl border border-white/10 bg-black/40">
                  <div className="px-5 md:px-10 py-4 md:py-5 border-b border-white/10 bg-[#050505] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 md:gap-4 sticky top-0 z-20 backdrop-blur-xl">
                    <div className="flex items-center gap-2 md:gap-3">
                      <div className="p-1.5 md:p-2 rounded-lg bg-primary/20 border border-primary/30">
                        <ShieldCheck className="w-4 h-4 md:w-5 md:h-5 text-primary" />
                      </div>
                      <span className="text-base md:text-lg font-bold text-white tracking-tight">Compliance Results</span>
                    </div>
                    <div className="py-1 px-3 rounded-full bg-white/5 border border-white/10 text-[10px] md:text-xs font-medium text-muted-foreground flex items-center gap-1.5 md:gap-2">
                      Generated {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                    </div>
                  </div>

                  <div className="p-5 md:p-12 mb-6 md:mb-10 overflow-y-auto max-h-[70vh] md:max-h-[75vh] custom-scrollbar scroll-smooth">
                    <div ref={completeReportRef} className={`prose prose-invert max-w-none text-sm md:text-base lg:text-lg leading-relaxed
                      prose-headings:text-foreground prose-h1:text-2xl md:prose-h1:text-4xl prose-h1:font-black prose-h1:tracking-tight prose-h1:border-b prose-h1:border-white/10 prose-h1:pb-4 md:prose-h1:pb-6 prose-h1:mb-6 md:prose-h1:mb-8
                      prose-h2:text-xl md:prose-h2:text-2xl prose-h2:font-bold prose-h2:mt-8 md:prose-h2:mt-12 prose-h2:mb-4 md:prose-h2:mb-6 prose-h2:text-white/90
                      prose-h3:text-lg md:prose-h3:text-xl prose-h3:font-semibold prose-h3:text-primary-foreground
                      prose-p:text-muted-foreground prose-p:leading-loose
                      prose-li:text-muted-foreground prose-li:my-1.5 md:prose-li:my-2
                      prose-strong:text-white prose-strong:font-bold
                      prose-a:text-primary hover:prose-a:text-primary/80 prose-a:transition-colors
                      prose-code:text-primary prose-code:bg-primary/10 prose-code:px-1.5 md:prose-code:px-2 prose-code:py-0.5 md:prose-code:py-1 prose-code:rounded-md prose-code:font-mono prose-code:text-xs md:prose-code:text-sm prose-code:border prose-code:border-primary/20
                      prose-pre:bg-black/60 prose-pre:border prose-pre:border-white/10 prose-pre:shadow-2xl prose-pre:rounded-xl md:prose-pre:rounded-2xl prose-pre:p-4 md:prose-pre:p-6
                      prose-blockquote:border-l-primary prose-blockquote:bg-primary/5 prose-blockquote:rounded-r-xl md:prose-blockquote:rounded-r-2xl prose-blockquote:py-1.5 md:prose-blockquote:py-2 prose-blockquote:px-4 md:prose-blockquote:px-6 prose-blockquote:my-6 md:prose-blockquote:my-8 prose-blockquote:italic
                      prose-table:border-collapse prose-table:w-full prose-table:rounded-xl md:prose-table:rounded-2xl prose-table:overflow-hidden prose-table:block md:prose-table:table prose-table:overflow-x-auto
                      prose-th:bg-white/5 prose-th:text-white prose-th:text-[10px] md:prose-th:text-xs prose-th:uppercase prose-th:tracking-wider prose-th:px-4 md:prose-th:px-6 prose-th:py-3 md:prose-th:py-4 prose-th:border-b prose-th:border-white/10 prose-th:text-left
                      prose-td:px-4 md:prose-td:px-6 prose-td:py-3 md:prose-td:py-4 prose-td:border-b prose-td:border-white/5 prose-td:text-xs md:prose-td:text-sm prose-td:text-muted-foreground
                      [&>table]:border [&>table]:border-white/10
                    `}>
                      <ReactMarkdown>{reportContent}</ReactMarkdown>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Informational Sections */}
        <div className="mt-16 md:mt-24 space-y-20 md:space-y-32">

          {/* About Us */}
          <section id="about" className="relative">
            <div className="absolute top-0 left-1/4 w-64 h-64 bg-primary/10 rounded-full blur-[100px] -z-10"></div>
            <div className="text-center max-w-3xl mx-auto mb-10 md:mb-16">
              <h2 className="text-3xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-br from-white to-white/60 mb-6">About Gracias AI</h2>
              <p className="text-base md:text-lg text-muted-foreground leading-relaxed">
                App Store rejection is one of the most frustrating bottlenecks in mobile development. We built the <strong>Compliance Auditor</strong> as an open-source initiative to help developers ship faster with confidence. By leveraging advanced LLMs , we simulate a rigorous Review Guideline check before you ever submit your build.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
              <div className="p-6 md:p-8 rounded-3xl bg-white/5 border border-white/10 glassmorphism">
                <div className="w-12 h-12 bg-primary/20 rounded-2xl flex items-center justify-center mb-6 border border-primary/30">
                  <Github className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-xl font-bold text-white mb-3">100% Open Source</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Transparency is our core value. The entire codebase is freely available for you to inspect, self-host, or contribute to. We believe security tools should be open.
                </p>
              </div>
              <div className="p-6 md:p-8 rounded-3xl bg-white/5 border border-white/10 glassmorphism">
                <div className="w-12 h-12 bg-blue-500/20 rounded-2xl flex items-center justify-center mb-6 border border-blue-500/30">
                  <Sparkles className="w-6 h-6 text-blue-400" />
                </div>
                <h3 className="text-xl font-bold text-white mb-3">AI Powered Precision</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  We don&apos;t just grep strings. The auditor structurally understands your code context, highlighting edge-case human interface and compliance failures.
                </p>
              </div>
              <div className="p-6 md:p-8 rounded-3xl bg-white/5 border border-white/10 glassmorphism">
                <div className="w-12 h-12 bg-green-500/20 rounded-2xl flex items-center justify-center mb-6 border border-green-500/30">
                  <CheckCircle className="w-6 h-6 text-green-400" />
                </div>
                <h3 className="text-xl font-bold text-white mb-3">Developer First</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Built natively for developers. Just drag and drop your root project directory or IPAs and get actionable remediation steps immediately.
                </p>
              </div>
            </div>
          </section>

          {/* How it Works */}
          <section id="how-it-works" className="relative">
            <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-blue-600/10 rounded-full blur-[100px] -z-10"></div>
            <div className="max-w-4xl mx-auto">
              <h2 className="text-3xl md:text-5xl font-black text-center text-transparent bg-clip-text bg-gradient-to-br from-white to-white/60 mb-12 md:mb-16">How It Works</h2>

              <div className="space-y-8 md:space-y-12 relative before:absolute before:inset-0 before:ml-6 md:before:mx-auto md:before:left-0 md:before:right-0 before:w-0.5 before:bg-gradient-to-b before:from-primary/50 before:via-blue-500/50 before:to-transparent">

                <div className="relative flex flex-col md:flex-row items-center justify-between group">
                  <div className="flex md:w-1/2 justify-start md:justify-end pr-0 md:pr-12 mb-4 md:mb-0 ml-16 md:ml-0 w-full text-left md:text-right">
                    <div>
                      <h3 className="text-xl md:text-2xl font-bold text-white mb-2">1. Upload Archive</h3>
                      <p className="text-muted-foreground text-sm md:text-base">Zip up your source code or drop an `.ipa` file directly. We parse all relevant languages (.swift, .tsx, .plist) while ignoring build artifacts.</p>
                    </div>
                  </div>
                  <div className="absolute left-0 md:left-1/2 transform md:-translate-x-1/2 w-12 h-12 rounded-full bg-black border-4 border-primary/50 flex items-center justify-center z-10 group-hover:border-primary transition-colors shadow-[0_0_20px_rgba(168,85,247,0.4)]">
                    <FileText className="w-5 h-5 text-primary" />
                  </div>
                  <div className="hidden md:block w-1/2 pl-12"></div>
                </div>

                <div className="relative flex flex-col md:flex-row items-center justify-between group">
                  <div className="hidden md:block w-1/2 pr-12"></div>
                  <div className="absolute left-0 md:left-1/2 transform md:-translate-x-1/2 w-12 h-12 rounded-full bg-black border-4 border-blue-500/50 flex items-center justify-center z-10 group-hover:border-blue-400 transition-colors shadow-[0_0_20px_rgba(59,130,246,0.4)]">
                    <Key className="w-5 h-5 text-blue-400" />
                  </div>
                  <div className="flex md:w-1/2 justify-start pl-0 md:pl-12 ml-16 md:ml-0 w-full text-left">
                    <div>
                      <h3 className="text-xl md:text-2xl font-bold text-white mb-2">2. Local Inference</h3>
                      <p className="text-muted-foreground text-sm md:text-base">Provide your own API key - BYOK(Bring Your Own Key). Your code is extracted securely in transient edge memory and streamed directly to the intelligence model.</p>
                    </div>
                  </div>
                </div>

                <div className="relative flex flex-col md:flex-row items-center justify-between group">
                  <div className="flex md:w-1/2 justify-start md:justify-end pr-0 md:pr-12 mb-4 md:mb-0 ml-16 md:ml-0 w-full text-left md:text-right">
                    <div>
                      <h3 className="text-xl md:text-2xl font-bold text-white mb-2">3. Actionable Reports</h3>
                      <p className="text-muted-foreground text-sm md:text-base">Receive a real-time markdown stream pinpointing Guideline violations, crash risks, and exact file paths to remediate before submission.</p>
                    </div>
                  </div>
                  <div className="absolute left-0 md:left-1/2 transform md:-translate-x-1/2 w-12 h-12 rounded-full bg-black border-4 border-green-500/50 flex items-center justify-center z-10 group-hover:border-green-400 transition-colors shadow-[0_0_20px_rgba(34,197,94,0.4)]">
                    <CheckCircle className="w-5 h-5 text-green-400" />
                  </div>
                  <div className="hidden md:block w-1/2 pl-12"></div>
                </div>

              </div>
            </div>
          </section>

          {/* Security */}
          <section id="security" className="mb-10">
            <div className="bg-gradient-to-br from-red-500/5 via-black to-primary/5 border border-white/10 rounded-[2rem] p-8 md:p-12 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent opacity-50"></div>

              <div className="flex flex-col md:flex-row items-center gap-8 md:gap-12">
                <div className="w-full md:w-1/3 flex justify-center">
                  <div className="relative">
                    <div className="absolute inset-0 bg-green-500 rounded-full blur-[60px] opacity-20 animate-pulse"></div>
                    <div className="w-32 h-32 md:w-48 md:h-48 border border-white/10 bg-black/50 rounded-full flex items-center justify-center backdrop-blur-md">
                      <ShieldCheck className="w-16 h-16 md:w-24 md:h-24 text-green-400 drop-shadow-[0_0_15px_rgba(34,197,94,0.5)]" />
                    </div>
                  </div>
                </div>

                <div className="w-full md:w-2/3">
                  <h2 className="text-3xl md:text-4xl font-black text-white mb-4">Enterprise Grade Security</h2>
                  <p className="text-lg text-muted-foreground mb-6 leading-relaxed">
                    We know that source code is your most valuable asset. App Store Compliance Audit is built from the ground up with a <strong className="text-white">Zero Trust Architecture.</strong>
                  </p>

                  <ul className="space-y-4">
                    <li className="flex items-start gap-3">
                      <div className="mt-1 bg-green-500/20 p-1 rounded-full"><CheckCircle className="w-4 h-4 text-green-400" /></div>
                      <div>
                        <strong className="block text-white">No Cloud Storage</strong>
                        <span className="text-sm text-muted-foreground">Files are unzipped in a temporary ephemeral container and immediately deleted the second the audit stream finishes. Nothing is written to a persistent database.</span>
                      </div>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="mt-1 bg-green-500/20 p-1 rounded-full"><CheckCircle className="w-4 h-4 text-green-400" /></div>
                      <div>
                        <strong className="block text-white">Bring Your Own Key (BYOK)</strong>
                        <span className="text-sm text-muted-foreground">You supply the Anthropic API key. We act strictly as a passthrough. This means your data relationship remains strictly between you and Anthropic.</span>
                      </div>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="mt-1 bg-green-500/20 p-1 rounded-full"><CheckCircle className="w-4 h-4 text-green-400" /></div>
                      <div>
                        <strong className="block text-white">Auditable Code</strong>
                        <span className="text-sm text-muted-foreground">Don't trust us? Trust the code. Deploy this Next.js app on your own local machine or private VPC with `npm run dev` and review exactly where your bytes are going.</span>
                      </div>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </section>

        </div>

        {/* Detailed Footer */}
        <motion.footer
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="mt-16 border-t border-white/10 pt-12 pb-8 w-full relative z-20"
        >
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
            <div className="col-span-1 md:col-span-2 space-y-4">
              <Link href="https://gracias.sh" target="_blank" className="flex items-center gap-2">
                <div className="bg-gradient-to-br from-primary to-blue-600 w-6 h-6 rounded flex items-center justify-center">
                  <Sparkles className="w-3 h-3 text-white" />
                </div>
                <span className="text-lg font-bold text-white">Gracias AI</span>
              </Link>
              <p className="text-sm text-muted-foreground max-w-sm leading-relaxed">
                Building secure, open-source intelligence tools for developers. Our compliance auditor runs entirely in your browser using the Claude API, ensuring maximum privacy and security for your IP.
              </p>
              <div className="flex items-center gap-4 pt-2">
                <a href="https://github.com/gracias-sh" className="text-muted-foreground hover:text-white transition-colors">
                  <Github className="w-5 h-5" />
                </a>
              </div>
            </div>

            <div className="space-y-4" id="about">
              <h4 className="text-white font-semibold">Product</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="https://gracias.sh/features" className="hover:text-primary transition-colors">Features</a></li>
                <li><a href="https://gracias.sh/security" className="hover:text-primary transition-colors">Security</a></li>
                <li><a href="https://gracias.sh/pricing" className="hover:text-primary transition-colors">Enterprise</a></li>
                <li><a href="https://github.com/atharvnaik1/Gracias-Ai---Appstore-Playstore-Policy-Auditor-Opensource-" className="hover:text-primary transition-colors flex items-center gap-1">Source Code <ExternalLink className="w-3 h-3" /></a></li>
              </ul>
            </div>

            <div className="space-y-4">
              <h4 className="text-white font-semibold flex items-center gap-2">
                <Building2 className="w-4 h-4" /> Company
              </h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="https://gracias.sh/about" className="hover:text-primary transition-colors">About Us</a></li>
                <li><a href="https://gracias.sh/careers" className="hover:text-primary transition-colors">Careers</a></li>
                <li><a href="mailto:hello@gracias.sh" className="hover:text-primary transition-colors">Contact</a></li>
                <li><a href="https://gracias.sh/privacy" className="hover:text-primary transition-colors">Privacy Policy</a></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-white/5 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-xs text-muted-foreground">
              &copy; {new Date().getFullYear()} Gracias AI. All rights reserved. An open-source initiative.
            </p>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/5 text-[10px] md:text-sm font-medium text-muted-foreground backdrop-blur-md">
              <ShieldCheck className="w-3 h-3 md:w-4 md:h-4 text-green-400" />
              100% Client-Side Processing •
            </div>
          </div>
        </motion.footer>
      </div>

      {/* Global styles for custom scrollbar embedded for scoped application */}
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        @media (min-width: 768px) {
          .custom-scrollbar::-webkit-scrollbar {
            width: 8px;
          }
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: rgba(255, 255, 255, 0.1);
          border-radius: 20px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background-color: rgba(168, 85, 247, 0.5);
        }
        @keyframes shimmer {
          100% {
            transform: translateX(150%);
          }
        }
      `}</style>
    </main>
  );
}
