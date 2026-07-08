import React, { useState } from 'react';
import { useFinance } from '../../context/FinanceContext';
import { DEFAULT_CATEGORIES } from '../../services/categorizer';
import { Trash2, Plus, BadgeAlert, Sun, Moon } from 'lucide-react';

export const SettingsPanel = () => {
  const {
    statements,
    deleteStatement,
    rules,
    createRule,
    removeRule,
    theme,
    toggleTheme,
    currencySymbol,
    setCurrencySymbol,
    resetDatabase
  } = useFinance();

  // Rule form states
  const [newKeyword, setNewKeyword] = useState('');
  const [newCategory, setNewCategory] = useState(DEFAULT_CATEGORIES[0]);

  // Database wipe states
  const [showWipeConfirm, setShowWipeConfirm] = useState(false);

  const handleCreateRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyword.trim() || !newCategory) return;
    await createRule(newKeyword.trim(), newCategory);
    setNewKeyword('');
  };

  const handleWipeDatabase = async () => {
    await resetDatabase();
    setShowWipeConfirm(false);
    window.location.reload();
  };

  return (
    <div className="space-y-6">
      
      {/* 1. Account / Statement management */}
      <div className="bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
        <h3 className="text-lg font-bold font-display text-slate-900 dark:text-white">Uploaded Statements</h3>
        <p className="text-xs text-slate-400 mt-0.5">Manage and remove statement data files stored in IndexedDB.</p>
        
        {statements.length === 0 ? (
          <div className="mt-5 p-4 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl text-center text-xs font-semibold text-slate-400">
            No statements loaded. Go to the dashboard/landing page to upload.
          </div>
        ) : (
          <div className="mt-5 space-y-3">
            {statements.map(stmt => (
              <div 
                key={stmt.id} 
                className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-950 border border-slate-150 dark:border-slate-850 rounded-2xl group transition-all"
              >
                <div className="min-w-0 pr-4">
                  <p className="text-xs font-bold text-slate-850 dark:text-white truncate">
                    {stmt.accountNickname}
                  </p>
                  <p className="text-[10px] font-semibold text-slate-400 mt-1">
                    {stmt.name} • {stmt.transactionCount} items • Range: {stmt.startDate} to {stmt.endDate}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => deleteStatement(stmt.id)}
                  className="p-2.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 rounded-xl transition-colors opacity-90 group-hover:opacity-100"
                  title="Delete Statement"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 2. Categorization Rules Manager */}
      <div className="bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
        <h3 className="text-lg font-bold font-display text-slate-900 dark:text-white">Smart Categorization Rules</h3>
        <p className="text-xs text-slate-400 mt-0.5">Define text matching keywords. Transactions matching these descriptions will automatically map to the selected category.</p>

        {/* Create Rule Form */}
        <form onSubmit={handleCreateRule} className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <input
            type="text"
            placeholder="Description contains e.g. UBER"
            value={newKeyword}
            onChange={(e) => setNewKeyword(e.target.value)}
            className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20 text-slate-800 dark:text-slate-100 placeholder-slate-400 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <select
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-850 dark:text-slate-205 text-xs font-bold focus:ring-2 focus:ring-indigo-500"
          >
            {DEFAULT_CATEGORIES.filter(c => c !== 'Uncategorized').map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
          <button
            type="submit"
            disabled={!newKeyword.trim()}
            className="px-4 py-2 bg-indigo-650 hover:bg-indigo-700 disabled:bg-indigo-600/40 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-all"
          >
            <Plus className="w-4 h-4" /> Add Pattern Rule
          </button>
        </form>

        {/* Existing Rules List */}
        {rules.length > 0 && (
          <div className="mt-6 border-t border-slate-100 dark:border-slate-850 pt-5 space-y-2">
            <div className="text-[10px] font-bold text-slate-405 uppercase tracking-wider mb-2">Active Mapping Rules</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {rules.map(rule => (
                <div key={rule.id} className="flex items-center justify-between px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-150 dark:border-slate-850 rounded-xl text-xs">
                  <div className="min-w-0 pr-4">
                    <span className="font-bold text-slate-800 dark:text-slate-200">"{rule.keyword}"</span>
                    <span className="text-slate-400 font-semibold mx-1.5">→</span>
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                      {rule.category}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeRule(rule.id)}
                    className="text-slate-400 hover:text-rose-500 p-1 rounded-lg transition-colors"
                    title="Remove Rule"
                  >
                    <Plus className="w-4 h-4 rotate-45" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 3. Preferences */}
      <div className="bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-800 rounded-3xl p-6 shadow-sm grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div>
          <h3 className="text-lg font-bold font-display text-slate-900 dark:text-white">App Appearance</h3>
          <p className="text-xs text-slate-400 mt-0.5">Toggle between light and dark backgrounds.</p>
          
          <button
            type="button"
            onClick={toggleTheme}
            className="mt-4 px-4 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2 transition-colors"
          >
            {theme === 'dark' ? (
              <>
                <Sun className="w-4.5 h-4.5 text-amber-500" />
                Switch to Light Mode
              </>
            ) : (
              <>
                <Moon className="w-4.5 h-4.5 text-indigo-500" />
                Switch to Dark Mode
              </>
            )}
          </button>
        </div>

        <div>
          <h3 className="text-lg font-bold font-display text-slate-900 dark:text-white">Currency Symbol</h3>
          <p className="text-xs text-slate-400 mt-0.5">Select your local currency formatting.</p>
          
          <div className="flex gap-2 mt-4 bg-slate-50 dark:bg-slate-950 border border-slate-150 dark:border-slate-850 p-1.5 rounded-xl max-w-xs">
            {['$', '€', '£', '¥', '₹'].map(symbol => (
              <button
                key={symbol}
                type="button"
                onClick={() => setCurrencySymbol(symbol)}
                className={`flex-1 py-1 px-2.5 rounded-lg text-xs font-bold transition-all ${
                  currencySymbol === symbol
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-550 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {symbol}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 4. Danger Database wipe */}
      <div className="bg-rose-500/5 dark:bg-rose-500/10 border border-rose-500/20 rounded-3xl p-6 shadow-sm">
        <div className="flex items-start gap-4">
          <BadgeAlert className="w-6 h-6 text-rose-500 flex-shrink-0" />
          <div className="space-y-4">
            <div>
              <h3 className="text-base font-bold font-display text-slate-900 dark:text-white">Danger Zone</h3>
              <p className="text-xs text-slate-500 dark:text-slate-450 mt-1 max-w-xl leading-relaxed">
                Delete all database content permanently. This action removes statement indices, custom pattern matchers, and manual transaction overrides. This processes locally and cannot be undone.
              </p>
            </div>

            {showWipeConfirm ? (
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleWipeDatabase}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-md shadow-rose-600/10 transition-all"
                >
                  Yes, Purge Database
                </button>
                <button
                  type="button"
                  onClick={() => setShowWipeConfirm(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-750 dark:text-slate-200 text-xs font-bold rounded-xl transition-all"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowWipeConfirm(true)}
                className="px-4 py-2.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 text-xs font-bold rounded-xl transition-all"
              >
                Delete All My Data
              </button>
            )}
          </div>
        </div>
      </div>

    </div>
  );
};
