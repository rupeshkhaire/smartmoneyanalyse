import React, { useState, useEffect } from 'react';
import { useFinance } from '../../context/FinanceContext';
import { ArrowUpRight, ArrowDownRight, RefreshCw } from 'lucide-react';

export const SummaryCards = () => {
  const { filteredTransactions, currencySymbol, statements, selectedStatementIds, setSelectedStatementIds } = useFinance();
  const [counters, setCounters] = useState({ income: 0, expenses: 0, net: 0 });

  // Compute metrics based on filtered transactions
  const metrics = React.useMemo(() => {
    let income = 0;
    let expenses = 0;

    filteredTransactions.forEach(tx => {
      if (tx.category === 'Transfers') return; // Exclude transfers from cashflow totals

      if (tx.amount > 0) {
        income += tx.amount;
      } else {
        expenses += Math.abs(tx.amount);
      }
    });

    return {
      income,
      expenses,
      net: income - expenses
    };
  }, [filteredTransactions]);

  // Micro-interaction: quick numerical transition count up effect
  useEffect(() => {
    const endIncome = metrics.income;
    const endExpenses = metrics.expenses;
    const endNet = metrics.net;
    
    if (endIncome === 0 && endExpenses === 0) {
      setCounters({ income: 0, expenses: 0, net: 0 });
      return;
    }

    const duration = 800; // ms
    const stepTime = 30; // ms
    const totalSteps = duration / stepTime;
    let currentStep = 0;

    const timer = setInterval(() => {
      currentStep++;
      const progress = currentStep / totalSteps;
      
      // Ease out quad
      const easeProgress = progress * (2 - progress);

      setCounters({
        income: Math.round(endIncome * easeProgress * 100) / 100,
        expenses: Math.round(endExpenses * easeProgress * 100) / 100,
        net: Math.round(endNet * easeProgress * 100) / 100
      });

      if (currentStep >= totalSteps) {
        clearInterval(timer);
        setCounters({ income: endIncome, expenses: endExpenses, net: endNet });
      }
    }, stepTime);

    return () => clearInterval(timer);
  }, [metrics]);

  const formatAmount = (num: number) => {
    return `${num < 0 ? '-' : ''}${currencySymbol}${Math.abs(num).toLocaleString('en-IN', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    })}`;
  };

  return (
    <div className="space-y-6">
      {/* Account / Statement filter pills */}
      {statements.length > 1 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-extrabold text-slate-400 uppercase tracking-wider mr-1.5 select-none">Accounts:</span>
          <button
            type="button"
            onClick={() => setSelectedStatementIds([])}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all border ${
              selectedStatementIds.length === 0
                ? 'bg-slate-900 text-white border-slate-950 dark:bg-white dark:text-slate-900 dark:border-white shadow-sm'
                : 'bg-white text-slate-600 hover:bg-slate-100 border-slate-200 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:border-slate-800'
            }`}
          >
            All Accounts
          </button>
          {statements.map(stmt => (
            <button
              key={stmt.id}
              type="button"
              onClick={() => {
                if (selectedStatementIds.includes(stmt.id)) {
                  setSelectedStatementIds(selectedStatementIds.filter(id => id !== stmt.id));
                } else {
                  setSelectedStatementIds([...selectedStatementIds, stmt.id]);
                }
              }}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all border ${
                selectedStatementIds.includes(stmt.id)
                  ? 'bg-indigo-650 text-white border-indigo-700 shadow-md shadow-indigo-600/10'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border-slate-200 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:border-slate-800'
              }`}
            >
              {stmt.accountNickname}
            </button>
          ))}
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Income Card */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 shadow-xl shadow-slate-100/70 dark:shadow-black/20 hover:shadow-indigo-500/[0.03] transition-all group overflow-hidden relative flex flex-col justify-between h-[155px]">
          <div className="absolute -right-4 -bottom-4 w-28 h-28 bg-emerald-500/[0.03] rounded-full transition-transform group-hover:scale-110"></div>
          
          <div className="space-y-1">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Total Income</span>
            <h3 className="text-4xl font-extrabold font-tabular text-slate-900 dark:text-white leading-none">
              {formatAmount(counters.income)}
            </h3>
          </div>
          
          <div className="flex items-center justify-between border-t border-slate-50 dark:border-slate-850 pt-4 mt-2 text-xs">
            <span className="text-emerald-500 font-bold flex items-center gap-1">
              <ArrowUpRight className="w-4 h-4" /> + Inflow
            </span>
            
            {/* Sparkline curve */}
            <svg className="w-14 h-5 text-emerald-500/80 mr-2" viewBox="0 0 100 30" fill="none">
              <path d="M0 25 C 20 22, 40 12, 60 18, 80 5, 100 2" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
          </div>
        </div>

        {/* Expense Card */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 shadow-xl shadow-slate-100/70 dark:shadow-black/20 hover:shadow-rose-500/[0.03] transition-all group overflow-hidden relative flex flex-col justify-between h-[155px]">
          <div className="absolute -right-4 -bottom-4 w-28 h-28 bg-rose-500/[0.03] rounded-full transition-transform group-hover:scale-110"></div>

          <div className="space-y-1">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Total Expenses</span>
            <h3 className="text-4xl font-extrabold font-tabular text-slate-900 dark:text-white leading-none">
              {formatAmount(counters.expenses)}
            </h3>
          </div>

          <div className="flex items-center justify-between border-t border-slate-50 dark:border-slate-850 pt-4 mt-2 text-xs">
            <span className="text-rose-500 font-bold flex items-center gap-1">
              <ArrowDownRight className="w-4 h-4" /> - Outflow
            </span>
            
            {/* Sparkline curve */}
            <svg className="w-14 h-5 text-rose-500/80 mr-2" viewBox="0 0 100 30" fill="none">
              <path d="M0 5 C 20 12, 40 25, 60 10, 80 22, 100 15" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
          </div>
        </div>

        {/* Net Change Card */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 shadow-xl shadow-slate-100/70 dark:shadow-black/20 hover:shadow-indigo-500/[0.03] transition-all group overflow-hidden relative flex flex-col justify-between h-[155px]">
          <div className="absolute -right-4 -bottom-4 w-28 h-28 bg-indigo-500/[0.03] rounded-full transition-transform group-hover:scale-110"></div>

          <div className="space-y-1">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Net Savings</span>
            <h3 className={`text-4xl font-extrabold font-tabular leading-none ${
              counters.net >= 0 ? 'text-slate-900 dark:text-white' : 'text-rose-500'
            }`}>
              {formatAmount(counters.net)}
            </h3>
          </div>

          <div className="flex items-center justify-between border-t border-slate-50 dark:border-slate-850 pt-4 mt-2 text-xs">
            <span className={`font-bold flex items-center gap-1 ${counters.net >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
              {counters.net >= 0 ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5" /> Positive
                </>
              ) : (
                <>
                  <RefreshCw className="w-3.5 h-3.5 text-rose-500" /> Deficit
                </>
              )}
            </span>
            
            {/* Sparkline curve */}
            <svg className={`w-14 h-5 mr-2 ${counters.net >= 0 ? 'text-teal-500/80' : 'text-rose-500/80'}`} viewBox="0 0 100 30" fill="none">
              <path d="M0 20 C 25 15, 45 5, 65 18, 85 10, 100 2" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
          </div>
        </div>

      </div>
    </div>
  );
};
