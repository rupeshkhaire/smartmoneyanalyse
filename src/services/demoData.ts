import { dbService, type StatementMetadata, type Transaction } from './db';

export const demoDataService = {
  async generateDemoData(): Promise<void> {
    // Clear any existing data first to prevent duplicates
    await dbService.clearAllData();
    
    // Define 3 Statements
    const statements: StatementMetadata[] = [
      {
        id: 'stmt_demo_jan',
        name: 'statement-january-2026.csv',
        accountNickname: 'Checking Account (Jan 2026)',
        uploadDate: new Date().toISOString().split('T')[0],
        startDate: '2026-01-01',
        endDate: '2026-01-31',
        transactionCount: 16
      },
      {
        id: 'stmt_demo_feb',
        name: 'statement-february-2026.csv',
        accountNickname: 'Checking Account (Feb 2026)',
        uploadDate: new Date().toISOString().split('T')[0],
        startDate: '2026-02-01',
        endDate: '2026-02-28',
        transactionCount: 17
      },
      {
        id: 'stmt_demo_mar',
        name: 'statement-march-2026.csv',
        accountNickname: 'Checking Account (Mar 2026)',
        uploadDate: new Date().toISOString().split('T')[0],
        startDate: '2026-03-01',
        endDate: '2026-03-31',
        transactionCount: 20
      }
    ];

    // Helper to format date in month offset
    const getJanDate = (day: number) => `2026-01-${String(day).padStart(2, '0')}`;
    const getFebDate = (day: number) => `2026-02-${String(day).padStart(2, '0')}`;
    const getMarDate = (day: number) => `2026-03-${String(day).padStart(2, '0')}`;

    // Standard transactions template (date offset, description, amount, category)
    const rawTransactions = [
      // === JANUARY ===
      { stmtId: 'stmt_demo_jan', date: getJanDate(1), desc: 'PAYROLL ACME CORP DIRECT DEP', amt: 3850.00, cat: 'Income/Salary' },
      { stmtId: 'stmt_demo_jan', date: getJanDate(3), desc: 'LANDLORD RENT PAYMENT', amt: -1450.00, cat: 'Rent/Mortgage' },
      { stmtId: 'stmt_demo_jan', date: getJanDate(4), desc: 'SAFEWAY GROCERY STORE', amt: -92.50, cat: 'Groceries' },
      { stmtId: 'stmt_demo_jan', date: getJanDate(5), desc: 'NETFLIX.COM SUBSCRIPTION', amt: -15.49, cat: 'Subscriptions' },
      { stmtId: 'stmt_demo_jan', date: getJanDate(8), desc: 'SPOTIFY PREMIUM BILL', amt: -10.99, cat: 'Subscriptions' },
      { stmtId: 'stmt_demo_jan', date: getJanDate(10), desc: 'STARBUCKS CAFE', amt: -6.45, cat: 'Dining' },
      { stmtId: 'stmt_demo_jan', date: getJanDate(12), desc: 'SHELL GAS STATION', amt: -45.50, cat: 'Transport' },
      { stmtId: 'stmt_demo_jan', date: getJanDate(14), desc: 'AMAZON.COM RETAIL', amt: -62.30, cat: 'Shopping' },
      { stmtId: 'stmt_demo_jan', date: getJanDate(15), desc: 'UBER TRIP 3-FOR-2', amt: -18.20, cat: 'Transport' },
      { stmtId: 'stmt_demo_jan', date: getJanDate(18), desc: 'COMCAST POWER & UTILITIES', amt: -85.00, cat: 'Utilities' },
      { stmtId: 'stmt_demo_jan', date: getJanDate(20), desc: 'MCDONALDS FAST FOOD', amt: -12.50, cat: 'Dining' },
      { stmtId: 'stmt_demo_jan', date: getJanDate(22), desc: 'CVS PHARMACY PRESCRIPTION', amt: -24.80, cat: 'Health' },
      { stmtId: 'stmt_demo_jan', date: getJanDate(25), desc: 'ZELLE TRANSFER FROM MOM', amt: 150.00, cat: 'Transfers' },
      { stmtId: 'stmt_demo_jan', date: getJanDate(26), desc: 'STEAM GAMES STORE', amt: -29.99, cat: 'Entertainment' },
      { stmtId: 'stmt_demo_jan', date: getJanDate(28), desc: 'CHIPOTLE MEXICAN GRILL', amt: -14.20, cat: 'Dining' },
      { stmtId: 'stmt_demo_jan', date: getJanDate(31), desc: 'MONTHLY MAINTENANCE FEE', amt: -12.00, cat: 'Fees' },

      // === FEBRUARY ===
      { stmtId: 'stmt_demo_feb', date: getFebDate(1), desc: 'PAYROLL ACME CORP DIRECT DEP', amt: 3850.00, cat: 'Income/Salary' },
      { stmtId: 'stmt_demo_feb', date: getFebDate(3), desc: 'LANDLORD RENT PAYMENT', amt: -1450.00, cat: 'Rent/Mortgage' },
      { stmtId: 'stmt_demo_feb', date: getFebDate(4), desc: 'SAFEWAY GROCERY STORE', amt: -88.10, cat: 'Groceries' },
      { stmtId: 'stmt_demo_feb', date: getFebDate(5), desc: 'NETFLIX.COM SUBSCRIPTION', amt: -15.49, cat: 'Subscriptions' },
      { stmtId: 'stmt_demo_feb', date: getFebDate(8), desc: 'SPOTIFY PREMIUM BILL', amt: -10.99, cat: 'Subscriptions' },
      { stmtId: 'stmt_demo_feb', date: getFebDate(9), desc: 'STARBUCKS CAFE', amt: -7.20, cat: 'Dining' },
      { stmtId: 'stmt_demo_feb', date: getFebDate(11), desc: 'SHELL GAS STATION', amt: -48.00, cat: 'Transport' },
      { stmtId: 'stmt_demo_feb', date: getFebDate(13), desc: 'AMAZON.COM RETAIL', amt: -115.60, cat: 'Shopping' },
      { stmtId: 'stmt_demo_feb', date: getFebDate(14), desc: 'UBER TRIP 3-FOR-2', amt: -15.40, cat: 'Transport' },
      { stmtId: 'stmt_demo_feb', date: getFebDate(17), desc: 'COMCAST POWER & UTILITIES', amt: -85.00, cat: 'Utilities' },
      { stmtId: 'stmt_demo_feb', date: getFebDate(19), desc: 'SWEETGREEN SALAD', amt: -15.80, cat: 'Dining' },
      { stmtId: 'stmt_demo_feb', date: getFebDate(21), desc: 'WHOLE FOODS MARKET', amt: -68.40, cat: 'Groceries' },
      { stmtId: 'stmt_demo_feb', date: getFebDate(23), desc: 'DOORDASH CHINESE FOOD', amt: -34.50, cat: 'Dining' },
      { stmtId: 'stmt_demo_feb', date: getFebDate(25), desc: 'PLAYSTATION NETWORK CHARGE', amt: -19.99, cat: 'Entertainment' },
      { stmtId: 'stmt_demo_feb', date: getFebDate(26), desc: 'ZELLE FROM DAD', amt: 100.00, cat: 'Transfers' },
      { stmtId: 'stmt_demo_feb', date: getFebDate(27), desc: 'STARBUCKS CAFE', amt: -5.80, cat: 'Dining' },
      { stmtId: 'stmt_demo_feb', date: getFebDate(28), desc: 'MONTHLY MAINTENANCE FEE', amt: -12.00, cat: 'Fees' },

      // === MARCH === (Contains a 45% spike in Dining spend, a new merchant, and a massive anomaly)
      { stmtId: 'stmt_demo_mar', date: getMarDate(1), desc: 'PAYROLL ACME CORP DIRECT DEP', amt: 3850.00, cat: 'Income/Salary' },
      { stmtId: 'stmt_demo_mar', date: getMarDate(3), desc: 'LANDLORD RENT PAYMENT', amt: -1450.00, cat: 'Rent/Mortgage' },
      { stmtId: 'stmt_demo_mar', date: getMarDate(4), desc: 'SAFEWAY GROCERY STORE', amt: -105.40, cat: 'Groceries' },
      { stmtId: 'stmt_demo_mar', date: getMarDate(5), desc: 'NETFLIX.COM SUBSCRIPTION', amt: -15.49, cat: 'Subscriptions' },
      { stmtId: 'stmt_demo_mar', date: getMarDate(8), desc: 'SPOTIFY PREMIUM BILL', amt: -10.99, cat: 'Subscriptions' },
      { stmtId: 'stmt_demo_mar', date: getMarDate(10), desc: 'STARBUCKS CAFE', amt: -8.10, cat: 'Dining' },
      { stmtId: 'stmt_demo_mar', date: getMarDate(12), desc: 'SHELL GAS STATION', amt: -52.00, cat: 'Transport' },
      { stmtId: 'stmt_demo_mar', date: getMarDate(13), desc: 'UBER TRIP 3-FOR-2', amt: -24.50, cat: 'Transport' },
      { stmtId: 'stmt_demo_mar', date: getMarDate(14), desc: 'COMCAST POWER & UTILITIES', amt: -92.00, cat: 'Utilities' },
      { stmtId: 'stmt_demo_mar', date: getMarDate(15), desc: 'APPLE STORE MAIN BRANCH', amt: -849.00, cat: 'Shopping' }, // ANOMALY!
      { stmtId: 'stmt_demo_mar', date: getMarDate(16), desc: 'REI OUTDOOR CLOTHING', amt: -180.00, cat: 'Shopping' }, // NEW MERCHANT!
      { stmtId: 'stmt_demo_mar', date: getMarDate(17), desc: 'DOORDASH SUSHI DELIVERY', amt: -58.40, cat: 'Dining' }, // dining spike trigger
      { stmtId: 'stmt_demo_mar', date: getMarDate(18), desc: 'OUTBACK STEAKHOUSE DINNER', amt: -84.20, cat: 'Dining' }, // dining spike trigger
      { stmtId: 'stmt_demo_mar', date: getMarDate(20), desc: 'WHOLE FOODS MARKET', amt: -74.90, cat: 'Groceries' },
      { stmtId: 'stmt_demo_mar', date: getMarDate(22), desc: 'UBER EATS ITALIAN JOINT', amt: -44.50, cat: 'Dining' }, // dining spike trigger
      { stmtId: 'stmt_demo_mar', date: getMarDate(24), desc: 'STARBUCKS CAFE', amt: -6.40, cat: 'Dining' },
      { stmtId: 'stmt_demo_mar', date: getMarDate(26), desc: 'CHATGPT PLUS SUBSCRIPTION', amt: -20.00, cat: 'Subscriptions' },
      { stmtId: 'stmt_demo_mar', date: getMarDate(28), desc: 'TICKETMASTER CONCERT TIX', amt: -125.00, cat: 'Entertainment' },
      { stmtId: 'stmt_demo_mar', date: getMarDate(29), desc: 'CVS PHARMACY OVER COUNTER', amt: -18.20, cat: 'Health' },
      { stmtId: 'stmt_demo_mar', date: getMarDate(31), desc: 'MONTHLY MAINTENANCE FEE', amt: -12.00, cat: 'Fees' }
    ];

    const transactions: Transaction[] = rawTransactions.map((t, idx) => ({
      id: `tx_demo_${t.stmtId}_${idx}`,
      statementId: t.stmtId,
      date: t.date,
      description: t.desc,
      amount: t.amt,
      balance: undefined, // Let ui calculate or leave empty
      category: t.cat,
      originalCategory: t.cat,
      isUserOverridden: false
    }));

    // Save in IndexedDB
    for (const stmt of statements) {
      await dbService.saveStatement(stmt);
    }
    await dbService.saveTransactions(transactions);
  }
};
