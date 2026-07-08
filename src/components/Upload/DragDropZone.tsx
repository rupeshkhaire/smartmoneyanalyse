import React, { useState, useRef } from 'react';
import { useFinance } from '../../context/FinanceContext';
import { demoDataService } from '../../services/demoData';
import { ColumnMapper } from './ColumnMapper';
import { type ParseResult } from '../../services/parser';
import { Upload, FileText, Database, ShieldAlert, Sparkles, Trash2 } from 'lucide-react';

export const DragDropZone = () => {
  const { uploadFiles, resetDatabase } = useFinance();
  const [isDragging, setIsDragging] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [parseStatus, setParseStatus] = useState('');
  
  // Mapping Queue for low confidence files
  const [mappingQueue, setMappingQueue] = useState<ParseResult[]>([]);
  const [currentMapping, setCurrentMapping] = useState<ParseResult | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const processUploadedFiles = async (files: FileList | null) => {
    console.log("[MoneyFlow Debug] processUploadedFiles started. File list size:", files?.length);
    if (!files || files.length === 0) return;
    
    setIsParsing(true);
    setParseStatus('Extracting statements...');
    
    try {
      const fileArray = Array.from(files);
      const { lowConfidenceFiles, successCount } = await uploadFiles(fileArray);
      
      console.log("[MoneyFlow Debug] uploadFiles result processed. successCount:", successCount, "lowConfidenceFiles count:", lowConfidenceFiles.length);
      
      if (lowConfidenceFiles.length > 0) {
        setMappingQueue(lowConfidenceFiles);
        setCurrentMapping(lowConfidenceFiles[0]);
      } else if (successCount > 0) {
        console.log("[MoneyFlow Debug] Reloading page to show Dashboard");
        // Refresh to dashboard
        window.location.reload();
      }
    } catch (err) {
      console.error("[MoneyFlow Debug] Error processing files in DragDropZone:", err);
    } finally {
      setIsParsing(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    console.log("[MoneyFlow Debug] Drop event detected. File count:", e.dataTransfer.files.length);
    await processUploadedFiles(e.dataTransfer.files);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log("[MoneyFlow Debug] File picker onChange fired. Files selected count:", e.target.files?.length);
    await processUploadedFiles(e.target.files);
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleReset = async () => {
    const confirm = window.confirm("This will delete all imported statements and data. Continue?");
    if (confirm) {
      await resetDatabase();
    }
  };

  const handleLoadDemo = async () => {
    setIsParsing(true);
    setParseStatus('Generating 3-month sandbox dataset...');
    try {
      await demoDataService.generateDemoData();
      // Reload page to re-initialize context from IndexedDB
      window.location.reload();
    } catch (err) {
      console.error(err);
    } finally {
      setIsParsing(false);
    }
  };

  const handleMappingCompleted = () => {
    // Remove the completed file from the queue
    const remaining = mappingQueue.slice(1);
    setMappingQueue(remaining);
    
    if (remaining.length > 0) {
      setCurrentMapping(remaining[0]);
    } else {
      setCurrentMapping(null);
      // All mappings finished, reload to refresh tables/charts
      window.location.reload();
    }
  };

  const handleMappingCancel = () => {
    const remaining = mappingQueue.slice(1);
    setMappingQueue(remaining);
    if (remaining.length > 0) {
      setCurrentMapping(remaining[0]);
    } else {
      setCurrentMapping(null);
      window.location.reload();
    }
  };

  return (
    <div className="w-full min-h-[80vh] flex flex-col items-center justify-center p-4">
      {currentMapping && (
        <ColumnMapper
          parseResult={currentMapping}
          onCompleted={handleMappingCompleted}
          onCancel={handleMappingCancel}
        />
      )}

      {/* Main Drag Card */}
      <div className="w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 shadow-2xl relative overflow-hidden transition-all duration-300">
        {/* Glow backdrop decorative */}
        <div className="absolute -top-40 -left-40 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-40 -right-40 w-80 h-80 bg-teal-500/10 rounded-full blur-3xl pointer-events-none"></div>

        {isParsing ? (
          <div className="flex flex-col items-center justify-center py-16 space-y-6">
            <div className="relative flex items-center justify-center">
              <div className="w-16 h-16 border-4 border-indigo-500/20 border-t-indigo-600 rounded-full animate-spin"></div>
              <Sparkles className="w-6 h-6 text-indigo-500 absolute animate-pulse" />
            </div>
            <div className="text-center">
              <h3 className="text-lg font-bold font-display text-slate-800 dark:text-white">{parseStatus}</h3>
              <p className="text-sm text-slate-400 mt-1">Analyzing dates, descriptions, balances and transactions...</p>
            </div>
          </div>
        ) : (
          <div className="space-y-8 relative z-10">
            {/* Header info */}
            <div className="text-center space-y-3">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 shadow-md shadow-indigo-500/5">
                <Sparkles className="w-3.5 h-3.5" /> Client-Side Analyzer
              </div>
              <h2 className="text-3xl font-extrabold font-display tracking-tight text-slate-900 dark:text-white">
                Visualize Your <span className="bg-gradient-to-r from-indigo-500 to-teal-400 bg-clip-text text-transparent">MoneyFlow</span>
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                Drop your bank statements here. Instantly map out income, expenses, subscriptions, and MoM trends with absolute financial privacy.
              </p>
            </div>

            {/* Hidden Input element (sibling, not child, to prevent click looping) */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              multiple
              accept=".csv,.txt,.pdf"
              className="hidden"
            />

            {/* Dropping box */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={triggerFileSelect}
              className={`border-2 border-dashed rounded-2xl p-10 flex flex-col items-center justify-center cursor-pointer transition-all duration-300 ${
                isDragging
                  ? 'border-indigo-500 bg-indigo-500/5 scale-[1.01] shadow-xl shadow-indigo-500/5'
                  : 'border-slate-300 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20 hover:border-slate-400 dark:hover:border-slate-700'
              }`}
            >
              <div className="p-4 bg-slate-100 dark:bg-slate-900 text-slate-500 dark:text-slate-400 rounded-2xl mb-4 shadow-sm transition-transform duration-300 group-hover:scale-105 pointer-events-none">
                <Upload className="w-8 h-8 text-indigo-500" />
              </div>
              
              <p className="text-base font-bold text-slate-800 dark:text-slate-200 text-center font-display pointer-events-none">
                Drag & drop files here, or <span className="text-indigo-500 hover:text-indigo-600 underline">browse</span>
              </p>
              <p className="text-xs text-slate-400 text-center mt-1.5 font-medium pointer-events-none">
                Supports CSV, PDF, and TXT bank statements
              </p>
            </div>

            {/* Support notes & Demo action */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-100 dark:border-slate-800/80">
              <div className="flex items-center gap-2.5 text-slate-500 dark:text-slate-400">
                <FileText className="w-4 h-4 text-slate-400" />
                <span className="text-xs font-semibold">Upload 2+ statements to unlock MoM insights</span>
              </div>
              
              <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={handleReset}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-bold transition-all flex items-center justify-center gap-2 border border-rose-500/20 shadow-sm"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Reset App Data
                </button>

                <button
                  type="button"
                  onClick={handleLoadDemo}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-150 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-white text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-sm border border-slate-250 dark:border-slate-750"
                >
                  <Database className="w-3.5 h-3.5 text-indigo-400" />
                  Import Demo Statements
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Safety Shield Notice */}
      <div className="mt-8 flex items-center gap-3 max-w-md bg-emerald-500/5 dark:bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-2xl text-center text-xs font-medium text-emerald-600 dark:text-emerald-400 shadow-sm shadow-emerald-500/5">
        <ShieldAlert className="w-5 h-5 text-emerald-500 flex-shrink-0" />
        <p className="text-left leading-relaxed">
          <span className="font-bold">🔒 Financial Privacy First:</span> Your sensitive statements never touch a server. All parsing, categorization, and storage are done completely in your browser via IndexedDB.
        </p>
      </div>
    </div>
  );
};
