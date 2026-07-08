import { type Transaction } from './db';
import { categorizerService } from './categorizer';

export interface Insight {
  id: string;
  type: 'subscription' | 'rising_trend' | 'new_merchant' | 'anomaly' | 'recurring_payment';
  title: string;
  description: string;
  severity: 'info' | 'warning' | 'danger';
  category?: string;
  merchant?: string;
  amount?: number;
  percentageChange?: number;
  relatedTransactionIds: string[];
}

export interface MonthSummary {
  monthKey: string; // YYYY-MM
  income: number;
  expenses: number;
  net: number;
  categories: { [category: string]: number };
}

export const analyzerService = {
  /**
   * Groups transactions by month and returns summary stats for each month.
   */
  getMonthlySummaries(transactions: Transaction[]): MonthSummary[] {
    const summaries: { [key: string]: MonthSummary } = {};

    // Filter out transfer-like transactions to prevent inflating figures
    const activeTx = transactions.filter(t => t.category !== 'Transfers');

    activeTx.forEach(tx => {
      const monthKey = tx.date.substring(0, 7); // "YYYY-MM"
      if (!summaries[monthKey]) {
        summaries[monthKey] = {
          monthKey,
          income: 0,
          expenses: 0,
          net: 0,
          categories: {}
        };
      }

      const sum = summaries[monthKey];
      if (tx.amount > 0) {
        sum.income += tx.amount;
      } else {
        const absAmt = Math.abs(tx.amount);
        sum.expenses += absAmt;
        sum.categories[tx.category] = (sum.categories[tx.category] || 0) + absAmt;
      }
      sum.net = sum.income - sum.expenses;
    });

    return Object.values(summaries).sort((a, b) => a.monthKey.localeCompare(b.monthKey));
  },

  /**
   * Scans transaction history and extracts financial insights (subscriptions, growth, anomalies, etc.)
   */
  detectInsights(transactions: Transaction[], ignoredInsightIds: string[] = []): Insight[] {
    const insights: Insight[] = [];
    if (transactions.length === 0) return [];

    // Sort transactions chronologically
    const sortedTx = [...transactions].sort((a, b) => a.date.localeCompare(b.date));
    
    // Group transactions by month
    const monthlyGroups: { [month: string]: Transaction[] } = {};
    sortedTx.forEach(tx => {
      const month = tx.date.substring(0, 7); // YYYY-MM
      if (!monthlyGroups[month]) monthlyGroups[month] = [];
      monthlyGroups[month].push(tx);
    });

    const months = Object.keys(monthlyGroups).sort();
    if (months.length < 2) {
      // Return early with limited insights if only 1 month exists, but we can still detect anomalies and new recurring payments
      const anomalyInsights = this.detectAnomalies(sortedTx);
      const recurringInsights = this.detectRecurringPayments(sortedTx);
      return [...anomalyInsights, ...recurringInsights].filter(ins => !ignoredInsightIds.includes(ins.id));
    }

    const latestMonth = months[months.length - 1];
    const priorMonths = months.slice(0, months.length - 1);
    
    const latestTx = monthlyGroups[latestMonth];
    const priorTx = priorMonths.flatMap(m => monthlyGroups[m]);

    // 1. Detect Subscriptions (recurring charges appearing across consecutive months)
    const subscriptions = this.detectSubscriptions(sortedTx);
    insights.push(...subscriptions);

    // 2. Detect Recurring Payments (larger P2P or Uncategorized monthly outflows)
    const recurringPayments = this.detectRecurringPayments(sortedTx);
    insights.push(...recurringPayments);

    // 3. Detect Rising Category Spending (>20% growth) MoM
    const risingTrends = this.detectRisingTrends(transactions, months);
    insights.push(...risingTrends);

    // 4. Detect New Merchants
    const newMerchants = this.detectNewMerchants(latestTx, priorTx);
    insights.push(...newMerchants);

    // 5. Detect Large Anomalies vs Historical Category Average
    const anomalies = this.detectAnomalies(sortedTx);
    insights.push(...anomalies);

    // Filter out ignored insights and return
    return insights.filter(ins => !ignoredInsightIds.includes(ins.id));
  },

  /**
   * Group transactions by cleaned merchant name and check if they occur in at least 2 consecutive months with similar amounts.
   */
  detectSubscriptions(transactions: Transaction[]): Insight[] {
    const insights: Insight[] = [];
    const expenses = transactions.filter(t => t.amount < 0 && t.category !== 'Transfers');

    // Group by cleaned merchant
    const merchantGroups: { [merchant: string]: Transaction[] } = {};
    expenses.forEach(tx => {
      const clean = categorizerService.extractMerchantPayee(tx.description);
      if (clean.length < 3) return; // ignore short descriptions
      if (!merchantGroups[clean]) merchantGroups[clean] = [];
      merchantGroups[clean].push(tx);
    });

    Object.entries(merchantGroups).forEach(([merchant, txs]) => {
      // Needs to appear at least 2 times, ideally in different months
      const uniqueMonths = new Set(txs.map(t => t.date.substring(0, 7)));
      if (uniqueMonths.size < 2) return;

      // Group transactions of this merchant by amount range (+/- 10%)
      const amountGroups: Transaction[][] = [];
      txs.forEach(tx => {
        const absAmt = Math.abs(tx.amount);
        let placed = false;
        for (const group of amountGroups) {
          const avgAmt = group.reduce((sum, t) => sum + Math.abs(t.amount), 0) / group.length;
          if (Math.abs(absAmt - avgAmt) / avgAmt <= 0.1) {
            group.push(tx);
            placed = true;
            break;
          }
        }
        if (!placed) {
          amountGroups.push([tx]);
        }
      });

      // Analyze each amount group
      amountGroups.forEach(group => {
        const grpMonths = new Set(group.map(t => t.date.substring(0, 7)));
        if (grpMonths.size >= 2) {
          const avgAmount = group.reduce((sum, t) => sum + Math.abs(t.amount), 0) / group.length;
          const id = `sub_${merchant.toLowerCase().replace(/\s/g, '_')}_${Math.round(avgAmount)}`;
          
          insights.push({
            id,
            type: 'subscription',
            title: `Recurring Subscription: ${merchant}`,
            description: `Detected recurring charge of ₹${avgAmount.toLocaleString('en-IN', { maximumFractionDigits: 0 })} appearing in ${grpMonths.size} different statements.`,
            severity: 'info',
            merchant,
            amount: -avgAmount,
            category: group[0].category,
            relatedTransactionIds: group.map(t => t.id)
          });
        }
      });
    });

    return insights;
  },

  /**
   * Identifies larger recurring monthly outflows (EMI or Rent candidate payees).
   */
  detectRecurringPayments(transactions: Transaction[]): Insight[] {
    const insights: Insight[] = [];
    const expenses = transactions.filter(t => t.amount < 0 && (t.category === 'Uncategorized' || t.category === 'Personal Transfer' || t.category === 'Transfers' || t.category === 'Other'));

    // Group by payee
    const payeeGroups: { [payee: string]: Transaction[] } = {};
    expenses.forEach(tx => {
      const payee = categorizerService.extractMerchantPayee(tx.description);
      if (payee.length < 3) return;
      
      // Ignore known corporate/merchant keywords that are definitely not personal transfers or landlord transfers
      const ignoredMerchantWords = ['AMAZON', 'FLIPKART', 'SWIGGY', 'ZOMATO', 'ZEPTO', 'BLINKIT', 'UBER', 'OLA', 'JIO', 'AIRTEL'];
      if (ignoredMerchantWords.some(w => payee.toUpperCase().includes(w))) return;
      
      if (!payeeGroups[payee]) payeeGroups[payee] = [];
      payeeGroups[payee].push(tx);
    });

    Object.entries(payeeGroups).forEach(([payee, txs]) => {
      // Needs to appear at least 2 times, in different months
      const uniqueMonths = new Set(txs.map(t => t.date.substring(0, 7)));
      if (uniqueMonths.size < 2) return;

      // Group transactions of this payee by similar amount range (+/- 10%)
      const amountGroups: Transaction[][] = [];
      txs.forEach(tx => {
        const absAmt = Math.abs(tx.amount);
        let placed = false;
        for (const group of amountGroups) {
          const avgAmt = group.reduce((sum, t) => sum + Math.abs(t.amount), 0) / group.length;
          if (Math.abs(absAmt - avgAmt) / avgAmt <= 0.1) {
            group.push(tx);
            placed = true;
            break;
          }
        }
        if (!placed) {
          amountGroups.push([tx]);
        }
      });

      amountGroups.forEach(group => {
        const grpMonths = new Set(group.map(t => t.date.substring(0, 7)));
        if (grpMonths.size >= 2) {
          const avgAmount = group.reduce((sum, t) => sum + Math.abs(t.amount), 0) / group.length;
          
          // Large round amount threshold (e.g. ₹3,000+)
          if (avgAmount >= 3000) {
            const id = `rec_${payee.toLowerCase().replace(/\s/g, '_')}_${Math.round(avgAmount)}`;
            insights.push({
              id,
              type: 'recurring_payment',
              title: 'Recurring Payment Outflow',
              description: `We noticed a recurring monthly payment of ₹${avgAmount.toLocaleString('en-IN', { maximumFractionDigits: 0 })} to "${payee}". Is this Rent, EMI, or another commitment?`,
              severity: 'warning',
              merchant: payee,
              amount: -avgAmount,
              relatedTransactionIds: group.map(t => t.id)
            });
          }
        }
      });
    });

    return insights;
  },

  /**
   * Compares categories spending MoM.
   */
  detectRisingTrends(transactions: Transaction[], months: string[]): Insight[] {
    if (months.length < 2) return [];
    
    const insights: Insight[] = [];
    const monthlySummaries = this.getMonthlySummaries(transactions);
    
    // Compare the last month to the second last month
    const latestIdx = monthlySummaries.length - 1;
    const currentMonth = monthlySummaries[latestIdx];
    const prevMonth = monthlySummaries[latestIdx - 1];

    const currentCats = currentMonth.categories;
    const prevCats = prevMonth.categories;

    Object.entries(currentCats).forEach(([cat, currentAmount]) => {
      const prevAmount = prevCats[cat] || 0;
      
      // We only care about noticeable spend: say, > ₹1,000 and growth > 20%
      if (prevAmount > 1000 && currentAmount > prevAmount) {
        const diff = currentAmount - prevAmount;
        const pctGrow = (diff / prevAmount) * 100;
        
        if (pctGrow >= 20) {
          // Identify top transaction in this category during the current month
          const currentMonthTxs = transactions.filter(t => 
            t.date.substring(0, 7) === currentMonth.monthKey && 
            t.category === cat && 
            t.amount < 0
          );
          const topTx = [...currentMonthTxs].sort((a, b) => a.amount - b.amount)[0]; // amount is negative, so smallest is largest absolute spend
          
          const id = `trend_${currentMonth.monthKey}_${cat.toLowerCase().replace(/\s/g, '_')}`;
          
          insights.push({
            id,
            type: 'rising_trend',
            title: `Rising Trend: ${cat} spend up ${pctGrow.toFixed(0)}%`,
            description: `Your spending in ${cat} grew from ₹${(prevMonth.categories[cat] || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })} to ₹${currentAmount.toLocaleString('en-IN', { maximumFractionDigits: 0 })} MoM. Driven by transactions like "${topTx?.description || 'N/A'}" (₹${Math.abs(topTx?.amount || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}).`,
            severity: pctGrow > 50 ? 'danger' : 'warning',
            category: cat,
            percentageChange: pctGrow,
            amount: diff,
            relatedTransactionIds: currentMonthTxs.map(t => t.id)
          });
        }
      }
    });

    return insights;
  },

  /**
   * Identifies merchants that appeared in the latest month but never before.
   */
  detectNewMerchants(latestTx: Transaction[], priorTx: Transaction[]): Insight[] {
    const insights: Insight[] = [];
    const expensesLatest = latestTx.filter(t => t.amount < 0 && t.category !== 'Transfers');
    const expensesPrior = priorTx.filter(t => t.amount < 0 && t.category !== 'Transfers');

    const getCleanMerchant = (desc: string) => desc.toUpperCase().substring(0, 15).trim();

    const priorMerchantsSet = new Set(expensesPrior.map(t => getCleanMerchant(t.description)));
    const seenNewMerchants = new Set<string>();

    expensesLatest.forEach(tx => {
      const cleanName = getCleanMerchant(tx.description);
      
      // If it's a significant charge (> ₹2,000) and has not been seen in previous months
      if (Math.abs(tx.amount) >= 2000 && !priorMerchantsSet.has(cleanName) && !seenNewMerchants.has(cleanName)) {
        seenNewMerchants.add(cleanName);
        const id = `new_merch_${tx.id}`;
        
        insights.push({
          id,
          type: 'new_merchant',
          title: `New Merchant: ${tx.description}`,
          description: `First time spending at ${tx.description}. Charged ₹${Math.abs(tx.amount).toLocaleString('en-IN', { maximumFractionDigits: 0 })} on ${tx.date}.`,
          severity: Math.abs(tx.amount) > 8000 ? 'warning' : 'info',
          merchant: tx.description,
          amount: tx.amount,
          category: tx.category,
          relatedTransactionIds: [tx.id]
        });
      }
    });

    return insights;
  },

  /**
   * Flags large spends that are outliers in their category (e.g. > 2.5x category average).
   */
  detectAnomalies(transactions: Transaction[]): Insight[] {
    const insights: Insight[] = [];
    const expenses = transactions.filter(t => t.amount < 0 && t.category !== 'Transfers');
    
    // Group transactions by category to calculate averages
    const categorySpends: { [cat: string]: number[] } = {};
    expenses.forEach(tx => {
      if (!categorySpends[tx.category]) categorySpends[tx.category] = [];
      categorySpends[tx.category].push(Math.abs(tx.amount));
    });

    expenses.forEach(tx => {
      const absAmt = Math.abs(tx.amount);
      const categoryAmounts = categorySpends[tx.category] || [];
      
      const otherAmounts = categoryAmounts.filter((_, idx) => categoryAmounts.indexOf(absAmt) !== idx || categoryAmounts.filter(x => x === absAmt).length > 1);
      const avg = otherAmounts.length > 0 
        ? otherAmounts.reduce((s, a) => s + a, 0) / otherAmounts.length 
        : absAmt;
      
      // Trigger anomaly if it's > ₹5,000 AND (greater than 2.5x average OR this is a massive ₹15,000+ charge)
      if (absAmt > 5000 && (absAmt > avg * 2.5 || absAmt >= 15000)) {
        const id = `anomaly_${tx.id}`;
        insights.push({
          id,
          type: 'anomaly',
          title: `Large Spend Flagged: ${tx.description}`,
          description: `This transaction of ₹${absAmt.toLocaleString('en-IN', { maximumFractionDigits: 0 })} on ${tx.date} in "${tx.category}" is significantly higher than your typical transactions here (average is ₹${avg.toLocaleString('en-IN', { maximumFractionDigits: 0 })}).`,
          severity: absAmt > 30000 ? 'danger' : 'warning',
          category: tx.category,
          amount: tx.amount,
          merchant: tx.description,
          relatedTransactionIds: [tx.id]
        });
      }
    });

    return insights;
  }
};
