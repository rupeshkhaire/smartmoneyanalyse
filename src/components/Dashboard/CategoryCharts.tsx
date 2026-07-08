import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { useFinance } from '../../context/FinanceContext';
import { CATEGORY_COLORS } from '../../services/categorizer';

export const CategoryCharts = () => {
  const { filteredTransactions, currencySymbol, setCategoryFilter, setActiveTab } = useFinance();

  const chartData = React.useMemo(() => {
    const expensesByCategory: { [cat: string]: number } = {};
    let totalExpense = 0;

    filteredTransactions.forEach(tx => {
      // We only count negative values that are not Transfers
      if (tx.amount < 0 && tx.category !== 'Transfers') {
        const cat = tx.category || 'Uncategorized';
        const absAmt = Math.abs(tx.amount);
        expensesByCategory[cat] = (expensesByCategory[cat] || 0) + absAmt;
        totalExpense += absAmt;
      }
    });

    return Object.entries(expensesByCategory)
      .map(([name, value]) => ({
        name,
        value,
        percentage: totalExpense > 0 ? (value / totalExpense) * 100 : 0
      }))
      .sort((a, b) => b.value - a.value);
  }, [filteredTransactions]);

  const handleSliceClick = (entry: any) => {
    if (entry && entry.name) {
      setCategoryFilter(entry.name);
      setActiveTab('transactions');
    }
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-slate-900 border border-slate-850 text-white p-3 rounded-2xl shadow-xl text-xs font-semibold">
          <p className="text-slate-400 font-bold mb-1">{data.name}</p>
          <p className="text-indigo-400 font-tabular text-sm font-extrabold">
            {currencySymbol}{data.value.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5 font-medium">
            {data.percentage.toFixed(1)}% of total outflows
          </p>
        </div>
      );
    }
    return null;
  };

  if (chartData.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-xl shadow-slate-100/70 dark:shadow-black/20 h-full flex flex-col justify-center items-center py-16 text-center">
        <p className="text-sm font-semibold text-slate-400">No expenses recorded for this period</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-xl shadow-slate-100/70 dark:shadow-black/20 flex flex-col h-full">
      <div>
        <h3 className="text-lg font-bold font-display text-slate-900 dark:text-white">Expense Outflow Share</h3>
        <p className="text-xs text-slate-400 mt-0.5">Interactive share breakdown of your expenses</p>
      </div>

      <div className="flex-1 min-h-[260px] flex items-center justify-center mt-4 relative">
        <ResponsiveContainer width="100%" height={260}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={65}
              outerRadius={90}
              paddingAngle={2}
              dataKey="value"
              onClick={handleSliceClick}
              className="outline-none"
            >
              {chartData.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={CATEGORY_COLORS[entry.name] || '#6b7280'} 
                  className="cursor-pointer hover:opacity-85 transition-opacity outline-none"
                />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>

        {/* Center Text displaying total expenses */}
        <div className="absolute text-center pointer-events-none">
          <span className="text-[10px] uppercase font-extrabold text-slate-400 tracking-wider">Total Outflow</span>
          <h4 className="text-xl font-extrabold font-tabular text-slate-800 dark:text-white mt-0.5">
            {currencySymbol}
            {chartData.reduce((sum, item) => sum + item.value, 0).toLocaleString('en-IN', {
              minimumFractionDigits: 0,
              maximumFractionDigits: 0
            })}
          </h4>
        </div>
      </div>

      {/* Legend Grid */}
      <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 max-h-[140px] overflow-y-auto pr-1">
        {chartData.slice(0, 8).map((item) => (
          <div 
            key={item.name}
            onClick={() => handleSliceClick(item)}
            className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/40 p-1.5 rounded-lg transition-colors group"
          >
            <span 
              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
              style={{ backgroundColor: CATEGORY_COLORS[item.name] || '#6b7280' }}
            ></span>
            <span className="text-xs font-semibold text-slate-650 dark:text-slate-400 truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
              {item.name}
            </span>
            <span className="text-[10px] font-tabular font-bold text-slate-400 ml-auto group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
              {item.percentage.toFixed(0)}%
            </span>
          </div>
        ))}
        {chartData.length > 8 && (
          <div className="col-span-2 text-center text-[10px] font-semibold text-slate-400 mt-1 border-t border-slate-100 dark:border-slate-800 pt-2">
            + {chartData.length - 8} more categories
          </div>
        )}
      </div>
    </div>
  );
};
