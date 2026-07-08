import React, { useState } from 'react';
import { useFinance } from '../../context/FinanceContext';
import { DEFAULT_CATEGORIES, getCategoryIcon } from '../../services/categorizer';
import { Search, ArrowUpDown, Download, CheckSquare, Square, Tag, Calendar, Filter, Sparkles } from 'lucide-react';

export const TransactionTable = () => {
  const {
    filteredTransactions,
    editTransactionCategory,
    bulkEditTransactions,
    currencySymbol,
    statements,
    selectedStatementIds,
    setSelectedStatementIds,
    categoryFilter,
    setCategoryFilter,
    searchQuery,
    setSearchQuery,
    dateRange,
    setDateRange
  } = useFinance();

  // Pagination limit state
  const [displayLimit, setDisplayLimit] = useState(50);
  
  // Selection states
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  
  // Sorting state
  const [sortField, setSortField] = useState<'date' | 'amount' | 'description'>('date');
  const [sortAsc, setSortAsc] = useState(false);

  // Bulk operation states
  const [bulkCategory, setBulkCategory] = useState('');

  // Sort & Paginated Transactions computation
  const processedTransactions = React.useMemo(() => {
    const items = [...filteredTransactions];
    items.sort((a, b) => {
      let comparison = 0;
      if (sortField === 'date') {
        comparison = a.date.localeCompare(b.date);
      } else if (sortField === 'amount') {
        comparison = a.amount - b.amount;
      } else if (sortField === 'description') {
        comparison = a.description.localeCompare(b.description);
      }
      return sortAsc ? comparison : -comparison;
    });
    return items;
  }, [filteredTransactions, sortField, sortAsc]);

  const displayedTransactions = processedTransactions.slice(0, displayLimit);

  const toggleSort = (field: 'date' | 'amount' | 'description') => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  // Selection handlers
  const handleSelectRow = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(x => x !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleSelectAll = () => {
    const pageIds = displayedTransactions.map(t => t.id);
    const allOnPageSelected = pageIds.every(id => selectedIds.includes(id));
    
    if (allOnPageSelected) {
      setSelectedIds(selectedIds.filter(id => !pageIds.includes(id)));
    } else {
      setSelectedIds([...new Set([...selectedIds, ...pageIds])]);
    }
  };

  const handleBulkApplyCategory = async () => {
    if (!bulkCategory) return;
    await bulkEditTransactions(selectedIds, { category: bulkCategory });
    setSelectedIds([]);
    setBulkCategory('');
  };

  // CSV Exporter
  const handleExportCSV = () => {
    const headers = ['Date', 'Description', 'Amount', 'Category', 'Account/Statement'];
    const rows = filteredTransactions.map(tx => {
      const stmtName = statements.find(s => s.id === tx.statementId)?.accountNickname || 'Unknown';
      return [
        tx.date,
        `"${tx.description.replace(/"/g, '""')}"`,
        tx.amount,
        tx.category,
        `"${stmtName}"`
      ];
    });

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
      
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `moneyflow_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatAmount = (num: number) => {
    const abs = Math.abs(num).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
    return `${num < 0 ? '-' : ''}${currencySymbol}${abs}`;
  };

  return (
    <div className="space-y-4">
      
      {/* Search and Filters panel */}
      <div className="bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-4">
        
        {/* Row 1: Search & Export */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="relative w-full md:max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search descriptions, categories, amounts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-850 bg-slate-50/50 dark:bg-slate-950/20 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
            />
          </div>

          <button
            type="button"
            onClick={handleExportCSV}
            className="w-full md:w-auto px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-750 dark:text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 border border-slate-200 dark:border-slate-750"
          >
            <Download className="w-4 h-4" /> Export CSV
          </button>
        </div>

        {/* Row 2: Advanced filters */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-slate-100 dark:border-slate-850">
          
          {/* Statement Account Filter */}
          <div>
            <label className="block text-[10px] font-bold text-slate-450 uppercase tracking-wider mb-1.5 flex items-center gap-1">
              <Filter className="w-3 h-3" /> Account Nickname
            </label>
            <select
              value={selectedStatementIds[0] || ''}
              onChange={(e) => setSelectedStatementIds(e.target.value ? [e.target.value] : [])}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 text-xs font-semibold focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">All Accounts</option>
              {statements.map(s => (
                <option key={s.id} value={s.id}>{s.accountNickname}</option>
              ))}
            </select>
          </div>

          {/* Category Dropdown Filter */}
          <div>
            <label className="block text-[10px] font-bold text-slate-450 uppercase tracking-wider mb-1.5 flex items-center gap-1">
              <Tag className="w-3 h-3" /> Filter Category
            </label>
            <select
              value={categoryFilter || ''}
              onChange={(e) => setCategoryFilter(e.target.value || null)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 text-xs font-semibold focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">All Categories</option>
              {DEFAULT_CATEGORIES.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {/* Inline Date Filter */}
          <div>
            <label className="block text-[10px] font-bold text-slate-450 uppercase tracking-wider mb-1.5 flex items-center gap-1">
              <Calendar className="w-3 h-3" /> Date range start
            </label>
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 text-xs font-semibold focus:ring-2 focus:ring-indigo-500"
            />
          </div>

        </div>
      </div>

      {/* Bulk actions Floating Toolbar */}
      {selectedIds.length > 0 && (
        <div className="p-4 bg-slate-950 text-white rounded-2xl flex flex-wrap items-center justify-between gap-3 shadow-xl border border-slate-800 animate-slide-in relative z-20">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-400 bg-slate-900 border border-slate-800 px-2.5 py-1 rounded-lg">
              {selectedIds.length} Selected
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            <select
              value={bulkCategory}
              onChange={(e) => setBulkCategory(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-slate-800 bg-slate-900 text-slate-200 text-xs font-semibold focus:outline-none"
            >
              <option value="">-- Apply Category --</option>
              {DEFAULT_CATEGORIES.filter(c => c !== 'Uncategorized').map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
            
            <button
              type="button"
              onClick={handleBulkApplyCategory}
              disabled={!bulkCategory}
              className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-650/40 text-white text-xs font-bold rounded-xl transition-all"
            >
              Apply
            </button>
            <button
              type="button"
              onClick={() => setSelectedIds([])}
              className="px-3 py-1.5 hover:bg-slate-900 text-slate-400 hover:text-white text-xs font-semibold rounded-xl"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Grid or Cards lists based on mobile breakpoint */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
        
        {/* DESKTOP TABLE VIEW */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-950 text-slate-400 dark:text-slate-500 border-b border-slate-150 dark:border-slate-850 font-bold select-none uppercase tracking-wider">
                <th className="p-4 w-10 text-center">
                  <button type="button" onClick={handleSelectAll} className="text-slate-400 hover:text-slate-650">
                    {displayedTransactions.every(id => selectedIds.includes(id.id)) ? (
                      <CheckSquare className="w-4.5 h-4.5 text-indigo-500" />
                    ) : (
                      <Square className="w-4.5 h-4.5" />
                    )}
                  </button>
                </th>
                
                <th onClick={() => toggleSort('date')} className="p-4 cursor-pointer hover:text-slate-700 dark:hover:text-slate-350">
                  <div className="flex items-center gap-1.5 font-bold">
                    Date {sortField === 'date' && <ArrowUpDown className="w-3.5 h-3.5" />}
                  </div>
                </th>
                
                <th onClick={() => toggleSort('description')} className="p-4 cursor-pointer hover:text-slate-700 dark:hover:text-slate-350">
                  <div className="flex items-center gap-1.5 font-bold">
                    Description {sortField === 'description' && <ArrowUpDown className="w-3.5 h-3.5" />}
                  </div>
                </th>
                
                <th className="p-4 font-bold">Category</th>
                
                <th className="p-4 font-bold">Source File</th>
                
                <th onClick={() => toggleSort('amount')} className="p-4 text-right cursor-pointer hover:text-slate-700 dark:hover:text-slate-350">
                  <div className="flex items-center justify-end gap-1.5 font-bold">
                    Amount {sortField === 'amount' && <ArrowUpDown className="w-3.5 h-3.5" />}
                  </div>
                </th>
              </tr>
            </thead>
            
            <tbody className="divide-y divide-slate-150 dark:divide-slate-850">
              {displayedTransactions.map((tx) => {
                const isSelected = selectedIds.includes(tx.id);
                const stmtNickname = statements.find(s => s.id === tx.statementId)?.accountNickname || 'Demo file';
                
                return (
                  <tr 
                    key={tx.id} 
                    className={`hover:bg-slate-50/50 dark:hover:bg-slate-900/40 text-slate-750 dark:text-slate-300 transition-colors ${
                      isSelected ? 'bg-indigo-500/[0.03] dark:bg-indigo-500/[0.01]' : ''
                    }`}
                  >
                    {/* Checkbox select */}
                    <td className="p-4 text-center">
                      <button type="button" onClick={() => handleSelectRow(tx.id)} className="text-slate-400 hover:text-indigo-600">
                        {isSelected ? (
                          <CheckSquare className="w-4.5 h-4.5 text-indigo-500" />
                        ) : (
                          <Square className="w-4.5 h-4.5" />
                        )}
                      </button>
                    </td>

                    {/* Date */}
                    <td className="p-4 font-medium whitespace-nowrap">{tx.date}</td>

                    {/* Description */}
                    <td className="p-4 font-bold tracking-tight max-w-[200px] truncate" title={tx.description}>
                      {tx.description}
                    </td>

                    {/* Category Selection Select menu inline */}
                    <td className="p-4">
                      <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                        <select
                          value={tx.category}
                          onChange={(e) => editTransactionCategory(tx.id, e.target.value)}
                          className={`px-3 py-1 rounded-full text-[10px] font-bold border transition-colors ${
                            tx.category === 'Uncategorized'
                              ? 'bg-rose-500/10 text-rose-500 border-rose-500/20'
                              : tx.isUserOverridden
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-405 border-emerald-500/20'
                              : tx.confidence === 'medium'
                              ? 'bg-amber-500/5 text-amber-600 dark:text-amber-400 border-dashed border-amber-500/40'
                              : 'bg-indigo-500/10 text-indigo-650 dark:text-indigo-400 border-indigo-500/20'
                          }`}
                        >
                          {DEFAULT_CATEGORIES.map(cat => (
                            <option key={cat} value={cat} className="text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-900 font-semibold">
                              {getCategoryIcon(cat)} {cat}
                            </option>
                          ))}
                        </select>
                        
                        {!tx.isUserOverridden && tx.confidence === 'medium' && (
                          <button
                            type="button"
                            onClick={() => editTransactionCategory(tx.id, tx.category)}
                            title="Auto-detected category. Click to confirm."
                            className="p-1 text-amber-500 hover:text-emerald-550 hover:bg-emerald-550/10 rounded-full transition-colors animate-pulse flex-shrink-0"
                          >
                            <Sparkles className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </td>

                    {/* Statement Nickname */}
                    <td className="p-4 font-medium text-slate-400 whitespace-nowrap">{stmtNickname}</td>

                    {/* Amount */}
                    <td className="p-4 text-right">
                      <span className={`font-extrabold font-tabular text-sm ${
                        tx.amount > 0 ? 'text-emerald-500' : 'text-slate-900 dark:text-white'
                      }`}>
                        {formatAmount(tx.amount)}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* MOBILE CARDS LIST VIEW */}
        <div className="block md:hidden divide-y divide-slate-150 dark:divide-slate-850">
          {displayedTransactions.map((tx) => {
            const isSelected = selectedIds.includes(tx.id);
            const stmtNickname = statements.find(s => s.id === tx.statementId)?.accountNickname || 'Demo';
            
            return (
              <div 
                key={tx.id} 
                onClick={() => handleSelectRow(tx.id)}
                className={`p-4 space-y-3 cursor-pointer active:bg-slate-100 dark:active:bg-slate-950 transition-colors ${
                  isSelected ? 'bg-indigo-500/[0.03] dark:bg-indigo-500/[0.01]' : ''
                }`}
              >
                {/* Header details */}
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-xs font-extrabold text-slate-900 dark:text-white truncate" title={tx.description}>
                      {tx.description}
                    </p>
                    <p className="text-[10px] font-semibold text-slate-400 mt-1">{tx.date} • {stmtNickname}</p>
                  </div>
                  
                  <div className="text-right flex-shrink-0">
                    <span className={`text-sm font-extrabold font-tabular ${
                      tx.amount > 0 ? 'text-emerald-500' : 'text-slate-900 dark:text-white'
                    }`}>
                      {formatAmount(tx.amount)}
                    </span>
                  </div>
                </div>

                {/* Footer category tag selector */}
                <div className="flex items-center justify-between gap-3 pt-2">
                  <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                    <select
                      value={tx.category}
                      onChange={(e) => editTransactionCategory(tx.id, e.target.value)}
                      className={`px-3 py-1 rounded-full text-[9px] font-bold border transition-colors ${
                        tx.category === 'Uncategorized'
                          ? 'bg-rose-500/10 text-rose-500 border-rose-500/20'
                          : tx.isUserOverridden
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-405 border-emerald-500/20'
                          : tx.confidence === 'medium'
                          ? 'bg-amber-500/5 text-amber-600 dark:text-amber-400 border-dashed border-amber-500/40'
                          : 'bg-indigo-500/10 text-indigo-650 dark:text-indigo-400 border-indigo-500/20'
                      }`}
                    >
                      {DEFAULT_CATEGORIES.map(cat => (
                        <option key={cat} value={cat} className="text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-900 font-semibold">
                          {getCategoryIcon(cat)} {cat}
                        </option>
                      ))}
                    </select>
                    
                    {!tx.isUserOverridden && tx.confidence === 'medium' && (
                      <button
                        type="button"
                        onClick={() => editTransactionCategory(tx.id, tx.category)}
                        title="Auto-detected category. Click to confirm."
                        className="p-1 text-amber-500 hover:text-emerald-550 hover:bg-emerald-550/10 rounded-full transition-colors animate-pulse"
                      >
                        <Sparkles className="w-2.5 h-2.5" />
                      </button>
                    )}
                  </div>
                  
                  <span className="text-[10px] text-slate-400 font-semibold">
                    {isSelected ? (
                      <CheckSquare className="w-4 h-4 text-indigo-500 inline" />
                    ) : (
                      <Square className="w-4 h-4 text-slate-400 inline" />
                    )}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Empty Search results State */}
        {displayedTransactions.length === 0 && (
          <div className="text-center py-16">
            <p className="text-sm font-semibold text-slate-405">No transactions matched your search or filters.</p>
          </div>
        )}

      </div>

      {/* Pagination Load More Button */}
      {processedTransactions.length > displayLimit && (
        <div className="flex justify-center pt-2">
          <button
            type="button"
            onClick={() => setDisplayLimit(prev => prev + 50)}
            className="px-6 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-850 text-indigo-600 dark:text-indigo-400 text-xs font-bold shadow-sm transition-all"
          >
            Load 50 More Transactions
          </button>
        </div>
      )}

    </div>
  );
};
