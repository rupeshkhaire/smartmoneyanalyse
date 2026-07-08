import React from 'react';
import { useFinance } from '../../context/FinanceContext';
import { TrendingDown, CreditCard } from 'lucide-react';
import { CATEGORY_COLORS, getCategoryIcon } from '../../services/categorizer';

export const TopMerchants = () => {
  const { filteredTransactions, currencySymbol, setSearchQuery, setActiveTab } = useFinance();

  // 1. Calculate Largest Individual Transactions
  const topTransactions = React.useMemo(() => {
    return filteredTransactions
      .filter(tx => tx.amount < 0 && tx.category !== 'Transfers')
      .sort((a, b) => a.amount - b.amount) // amount is negative, so smallest (most negative) comes first
      .slice(0, 5);
  }, [filteredTransactions]);

  // 2. Calculate Largest Total Spending by Merchant
  const topMerchants = React.useMemo(() => {
    const merchantTotals: { [desc: string]: { amount: number; count: number; category: string } } = {};
    
    
    filteredTransactions
      .filter(tx => tx.amount < 0 && tx.category !== 'Transfers')
      .forEach(tx => {
        // Look up the clean name from the description
        const name = tx.description;
        if (!merchantTotals[name]) {
          merchantTotals[name] = { amount: 0, count: 0, category: tx.category };
        }
        merchantTotals[name].amount += Math.abs(tx.amount);
        merchantTotals[name].count += 1;
      });

    // Grouping: let's try to group descriptions that share the same extracted payee
    const groupedTotals: { [payee: string]: { amount: number; count: number; category: string } } = {};
    Object.entries(merchantTotals).forEach(([desc, data]) => {
      const parts = desc.split('/');
      // Fallback clean payee
      let payee = desc;
      if (desc.toUpperCase().startsWith('UPI/') && parts.length > 2) {
        payee = parts[2].trim();
      } else if (desc.includes('ZEPTO')) {
        payee = 'ZEPTO MARKETPLACE';
      } else if (desc.includes('ZOMATO')) {
        payee = 'ZOMATO';
      } else if (desc.includes('SWIGGY')) {
        payee = 'SWIGGY';
      } else if (desc.includes('BLINKIT')) {
        payee = 'BLINKIT';
      } else if (desc.includes('UBER')) {
        payee = 'UBER';
      } else if (desc.includes('OLA')) {
        payee = 'OLA';
      } else if (desc.includes('JIO')) {
        payee = 'JIO';
      }
      
      // Capitalize first letters of words for display beauty
      payee = payee.replace(/[^A-Za-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
      // Keep only up to 22 characters
      if (payee.length > 22) {
        payee = payee.substring(0, 22) + '...';
      }
      
      if (!groupedTotals[payee]) {
        groupedTotals[payee] = { amount: 0, count: 0, category: data.category };
      }
      groupedTotals[payee].amount += data.amount;
      groupedTotals[payee].count += data.count;
    });

    return Object.entries(groupedTotals)
      .map(([name, data]) => ({
        name,
        total: data.amount,
        count: data.count,
        category: data.category
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
  }, [filteredTransactions]);

  const handleMerchantClick = (name: string) => {
    const query = name.replace('...', '');
    setSearchQuery(query);
    setActiveTab('transactions');
  };

  const handleTxClick = (desc: string) => {
    setSearchQuery(desc);
    setActiveTab('transactions');
  };

  const formatAmount = (num: number) => {
    return `${currencySymbol}${num.toLocaleString('en-IN', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    })}`;
  };

  const hasData = topTransactions.length > 0;

  if (!hasData) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
      
      {/* Largest Single Outflows */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-xl shadow-slate-100/70 dark:shadow-black/20 flex flex-col justify-between">
        <div>
          <h3 className="text-lg font-bold font-display text-slate-900 dark:text-white flex items-center gap-2">
            <TrendingDown className="w-5 h-5 text-rose-500" />
            Largest Single Expenses
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">Top 5 biggest individual debit transactions</p>
        </div>

        <div className="mt-5 space-y-3">
          {topTransactions.map((tx, idx) => {
            const catColor = CATEGORY_COLORS[tx.category] || '#f43f5e';
            return (
              <div 
                key={tx.id} 
                onClick={() => handleTxClick(tx.description)}
                className="flex items-center gap-3 p-3 pl-3 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-850 cursor-pointer transition-all group relative overflow-hidden"
                style={{ borderLeft: `4px solid ${catColor}` }}
              >
                <div 
                  className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs flex-shrink-0 group-hover:scale-105 transition-transform"
                  style={{ backgroundColor: `${catColor}15`, color: catColor }}
                >
                  #{idx + 1}
                </div>
                
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate group-hover:text-indigo-650 dark:group-hover:text-indigo-400" title={tx.description}>
                    {tx.description}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span 
                      className="text-[9px] font-bold px-2 py-0.5 rounded-full"
                      style={{ backgroundColor: `${catColor}15`, color: catColor }}
                    >
                      {getCategoryIcon(tx.category)} {tx.category}
                    </span>
                    <span className="text-[10px] font-semibold text-slate-400">{tx.date}</span>
                  </div>
                </div>
                
                <div className="text-right flex-shrink-0">
                  <span className="text-xs font-extrabold font-tabular text-slate-900 dark:text-white">
                    {formatAmount(Math.abs(tx.amount))}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Top Aggregated Merchants */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-xl shadow-slate-100/70 dark:shadow-black/20 flex flex-col justify-between">
        <div>
          <h3 className="text-lg font-bold font-display text-slate-900 dark:text-white flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-indigo-500" />
            Top Spends by Merchant
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">Top 5 merchants by accumulated spending total</p>
        </div>

        <div className="mt-5 space-y-3">
          {topMerchants.map((merch, idx) => {
            const catColor = CATEGORY_COLORS[merch.category] || '#6366f1';
            return (
              <div 
                key={idx} 
                onClick={() => handleMerchantClick(merch.name)}
                className="flex items-center gap-3 p-3 pl-3 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-850 cursor-pointer transition-all group relative overflow-hidden"
                style={{ borderLeft: `4px solid ${catColor}` }}
              >
                <div 
                  className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs flex-shrink-0 group-hover:scale-105 transition-transform"
                  style={{ backgroundColor: `${catColor}15`, color: catColor }}
                >
                  #{idx + 1}
                </div>
                
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate group-hover:text-indigo-650 dark:group-hover:text-indigo-400">
                    {merch.name}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span 
                      className="text-[9px] font-bold px-2 py-0.5 rounded-full"
                      style={{ backgroundColor: `${catColor}15`, color: catColor }}
                    >
                      {getCategoryIcon(merch.category)} {merch.category}
                    </span>
                    <span className="text-[10px] font-semibold text-slate-400">{merch.count} transactions</span>
                  </div>
                </div>
                
                <div className="text-right flex-shrink-0">
                  <span className="text-xs font-extrabold font-tabular text-slate-900 dark:text-white">
                    {formatAmount(merch.total)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
};
