
import { useFinance } from './context/FinanceContext';
import { DragDropZone } from './components/Upload/DragDropZone';
import { SummaryCards } from './components/Dashboard/SummaryCards';
import { SankeyDiagram } from './components/Dashboard/SankeyDiagram';
import { CategoryCharts } from './components/Dashboard/CategoryCharts';
import { TrendChart } from './components/Dashboard/TrendChart';
import { TopMerchants } from './components/Dashboard/TopMerchants';
import { InsightList } from './components/Tracker/InsightList';
import { TransactionTable } from './components/Transactions/TransactionTable';
import { SettingsPanel } from './components/Settings/SettingsPanel';
import { LayoutDashboard, AlertCircle, Receipt, Settings, Sparkles, Shield, Tag } from 'lucide-react';

function App() {
  const { statements, activeTab, setActiveTab, isLoading, errorMessage, setErrorMessage, transactions, setCategoryFilter } = useFinance();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#0b0f19] text-slate-800 dark:text-slate-200 flex flex-col items-center justify-center space-y-4">
        <div className="relative">
          <div className="w-12 h-12 border-4 border-indigo-500/20 border-t-indigo-650 rounded-full animate-spin"></div>
        </div>
        <p className="text-sm font-semibold tracking-wide text-slate-400">Loading MoneyFlow Ledger...</p>
      </div>
    );
  }

  const isDatabaseEmpty = statements.length === 0;

  return (
    <div className="min-h-screen pb-20 md:pb-8 bg-gradient-to-tr from-slate-50 via-slate-50 to-indigo-50/20 dark:from-[#0b0f19] dark:via-[#0b0f19] dark:to-indigo-950/10 text-slate-900 dark:text-slate-100 transition-colors duration-200">
      
      {/* 1. TOP HEADER BAR */}
      <header className="sticky top-0 z-40 bg-white/70 dark:bg-[#0b0f19]/70 backdrop-blur-md border-b border-slate-200 dark:border-slate-850 px-4 py-4 md:px-8">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* Logo Brand */}
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-gradient-to-br from-indigo-500 to-teal-400 text-white rounded-2xl shadow-md shadow-indigo-500/10">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-extrabold font-display leading-tight tracking-tight bg-gradient-to-r from-indigo-600 via-indigo-500 to-teal-400 bg-clip-text text-transparent dark:from-indigo-400 dark:via-indigo-350 dark:to-teal-350">
                MoneyFlow
              </h1>
              <p className="text-[10px] font-bold text-slate-450 uppercase tracking-widest hidden sm:block">Personal Ledger</p>
            </div>
          </div>

          {/* Desktop Navigation */}
          {!isDatabaseEmpty && (
            <nav className="hidden md:flex items-center bg-slate-100 dark:bg-slate-950 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-850">
              <button
                type="button"
                onClick={() => setActiveTab('dashboard')}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  activeTab === 'dashboard'
                    ? 'bg-white dark:bg-slate-850 text-indigo-650 dark:text-indigo-400 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-250'
                }`}
              >
                <LayoutDashboard className="w-4 h-4" /> Dashboard
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('insights')}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  activeTab === 'insights'
                    ? 'bg-white dark:bg-slate-850 text-indigo-650 dark:text-indigo-400 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-250'
                }`}
              >
                <AlertCircle className="w-4 h-4" /> Insights
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('transactions')}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  activeTab === 'transactions'
                    ? 'bg-white dark:bg-slate-850 text-indigo-650 dark:text-indigo-400 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-250'
                }`}
              >
                <Receipt className="w-4 h-4" /> Transactions
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('settings')}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  activeTab === 'settings'
                    ? 'bg-white dark:bg-slate-850 text-indigo-650 dark:text-indigo-400 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-250'
                }`}
              >
                <Settings className="w-4 h-4" /> Settings
              </button>
            </nav>
          )}

          {/* Privacy Lock Badge */}
          <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-full font-semibold">
            <Shield className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">100% Client-Side Privacy</span>
          </div>
        </div>
      </header>

      {/* Global Error Banner */}
      {errorMessage && (
        <div className="max-w-7xl mx-auto px-4 pt-6 md:px-8">
          <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 rounded-2xl text-xs font-semibold flex items-center justify-between gap-3 shadow-sm shadow-rose-500/5">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4.5 h-4.5 text-rose-500 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
            <button
              onClick={() => setErrorMessage(null)}
              className="px-2.5 py-1 bg-rose-500/10 hover:bg-rose-500/25 text-rose-600 dark:text-rose-400 rounded-lg text-[10px] font-extrabold uppercase transition-colors"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* 2. MAIN WORKSPACE CONTENT */}
      <main className="max-w-7xl mx-auto px-4 py-6 md:px-8">
        {isDatabaseEmpty ? (
          <DragDropZone />
        ) : (
          <div className="space-y-6">
            
            {/* View Renderings */}
            {activeTab === 'dashboard' && (
              <>
                {/* Uncategorized Review Prompt */}
                {transactions.length > 0 && (transactions.filter(t => t.category === 'Uncategorized').length / transactions.length) >= 0.1 && (
                  <div className="p-4 bg-amber-500/10 border border-amber-500/25 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm shadow-amber-500/5">
                    <div className="flex items-start sm:items-center gap-3">
                      <div className="p-2 bg-amber-500/20 text-amber-600 dark:text-amber-400 rounded-xl flex-shrink-0">
                        <Tag className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-800 dark:text-white font-display">Review Uncategorized Transactions</h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
                          {((transactions.filter(t => t.category === 'Uncategorized').length / transactions.length) * 100).toFixed(0)}% of your transactions ({transactions.filter(t => t.category === 'Uncategorized').length} items) are Uncategorized.
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setCategoryFilter('Uncategorized');
                        setActiveTab('transactions');
                      }}
                      className="w-full sm:w-auto px-4 py-2.5 bg-amber-550 hover:bg-amber-600 dark:bg-amber-500 dark:hover:bg-amber-600 text-white text-xs font-bold rounded-xl transition-colors shadow-md shadow-amber-500/10 active:scale-95"
                    >
                      Start Bulk Review
                    </button>
                  </div>
                )}
                
                <SummaryCards />
                
                {/* Visual Cash Flow Diagram */}
                <SankeyDiagram />

                {/* Donut break & Trends charts */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
                  <CategoryCharts />
                  <TrendChart />
                </div>
                
                {/* Ranking Tables */}
                <TopMerchants />
              </>
            )}

            {activeTab === 'insights' && <InsightList />}

            {activeTab === 'transactions' && <TransactionTable />}

            {activeTab === 'settings' && <SettingsPanel />}

          </div>
        )}
      </main>

      {/* 3. MOBILE BOTTOM NAVIGATION SYSTEM */}
      {!isDatabaseEmpty && (
        <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-[#151c2c]/95 backdrop-blur-lg border-t border-slate-200 dark:border-slate-800 p-2 md:hidden flex justify-around items-center shadow-lg">
          <button
            type="button"
            onClick={() => setActiveTab('dashboard')}
            className={`flex flex-col items-center gap-1 py-1 px-3 text-[10px] font-bold transition-all ${
              activeTab === 'dashboard'
                ? 'text-indigo-600 dark:text-indigo-400'
                : 'text-slate-400'
            }`}
          >
            <LayoutDashboard className="w-5 h-5" />
            <span>Dashboard</span>
          </button>
          
          <button
            type="button"
            onClick={() => setActiveTab('insights')}
            className={`flex flex-col items-center gap-1 py-1 px-3 text-[10px] font-bold transition-all ${
              activeTab === 'insights'
                ? 'text-indigo-600 dark:text-indigo-400'
                : 'text-slate-400'
            }`}
          >
            <AlertCircle className="w-5 h-5" />
            <span>Insights</span>
          </button>
          
          <button
            type="button"
            onClick={() => setActiveTab('transactions')}
            className={`flex flex-col items-center gap-1 py-1 px-3 text-[10px] font-bold transition-all ${
              activeTab === 'transactions'
                ? 'text-indigo-600 dark:text-indigo-400'
                : 'text-slate-400'
            }`}
          >
            <Receipt className="w-5 h-5" />
            <span>Ledger</span>
          </button>
          
          <button
            type="button"
            onClick={() => setActiveTab('settings')}
            className={`flex flex-col items-center gap-1 py-1 px-3 text-[10px] font-bold transition-all ${
              activeTab === 'settings'
                ? 'text-indigo-600 dark:text-indigo-400'
                : 'text-slate-400'
            }`}
          >
            <Settings className="w-5 h-5" />
            <span>Settings</span>
          </button>
        </nav>
      )}

    </div>
  );
}

export default App;
