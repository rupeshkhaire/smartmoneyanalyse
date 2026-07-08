import { useState, useEffect } from 'react';
import { type ColumnMappings, type ParseResult } from '../../services/parser';
import { useFinance } from '../../context/FinanceContext';
import { AlertCircle, ArrowRight, HelpCircle } from 'lucide-react';

interface ColumnMapperProps {
  parseResult: ParseResult;
  onCompleted: () => void;
  onCancel: () => void;
}

export const ColumnMapper = ({ parseResult, onCompleted, onCancel }: ColumnMapperProps) => {
  const { importMappedStatement } = useFinance();
  const { fileName, headers, rawRows, detectedMappings } = parseResult;
  
  const [accountNickname, setAccountNickname] = useState(parseResult.preambleNickname || fileName.replace(/\.[^/.]+$/, ''));
  const [mappings, setMappings] = useState<ColumnMappings>({
    date: detectedMappings.date || '',
    description: detectedMappings.description || '',
    amount: detectedMappings.amount || '',
    balance: detectedMappings.balance || '',
    debit: detectedMappings.debit || '',
    credit: detectedMappings.credit || '',
  });

  const [useSeparateDebitCredit, setUseSeparateDebitCredit] = useState<boolean>(
    !!(detectedMappings.debit || detectedMappings.credit)
  );

  const [error, setError] = useState<string>('');
  const [showLogs, setShowLogs] = useState<boolean>(false);

  // Auto-detect columns defaults when component changes
  useEffect(() => {
    setAccountNickname(parseResult.preambleNickname || fileName.replace(/\.[^/.]+$/, ''));
    setMappings({
      date: detectedMappings.date || '',
      description: detectedMappings.description || '',
      amount: detectedMappings.amount || '',
      balance: detectedMappings.balance || '',
      debit: detectedMappings.debit || '',
      credit: detectedMappings.credit || '',
    });
    setUseSeparateDebitCredit(!!(detectedMappings.debit || detectedMappings.credit));
    setError('');
  }, [parseResult]);

  const handleFieldChange = (field: keyof ColumnMappings, value: string) => {
    setMappings(prev => ({
      ...prev,
      [field]: value
    }));
    setError('');
  };

  const handleConfirm = async () => {
    // Validation
    if (!mappings.date) {
      setError('Please select a Date column.');
      return;
    }
    if (!mappings.description) {
      setError('Please select a Description column.');
      return;
    }
    if (useSeparateDebitCredit) {
      if (!mappings.debit || !mappings.credit) {
        setError('Please select both Debit and Credit columns.');
        return;
      }
    } else {
      if (!mappings.amount) {
        setError('Please select an Amount column.');
        return;
      }
    }

    try {
      // Build final mappings object
      const finalMappings: ColumnMappings = {
        date: mappings.date,
        description: mappings.description,
        amount: useSeparateDebitCredit ? '' : mappings.amount,
        balance: mappings.balance || undefined,
        debit: useSeparateDebitCredit ? mappings.debit : undefined,
        credit: useSeparateDebitCredit ? mappings.credit : undefined,
      };

      await importMappedStatement(
        new File([], fileName), // Stub file, rawRows contain the data
        rawRows,
        finalMappings,
        accountNickname,
        parseResult.periodStart,
        parseResult.periodEnd
      );
      
      onCompleted();
    } catch (err: any) {
      setError(`Failed to import: ${err.message || err}`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-4xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl max-h-[90vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-amber-500/10 text-amber-500 rounded-2xl">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-bold font-display text-slate-900 dark:text-white">Review Column Mappings</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                We weren't confident mapping the columns for <span className="font-semibold text-slate-800 dark:text-slate-200">{fileName}</span>. Please link them manually.
              </p>
            </div>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && (
            <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-2xl text-sm font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Collapsible section detailing why auto-map had low confidence */}
          {parseResult.confidenceLogs && parseResult.confidenceLogs.length > 0 && (
            <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden bg-slate-50/50 dark:bg-slate-950/20 text-xs">
              <button
                type="button"
                onClick={() => setShowLogs(!showLogs)}
                className="w-full px-4 py-3 flex items-center justify-between font-semibold text-slate-550 hover:text-slate-700 dark:hover:text-slate-350 transition-colors"
              >
                <span>Why we couldn't auto-map this statement ({parseResult.confidenceLogs.length} issues)</span>
                <span className="text-[10px] bg-slate-200 dark:bg-slate-800 px-2.5 py-0.5 rounded font-extrabold uppercase text-slate-500 dark:text-slate-400">
                  {showLogs ? 'Hide Details' : 'Show Details'}
                </span>
              </button>
              
              {showLogs && (
                <div className="px-4 pb-4 pt-1 space-y-2 border-t border-slate-150 dark:border-slate-850/60 divide-y divide-slate-150 dark:divide-slate-850/40 text-slate-500 dark:text-slate-400">
                  {parseResult.confidenceLogs.map((log, idx) => (
                    <div key={idx} className="pt-2 flex items-start gap-2">
                      <span className="text-amber-500 font-bold">•</span>
                      <span>{log}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Account Details & Mode */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                Account Nickname / Month
              </label>
              <input
                type="text"
                value={accountNickname}
                onChange={(e) => setAccountNickname(e.target.value)}
                placeholder="e.g. Chase Checkings (Jan 2026)"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                Amount Structure
              </label>
              <div className="flex bg-slate-100 dark:bg-slate-950 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => {
                    setUseSeparateDebitCredit(false);
                    setError('');
                  }}
                  className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold transition-all ${
                    !useSeparateDebitCredit
                      ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  Single Amount Column
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setUseSeparateDebitCredit(true);
                    setError('');
                  }}
                  className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold transition-all ${
                    useSeparateDebitCredit
                      ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  Separate Debit/Credit
                </button>
              </div>
            </div>
          </div>

          {/* Mapping Drops */}
          <div className="bg-slate-50 dark:bg-slate-950/40 border border-slate-150 dark:border-slate-850 p-5 rounded-2xl">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Link Table Headers</h4>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              {/* Date */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">
                  Date <span className="text-rose-500">*</span>
                </label>
                <select
                  value={mappings.date}
                  onChange={(e) => handleFieldChange('date', e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-250 text-sm font-medium focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">-- Select Column --</option>
                  {headers.map(h => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">
                  Description / Payee <span className="text-rose-500">*</span>
                </label>
                <select
                  value={mappings.description}
                  onChange={(e) => handleFieldChange('description', e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-250 text-sm font-medium focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">-- Select Column --</option>
                  {headers.map(h => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
              </div>

              {/* Amount Columns */}
              {!useSeparateDebitCredit ? (
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">
                    Amount Column <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={mappings.amount}
                    onChange={(e) => handleFieldChange('amount', e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-250 text-sm font-medium focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">-- Select Column --</option>
                    {headers.map(h => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">
                      Debit Column <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={mappings.debit}
                      onChange={(e) => handleFieldChange('debit', e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-250 text-sm font-medium focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="">-- Select Column --</option>
                      {headers.map(h => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">
                      Credit Column <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={mappings.credit}
                      onChange={(e) => handleFieldChange('credit', e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-250 text-sm font-medium focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="">-- Select Column --</option>
                      {headers.map(h => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>
                </>
              )}

              {/* Running Balance */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 flex items-center gap-1">
                  Balance <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <select
                  value={mappings.balance}
                  onChange={(e) => handleFieldChange('balance', e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-250 text-sm font-medium focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">-- Select Column --</option>
                  {headers.map(h => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Raw Grid Preview */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">File Raw Preview (First 5 Rows)</h4>
              <div className="text-[10px] text-indigo-400 bg-indigo-500/10 px-2.5 py-0.5 rounded-full font-semibold flex items-center gap-1">
                <HelpCircle className="w-3 h-3" /> Showing extracted file cells
              </div>
            </div>

            <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden bg-slate-50 dark:bg-slate-950 overflow-x-auto">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="bg-slate-100 dark:bg-slate-900 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 font-semibold">
                    {headers.map((h, i) => (
                      <th key={i} className="px-4 py-3 font-semibold whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-150 dark:divide-slate-850">
                  {rawRows.slice(0, 5).map((row, rIdx) => (
                    <tr key={rIdx} className="hover:bg-slate-100/50 dark:hover:bg-slate-900/40 text-slate-700 dark:text-slate-350">
                      {headers.map((h, cIdx) => (
                        <td key={cIdx} className="px-4 py-2.5 font-medium whitespace-nowrap">{row[h] || ''}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-sm font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors"
          >
            Cancel
          </button>
          
          <button
            type="button"
            onClick={handleConfirm}
            className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold shadow-md shadow-indigo-600/10 flex items-center gap-1.5 transition-all active:scale-[0.98]"
          >
            Import Statement <ArrowRight className="w-4 h-4" />
          </button>
        </div>

      </div>
    </div>
  );
};
