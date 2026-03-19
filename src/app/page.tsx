'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload, FileArchive, X, Key, Send, Loader2,
  ChevronDown, ChevronRight, Download, ArrowLeft,
  ShieldCheck, AlertTriangle, CheckCircle, XCircle,
  FileText, Sparkles, Info
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import Link from 'next/link';

type AuditPhase = 'idle' | 'uploading' | 'analyzing' | 'complete' | 'error';

export default function AuditPage() {
  const [file, setFile] = useState<File | null>(null);
  const [claudeApiKey, setClaudeApiKey] = useState('');
  const [context, setContext] = useState('');
  const [phase, setPhase] = useState<AuditPhase>('idle');
  const [reportContent, setReportContent] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [filesScanned, setFilesScanned] = useState(0);
  const [fileNames, setFileNames] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['phase12', 'phase3', 'phase4']));
  const [showFileList, setShowFileList] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const reportRef = useRef<HTMLDivElement>(null);

  // Load API key from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('claude_api_key');
    if (saved) setClaudeApiKey(saved);
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

  const isReady = file && claudeApiKey.trim();

  return (
    <main className="min-h-[100dvh] w-full bg-[#0a0a0a] text-white selection:bg-purple-500/30">
      {/* Ambient background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-purple-600/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-blue-600/5 rounded-full blur-[120px]" />
      </div>

      <div className="relative z-10 max-w-5xl mx-auto px-4 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors mb-6 group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            Back to iGracias
          </Link>

          <div className="flex items-center gap-4 mb-2">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-purple-600/20 to-blue-600/20 border border-purple-500/20">
              <ShieldCheck className="w-8 h-8 text-purple-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 via-blue-400 to-cyan-400 text-transparent bg-clip-text">
                App Store Compliance Audit
              </h1>
              <p className="text-gray-400 text-sm mt-1">
                AI-powered analysis against Apple&apos;s App Store Review Guidelines
              </p>
            </div>
          </div>
        </motion.div>

        {/* Main Content */}
        <div className="space-y-6">
          {/* Upload & Config Section */}
          <AnimatePresence mode="wait">
            {(phase === 'idle' || phase === 'error') && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-6"
              >
                {/* File Upload Zone */}
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`relative cursor-pointer rounded-2xl border-2 border-dashed transition-all duration-300 ${isDragging
                    ? 'border-purple-500 bg-purple-500/10 scale-[1.01]'
                    : file
                      ? 'border-green-500/50 bg-green-500/5'
                      : 'border-[#333] bg-[#111] hover:border-purple-500/50 hover:bg-[#151515]'
                    }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".zip,.ipa"
                    onChange={handleFileSelect}
                    className="hidden"
                    id="file-upload"
                  />

                  <div className="p-10 flex flex-col items-center justify-center text-center">
                    {file ? (
                      <motion.div
                        initial={{ scale: 0.9 }}
                        animate={{ scale: 1 }}
                        className="flex flex-col items-center gap-3"
                      >
                        <div className="p-4 rounded-2xl bg-green-500/10 border border-green-500/20">
                          <FileArchive className="w-10 h-10 text-green-400" />
                        </div>
                        <div>
                          <p className="text-white font-medium text-lg">{file.name}</p>
                          <p className="text-gray-400 text-sm">{formatFileSize(file.size)}</p>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setFile(null);
                          }}
                          className="mt-2 px-4 py-1.5 text-xs text-red-400 bg-red-400/10 hover:bg-red-400/20 border border-red-400/20 rounded-full transition-colors flex items-center gap-1.5"
                        >
                          <X className="w-3 h-3" />
                          Remove
                        </button>
                      </motion.div>
                    ) : (
                      <>
                        <div className="p-4 rounded-2xl bg-[#1a1a1a] border border-[#333] mb-4">
                          <Upload className="w-10 h-10 text-gray-400" />
                        </div>
                        <p className="text-white font-medium text-lg mb-1">
                          Drop your app bundle here
                        </p>
                        <p className="text-gray-500 text-sm">
                          Supports <span className="text-purple-400 font-medium">.zip</span> and{' '}
                          <span className="text-purple-400 font-medium">.ipa</span> files up to 150MB
                        </p>
                        <p className="text-gray-600 text-xs mt-3">
                          Upload your Xcode project folder as a .zip for best results
                        </p>
                      </>
                    )}
                  </div>
                </div>

                {/* Claude API Key */}
                <div className="rounded-2xl bg-[#111] border border-[#222] p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <Key className="w-5 h-5 text-amber-400" />
                    <h3 className="text-sm font-semibold text-white uppercase tracking-wider">Claude API Key</h3>
                    <span className="text-xs text-gray-500 font-normal normal-case">stored locally in your browser</span>
                  </div>
                  <div className="relative">
                    <input
                      type={showApiKey ? 'text' : 'password'}
                      value={claudeApiKey}
                      onChange={(e) => setClaudeApiKey(e.target.value)}
                      placeholder="sk-ant-api03-..."
                      className="w-full bg-[#0a0a0a] border border-[#333] rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500/50 transition-all font-mono pr-20"
                    />
                    <button
                      type="button"
                      onClick={() => setShowApiKey(!showApiKey)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500 hover:text-gray-300 transition-colors px-2 py-1 rounded bg-[#1a1a1a]"
                    >
                      {showApiKey ? 'Hide' : 'Show'}
                    </button>
                  </div>
                </div>

                {/* Optional Context */}
                <div className="rounded-2xl bg-[#111] border border-[#222] p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <Info className="w-5 h-5 text-blue-400" />
                    <h3 className="text-sm font-semibold text-white uppercase tracking-wider">Additional Context</h3>
                    <span className="text-xs text-gray-500 font-normal normal-case">optional</span>
                  </div>
                  <textarea
                    value={context}
                    onChange={(e) => setContext(e.target.value)}
                    placeholder="App name, target audience, specific concerns, category (e.g. Finance, Health), features to focus on..."
                    rows={3}
                    className="w-full bg-[#0a0a0a] border border-[#333] rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500/50 transition-all resize-none"
                  />
                </div>

                {/* Error Display */}
                {errorMessage && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-2xl bg-red-500/10 border border-red-500/20 p-4 flex items-start gap-3"
                  >
                    <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-red-400 text-sm font-medium">Audit Failed</p>
                      <p className="text-red-400/70 text-xs mt-1">{errorMessage}</p>
                    </div>
                  </motion.div>
                )}

                {/* Run Audit Button */}
                <button
                  onClick={handleRunAudit}
                  disabled={!isReady}
                  className={`w-full py-4 rounded-2xl font-semibold text-base flex items-center justify-center gap-3 transition-all duration-300 ${isReady
                    ? 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white shadow-lg shadow-purple-500/20 hover:shadow-purple-500/30 hover:scale-[1.01] active:scale-[0.99]'
                    : 'bg-[#1a1a1a] text-gray-600 cursor-not-allowed border border-[#222]'
                    }`}
                >
                  <Sparkles className="w-5 h-5" />
                  Run App Store Compliance Audit
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Analyzing State */}
          <AnimatePresence>
            {(phase === 'uploading' || phase === 'analyzing') && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                {/* Progress Card */}
                <div className="rounded-2xl bg-[#111] border border-purple-500/20 p-8 text-center">
                  <div className="inline-flex p-4 rounded-full bg-purple-500/10 mb-4">
                    <Loader2 className="w-10 h-10 text-purple-400 animate-spin" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">
                    {phase === 'uploading' ? 'Uploading & Extracting...' : 'Analyzing with Claude AI...'}
                  </h3>
                  <p className="text-gray-400 text-sm">
                    {phase === 'uploading'
                      ? 'Extracting and scanning your app bundle'
                      : filesScanned > 0
                        ? `Found ${filesScanned} source files — generating comprehensive audit report`
                        : 'Scanning files and preparing audit analysis'}
                  </p>

                  {/* Scanned files indicator */}
                  {filesScanned > 0 && (
                    <div className="mt-4">
                      <button
                        onClick={() => setShowFileList(!showFileList)}
                        className="text-xs text-purple-400 hover:text-purple-300 transition-colors flex items-center gap-1 mx-auto"
                      >
                        {showFileList ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                        {filesScanned} files being analyzed
                      </button>
                      <AnimatePresence>
                        {showFileList && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="mt-3 max-h-40 overflow-y-auto bg-[#0a0a0a] rounded-xl p-3 text-left">
                              {fileNames.map((name, i) => (
                                <div key={i} className="text-xs text-gray-500 font-mono py-0.5 flex items-center gap-2">
                                  <FileText className="w-3 h-3 shrink-0" />
                                  {name}
                                </div>
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )}

                  {/* Animated shimmer bar */}
                  <div className="mt-6 h-1 bg-[#1a1a1a] rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-purple-600 via-blue-500 to-purple-600 rounded-full"
                      initial={{ x: '-100%' }}
                      animate={{ x: '200%' }}
                      transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}
                      style={{ width: '50%' }}
                    />
                  </div>
                </div>

                {/* Streaming Report Preview */}
                {reportContent && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="rounded-2xl bg-[#111] border border-[#222] overflow-hidden"
                  >
                    <div className="px-6 py-4 border-b border-[#222] flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
                        <span className="text-sm font-semibold text-white">Live Report Preview</span>
                      </div>
                    </div>
                    <div ref={reportRef} className="p-6 max-h-[500px] overflow-y-auto">
                      <div className="prose prose-invert max-w-none text-sm leading-relaxed">
                        <ReactMarkdown>{reportContent}</ReactMarkdown>
                      </div>
                    </div>
                  </motion.div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Complete Report */}
          <AnimatePresence>
            {phase === 'complete' && reportContent && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                {/* Success Banner */}
                <div className="rounded-2xl bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/20 p-6 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-xl bg-green-500/10">
                      <CheckCircle className="w-6 h-6 text-green-400" />
                    </div>
                    <div>
                      <h3 className="text-white font-bold text-lg">Audit Complete</h3>
                      <p className="text-gray-400 text-sm">{filesScanned} files analyzed • Report generated</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={handleExportReport}
                      className="px-4 py-2.5 bg-[#1a1a1a] hover:bg-[#222] border border-[#333] text-white text-sm rounded-xl flex items-center gap-2 transition-colors"
                    >
                      <Download className="w-4 h-4" />
                      Export .md
                    </button>
                    <button
                      onClick={() => {
                        setPhase('idle');
                        setReportContent('');
                        setFile(null);
                      }}
                      className="px-4 py-2.5 bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 text-purple-300 text-sm rounded-xl flex items-center gap-2 transition-colors"
                    >
                      <ShieldCheck className="w-4 h-4" />
                      New Audit
                    </button>
                  </div>
                </div>

                {/* Full Report */}
                <div className="rounded-2xl bg-[#111] border border-[#222] overflow-hidden">
                  <div className="px-6 py-4 border-b border-[#222] flex items-center justify-between bg-[#0d0d0d]">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-5 h-5 text-purple-400" />
                      <span className="text-sm font-bold text-white">Full Audit Report</span>
                    </div>
                    <span className="text-xs text-gray-500">
                      {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                    </span>
                  </div>
                  <div className="p-6 md:p-8 max-h-[70vh] overflow-y-auto">
                    <div className="prose prose-invert max-w-none text-sm leading-relaxed
                      prose-headings:text-white prose-h1:text-2xl prose-h1:font-bold prose-h1:border-b prose-h1:border-[#222] prose-h1:pb-4
                      prose-h2:text-xl prose-h2:font-bold prose-h2:mt-8 prose-h2:mb-4
                      prose-h3:text-lg prose-h3:font-semibold prose-h3:text-gray-200
                      prose-p:text-gray-300 prose-li:text-gray-300
                      prose-strong:text-white prose-em:text-gray-400
                      prose-code:text-purple-400 prose-code:bg-purple-400/10 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded
                      prose-table:border-collapse
                      prose-th:bg-[#1a1a1a] prose-th:text-white prose-th:text-xs prose-th:uppercase prose-th:tracking-wider prose-th:px-4 prose-th:py-3 prose-th:border prose-th:border-[#333]
                      prose-td:px-4 prose-td:py-2.5 prose-td:border prose-td:border-[#222] prose-td:text-sm
                    ">
                      <ReactMarkdown>{reportContent}</ReactMarkdown>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="mt-12 text-center">
          <p className="text-xs text-gray-600">
            Powered by Claude AI • All data stays in your browser • No files are stored on servers
          </p>
        </div>
      </div>
    </main>
  );
}
