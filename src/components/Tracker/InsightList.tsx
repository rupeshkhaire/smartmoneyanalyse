import { useState } from 'react';
import { useFinance } from '../../context/FinanceContext';
import { type Insight } from '../../services/analyzer';
import { TrendingUp, CreditCard, Sparkles, ChevronDown, ChevronUp, Bell, CheckCircle2, ShieldAlert, BadgeAlert, RefreshCw } from 'lucide-react';

export const InsightList = () => {
  const { insights, ignoreInsight, currencySymbol, transactions, statements, createRule } = useFinance();
  const [expandedInsight, setExpandedInsight] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedInsight(expandedInsight === id ? null : id);
  };

  const getIcon = (type: Insight['type']) => {
    switch (type) {
      case 'subscription':
        return <CreditCard className="w-5 h-5 text-indigo-500" />;
      case 'recurring_payment':
        return <RefreshCw className="w-5 h-5 text-amber-550" />;
      case 'rising_trend':
        return <TrendingUp className="w-5 h-5 text-amber-500" />;
      case 'new_merchant':
        return <Sparkles className="w-5 h-5 text-emerald-500" />;
      case 'anomaly':
        return <BadgeAlert className="w-5 h-5 text-rose-500" />;
      default:
        return <Bell className="w-5 h-5 text-slate-500" />;
    }
  };

  const getBorderColor = (severity: Insight['severity']) => {
    switch (severity) {
      case 'danger':
        return 'border-rose-500/20 bg-rose-500/[0.02] dark:border-rose-500/10 dark:bg-rose-500/[0.01]';
      case 'warning':
        return 'border-amber-500/20 bg-amber-500/[0.02] dark:border-amber-500/10 dark:bg-amber-500/[0.01]';
      default:
        return 'border-indigo-500/20 bg-indigo-500/[0.02] dark:border-indigo-500/10 dark:bg-indigo-500/[0.01]';
    }
  };

  const formatAmount = (num: number) => {
    return `${num < 0 ? '-' : ''}${currencySymbol}${Math.abs(num).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;
  };

  const isMultiMonth = statements.length >= 2;

  if (statements.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
        <div className="p-4 bg-slate-100 dark:bg-slate-900 rounded-3xl text-slate-400">
          <ShieldAlert className="w-12 h-12" />
        </div>
        <h3 className="text-xl font-bold text-slate-800 dark:text-white font-display">No Statements Loaded</h3>
        <p className="text-sm text-slate-400 max-w-sm">Upload statements on the landing screen to start discovering financial insights.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* Informative top notice */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-xl font-bold font-display text-slate-950 dark:text-white">Pattern & Outflow Intelligence</h3>
            <p className="text-sm text-slate-400 mt-1">Smart indicators analyzing transaction volume, growth spikes, and recurring obligations.</p>
          </div>
          
          <div className="flex-shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 shadow-sm">
            {insights.length} active alerts
          </div>
        </div>

        {!isMultiMonth && (
          <div className="mt-5 p-4 bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 rounded-2xl text-xs font-medium leading-relaxed">
            <span className="font-bold">💡 Multi-Month Sandbox Mode:</span> You have currently loaded one statement. Upload statements for 2 or more months to unlock full comparison triggers, like monthly category spending increase and subscription interval matchings. (Or try "Import Demo Statements" on the landing page!)
          </div>
        )}
      </div>

      {/* Insights List */}
      {insights.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-800 rounded-3xl p-10 text-center flex flex-col items-center justify-center py-20">
          <CheckCircle2 className="w-12 h-12 text-emerald-500 mb-4 animate-pulse" />
          <h4 className="text-base font-bold text-slate-850 dark:text-white font-display">All Clear!</h4>
          <p className="text-xs text-slate-450 mt-1 max-w-xs leading-relaxed">
            We haven't detected any anomalous spikes, new expensive merchants, or recurring subscription alerts in this data.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {insights.map(ins => {
            const isExpanded = expandedInsight === ins.id;
            
            // Find related transactions in local store
            const relatedTxs = transactions.filter(t => ins.relatedTransactionIds.includes(t.id));

            return (
              <div
                key={ins.id}
                className={`border rounded-3xl overflow-hidden transition-all duration-200 shadow-sm ${getBorderColor(ins.severity)}`}
              >
                {/* Header card view */}
                <div className="p-5 flex items-start gap-4 cursor-pointer hover:bg-slate-50/20 dark:hover:bg-slate-900/10 transition-colors"
                     onClick={() => toggleExpand(ins.id)}
                >
                  <div className="p-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-2xl flex-shrink-0 shadow-sm">
                    {getIcon(ins.type)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white font-display truncate">
                      {ins.title}
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
                      {ins.description}
                    </p>
                  </div>

                  <div className="flex items-center gap-3 ml-4 flex-shrink-0">
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                  </div>
                </div>

                {/* Expanded Transactions detail inside card */}
                {isExpanded && (
                  <div className="px-5 pb-5 pt-3 border-t border-slate-100 dark:border-slate-800/80 bg-white/50 dark:bg-slate-950/20 space-y-4">
                    <div className="space-y-2">
                      <div className="text-[10px] font-bold text-slate-405 uppercase tracking-wider">Associated Transactions</div>
                      
                      <div className="border border-slate-150 dark:border-slate-850 rounded-2xl overflow-hidden divide-y divide-slate-150 dark:divide-slate-850 bg-white dark:bg-slate-900">
                        {relatedTxs.map(tx => (
                          <div key={tx.id} className="flex items-center justify-between p-3 text-xs">
                            <div className="min-w-0 flex-1 pr-4">
                              <p className="font-bold text-slate-800 dark:text-slate-200 truncate">{tx.description}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-[9px] font-semibold text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                                  {tx.category}
                                </span>
                                <span className="text-[9px] text-slate-405">{tx.date}</span>
                              </div>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <span className={`font-bold font-tabular ${tx.amount > 0 ? 'text-emerald-500' : 'text-slate-900 dark:text-white'}`}>
                                {formatAmount(tx.amount)}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                      {ins.type === 'recurring_payment' && ins.merchant ? (
                        <div className="flex gap-1.5 flex-wrap w-full sm:w-auto">
                          <button
                            type="button"
                            onClick={async (e) => {
                              e.stopPropagation();
                              if (ins.merchant) {
                                await createRule(ins.merchant, 'Rent/Mortgage');
                                await ignoreInsight(ins.id);
                              }
                            }}
                            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-650 text-white text-[11px] font-bold rounded-lg transition-colors"
                          >
                            Mark as Rent
                          </button>
                          <button
                            type="button"
                            onClick={async (e) => {
                              e.stopPropagation();
                              if (ins.merchant) {
                                await createRule(ins.merchant, 'EMI/Loans');
                                await ignoreInsight(ins.id);
                              }
                            }}
                            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-650 text-white text-[11px] font-bold rounded-lg transition-colors"
                          >
                            Mark as EMI
                          </button>
                          <button
                            type="button"
                            onClick={async (e) => {
                              e.stopPropagation();
                              if (ins.merchant) {
                                await createRule(ins.merchant, 'SIP/Investments');
                                await ignoreInsight(ins.id);
                              }
                            }}
                            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-650 text-white text-[11px] font-bold rounded-lg transition-colors"
                          >
                            Mark as SIP/Investments
                          </button>
                        </div>
                      ) : (
                        <div />
                      )}
                      
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          ignoreInsight(ins.id);
                        }}
                        className="w-full sm:w-auto px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-750 dark:text-slate-250 text-xs font-bold rounded-xl transition-colors active:scale-95"
                      >
                        Expected (Ignore)
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
