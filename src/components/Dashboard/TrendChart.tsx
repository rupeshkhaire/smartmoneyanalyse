import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useFinance } from '../../context/FinanceContext';

export const TrendChart = () => {
  const { monthlySummaries, currencySymbol } = useFinance();

  const formattedData = React.useMemo(() => {
    return monthlySummaries.map(summary => {
      // Parse YYYY-MM into human friendly label like "Jan 2026"
      const [year, month] = summary.monthKey.split('-');
      const date = new Date(Number(year), Number(month) - 1, 1);
      const label = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

      return {
        month: label,
        income: Math.round(summary.income),
        expenses: Math.round(summary.expenses),
        net: Math.round(summary.net)
      };
    });
  }, [monthlySummaries]);

  const formatYAxis = (value: number) => {
    return `${currencySymbol}${value.toLocaleString(undefined, { notation: 'compact' })}`;
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900 border border-slate-800 text-white p-3.5 rounded-2xl shadow-xl text-xs font-semibold space-y-1.5">
          <p className="text-slate-400 font-bold">{label}</p>
          <div className="flex justify-between gap-6">
            <span className="text-emerald-400 font-semibold">Income:</span>
            <span className="font-tabular text-slate-100">{currencySymbol}{payload[0].value.toLocaleString()}</span>
          </div>
          <div className="flex justify-between gap-6">
            <span className="text-rose-400 font-semibold">Expenses:</span>
            <span className="font-tabular text-slate-100">{currencySymbol}{payload[1].value.toLocaleString()}</span>
          </div>
          <div className="border-t border-slate-800 pt-1.5 mt-1 flex justify-between gap-6">
            <span className="text-slate-400 font-semibold">Net Savings:</span>
            <span className={`font-tabular font-bold ${payload[0].value - payload[1].value >= 0 ? 'text-teal-400' : 'text-rose-455'}`}>
              {currencySymbol}{(payload[0].value - payload[1].value).toLocaleString()}
            </span>
          </div>
        </div>
      );
    }
    return null;
  };

  if (monthlySummaries.length === 0) {
    return null;
  }

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-xl shadow-slate-100/70 dark:shadow-black/20 h-full flex flex-col">
      <div>
        <h3 className="text-lg font-bold font-display text-slate-900 dark:text-white">Cashflow Trend</h3>
        <p className="text-xs text-slate-400 mt-0.5">Month-over-month comparison of your income and expenses</p>
      </div>

      <div className="flex-1 min-h-[260px] mt-6">
        <ResponsiveContainer width="100%" height={260}>
          <BarChart
            data={formattedData}
            margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
            barSize={32}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148, 163, 184, 0.15)" />
            <XAxis 
              dataKey="month" 
              tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 500 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis 
              tickFormatter={formatYAxis} 
              tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 500 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(148, 163, 184, 0.05)', radius: 8 }} />
            <Legend 
              verticalAlign="top" 
              align="right" 
              iconSize={8}
              iconType="circle"
              wrapperStyle={{ paddingBottom: 15, fontSize: 11, fontWeight: 600 }}
            />
            <Bar 
              name="Income" 
              dataKey="income" 
              fill="#10b981" 
              radius={[6, 6, 0, 0]} 
              className="cursor-pointer"
            />
            <Bar 
              name="Expenses" 
              dataKey="expenses" 
              fill="#f43f5e" 
              radius={[6, 6, 0, 0]} 
              className="cursor-pointer"
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
