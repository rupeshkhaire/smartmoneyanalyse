import { type CustomRule } from './db';

export const DEFAULT_CATEGORIES = [
  'Groceries',
  'Dining',
  'Transport',
  'Utilities',
  'Rent/Mortgage',
  'Subscriptions',
  'Shopping',
  'Health',
  'Entertainment',
  'Income/Salary',
  'Transfers',
  'Fees',
  'Fuel',
  'EMI/Loans',
  'SIP/Investments',
  'Insurance',
  'Credit Card Payments',
  'Personal Transfer',
  'Cash Withdrawal',
  'Other',
  'Uncategorized'
];

export const CATEGORY_COLORS: { [category: string]: string } = {
  'Groceries': '#10b981',           // emerald-500
  'Dining': '#f97316',              // orange-500
  'Transport': '#06b6d4',           // cyan-500
  'Utilities': '#3b82f6',           // blue-500
  'Rent/Mortgage': '#6366f1',       // indigo-500
  'Subscriptions': '#8b5cf6',       // violet-500
  'Shopping': '#ec4899',            // pink-500
  'Health': '#ef4444',              // red-500
  'Entertainment': '#a855f7',       // purple-500
  'Income/Salary': '#22c55e',       // green-500
  'Transfers': '#64748b',           // slate-500
  'Fees': '#eab308',                // yellow-500
  'Fuel': '#f59e0b',                // amber-500
  'EMI/Loans': '#ea580c',           // dark orange-600
  'SIP/Investments': '#14b8a6',     // teal-500
  'Insurance': '#0284c7',           // sky-600
  'Credit Card Payments': '#4f46e5', // indigo-600
  'Personal Transfer': '#db2777',   // dark pink-600
  'Cash Withdrawal': '#f43f5e',     // rose-500
  'Other': '#94a3b8',               // slate-400
  'Uncategorized': '#6b7280'        // gray-500
};

export interface CategorizationResult {
  category: string;
  confidence: 'high' | 'medium' | 'low';
}

// Indian-market brand and service synonym dictionary
const INDIAN_KEYWORD_MAP: { [category: string]: string[] } = {
  'Dining': [
    'swiggy', 'zomato', 'eternal', 'dominos', 'mcdonald', 'kfc', 'burger king', 
    'faasos', 'box8', 'freshmenu', 'starbucks', 'cafe coffee day', 'ccd', 'barista',
    'restaurant', 'pizza', 'burger', 'grill', 'pub', 'bar', 'cafe', 'deli', 'sushi', 'bistro', 'brewery'
  ],
  'Groceries': [
    'zepto', 'blinkit', 'bigbasket', 'instamart', 'dmart', 'jiomart', 'milkbasket', 
    'licious', 'dunzo', 'nature\'s basket', 'spencer\'s', 'more retail', 
    'grocery', 'supermarket', 'mart', 'provisions', 'kirana'
  ],
  'Transport': [
    'uber', 'ola', 'rapido', 'meru', 'blu smart', 'irctc', 'redbus', 'indigo', 
    'air india', 'vistara', 'spicejet', 'akasa', 'metro', 'fastag', 'ncmc', 
    'railways', 'transit', 'cabs', 'travels', 'toll'
  ],
  'Shopping': [
    'amazon', 'flipkart', 'myntra', 'ajio', 'meesho', 'nykaa', 'tatacliq', 
    'snapdeal', 'croma', 'reliance digital', 'decathlon', 'ikea', 'h&m', 'zara', 
    'shoppers stop', 'lifestyle', 'westside', 'pantaloons', 'clothing', 'fashion',
    'apparel', 'retail'
  ],
  'Subscriptions': [
    'netflix', 'hotstar', 'jiocinema', 'sonyliv', 'zee5', 'spotify', 'gaana', 
    'wynk', 'prime video', 'youtube premium', 'apple', 'google play', 'pvr', 
    'inox', 'bookmyshow', 'disney', 'hbomax', 'hbo max', 'nytimes', 'github', 
    'adobe', 'canva', 'zoom.us', 'slack', 'microsoft 365', 'icloud', 'patreon'
  ],
  'Utilities': [
    'jio', 'airtel', 'vi', 'vodafone', 'bsnl', 'act fibernet', 'hathway', 
    'tata power', 'adani electricity', 'bescom', 'mseb', 'tneb', 'torrent power', 
    'indane', 'hp gas', 'bharat gas', 'utility', 'electric', 'power', 'water', 
    'sewer', 'broadband', 'telecom'
  ],
  'Rent/Mortgage': [
    'nobroker', 'magicbricks', 'housing.com', 'cred rentpay', 'rent', 'mortgage', 
    'landlord', 'housing', 'apartment'
  ],
  'EMI/Loans': [
    'bajaj finserv', 'hdb financial', 'tata capital', 'poonawalla', 'muthoot', 
    'emi', 'loan', 'moneyview', 'kreditbee', 'navi', 'cashe', 'lending', 'finance'
  ],
  'SIP/Investments': [
    'icici pru', 'hdfc mf', 'hdfc amc', 'sbi mf', 'aditya birla sun life', 
    'kotak mf', 'groww', 'zerodha', 'coin', 'kuvera', 'paytm money', 'upstox', 
    'investment', 'mutual fund', 'securities', 'wealth', 'amc'
  ],
  'Insurance': [
    'lic', 'hdfc life', 'icici pru life', 'max life', 'sbi life', 'star health', 
    'hdfc ergo', 'bajaj allianz', 'tata aig', 'insurance', 'health insurance', 
    'general insurance'
  ],
  'Credit Card Payments': [
    'cred', 'billdesk', 'cc payment', 'credit card', 'razorpay', 'cc bill'
  ],
  'Income/Salary': [
    'salary', 'sal', 'payroll', 'direct deposit', 'directdep', 'ach income', 
    'employer', 'wage', 'paycheck', 'dividend', 'stipend', 'bonus'
  ],
  'Fees': [
    'fee', 'interest', 'charge', 'overdraft', 'service fee', 'maintenance fee', 
    'nsf', 'late fee', 'annual fee', 'amb', 'min bal charges', 'sms charges', 'gst', 'penal'
  ],
  'Fuel': [
    'iocl', 'hpcl', 'bpcl', 'indian oil', 'shell', 'reliance petroleum', 'petrol', 'diesel'
  ],
  'Health': [
    'apollo', 'practo', 'pharmeasy', 'netmeds', '1mg', 'tata 1mg', 'cult.fit', 
    'hospital', 'clinic', 'pharmacy', 'medical', 'doctor', 'dental', 'vision'
  ]
};

export const categorizerService = {
  /**
   * Deconstructs structured banking description strings (UPI, NACH, POS etc.) 
   * to isolate the core payee/merchant segment.
   */
  extractMerchantPayee(description: string): string {
    if (!description) return '';
    let desc = description.toUpperCase().trim();
    
    // Split segments using delimiters / or : or spaces
    let segments: string[] = [];
    if (desc.includes('/')) {
      segments = desc.split('/');
    } else if (desc.includes(':')) {
      segments = desc.split(':');
    } else {
      segments = desc.split(/\s+/);
    }
    
    // Filter segments to remove reference numbers, IFSCs, VPAs, and bank transaction short codes
    const filtered = segments.map(s => s.trim()).filter(s => {
      if (!s) return false;
      if (/^\d+$/.test(s)) return false; // Purely numeric UTR or ref ID
      if (s.includes('@')) return false; // VPA / UPI handle
      if (/^[A-Z]{4}0[A-Z0-9]{6}$/.test(s)) return false; // IFSC code format
      
      const bankingCodes = [
        'UPI', 'IMPS', 'NEFT', 'RTGS', 'NACH', 'ECS', 'ACH', 'DR', 'CR', 
        'IW', 'OW', 'INW', 'OUT', 'ATM', 'WDL', 'CSH', 'CASH', 'POS', 'CARD', 
        'PURCHASE', 'TXN', 'TRANSFER', 'REF', 'UTR', 'FT', 'MND', 'IB', 'MB', 
        'NET', 'BANK', 'ONL', 'ONLINE', 'BIL', 'BILL', 'DESK', 'PAY', 'PAYMENT',
        'CHARGES', 'GST', 'TAX', 'REVERSED', 'REV'
      ];
      if (bankingCodes.includes(s)) return false;
      if (s.length <= 2) return false; // Too short to be a merchant name segment
      
      return true;
    });
    
    let payee = '';
    if (filtered.length > 0) {
      payee = filtered[0];
    } else {
      // Clean raw string fallback
      payee = desc.replace(/[^A-Z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
    }
    
    // Remove corporate and retail descriptors from suffix
    const corporateSuffixes = [
      'PRIVATE LIMITED', 'PVT LTD', 'PRIVATE LIM', 'PVT LIM', 'LIMITED', 'LTD', 
      'LLP', 'CO', 'INC', 'CORP', 'SERVICES', 'TECHNOLOGIES', 'ENTERPRISES', 
      'INDUSTRIES', 'MARKETPLACE', 'MARKET', 'RETAIL', 'MERCHANT', 'STORE', 'SHOP', 'ONLINE', 'PAY'
    ];
    
    let cleanedPayee = payee;
    let changed = true;
    while (changed) {
      changed = false;
      for (const suffix of corporateSuffixes) {
        if (cleanedPayee.endsWith(' ' + suffix) || cleanedPayee === suffix) {
          cleanedPayee = cleanedPayee.substring(0, cleanedPayee.length - suffix.length).trim();
          changed = true;
        }
      }
    }
    
    return cleanedPayee || payee;
  },

  /**
   * Heuristic to identify if a segment resembles a personal name (2-3 words, letters only, no business terms)
   */
  looksLikePersonalName(payee: string): boolean {
    const words = payee.split(/\s+/);
    if (words.length < 2 || words.length > 4) return false;
    
    // Contain numbers -> not a name
    if (/\d/.test(payee)) return false;
    
    const businessTerms = [
      'MARKET', 'MARKETPLACE', 'BAZAR', 'STORE', 'SHOP', 'MART', 'AGENCY', 
      'AGENCIES', 'DISTRIBUTOR', 'DISTRIBUTORS', 'RETAIL', 'SUPERMARKET', 
      'TRADERS', 'TRADING', 'ENTERPRISES', 'INDUSTRIES', 'SERVICES', 
      'TECHNOLOGIES', 'SOLUTIONS', 'ACADEMY', 'SCHOOL', 'COLLEGE', 'UNIVERSITY',
      'CLINIC', 'HOSPITAL', 'MEDICAL', 'PHARMACY', 'DRUGS', 'RESTAURANT', 'CAFE', 
      'FOODS', 'HOTEL', 'TRAVEL', 'TRAVELS', 'CABS', 'MOTORS', 'PETROLEUM', 'GAS', 
      'POWER', 'TELECOM', 'DIGITAL', 'ONLINE', 'PAY', 'GAMES', 'CLUB', 'SPA', 'SALON', 'GYM'
    ];
    
    if (words.some(w => businessTerms.includes(w))) return false;
    
    // String should be purely alphabetic (allowing dots for initials e.g. Suresh K.)
    const cleanText = payee.replace(/[^A-Za-z\s.]/g, '').trim();
    if (cleanText.length !== payee.length) return false;
    
    return true;
  },

  /**
   * Smart Indian-focused categorization mapping
   */
  categorize(description: string, customRules: CustomRule[], amount: number = 0): CategorizationResult {
    if (!description) {
      return { category: 'Uncategorized', confidence: 'low' };
    }
    
    const descUpper = description.toUpperCase().trim();
    
    // 1. Check custom rules first (Highest Priority)
    for (const rule of customRules) {
      if (rule.keyword && descUpper.includes(rule.keyword.toUpperCase())) {
        return { category: rule.category, confidence: 'high' };
      }
    }
    
    // 2. Identify transaction prefix signals
    const isATM = descUpper.includes('ATM WITHDRAWAL') || descUpper.includes('ATM-CASH') || descUpper.includes('CSH WDL') || descUpper.includes('ATM CASH');
    if (isATM) {
      return { category: 'Cash Withdrawal', confidence: 'high' };
    }
    
    const isNACH = descUpper.includes('NACH DR') || descUpper.includes('ECS DR') || descUpper.includes('ACH DR') || descUpper.includes('MND DR');
    
    // Decompose transaction description to extract clean merchant/payee segment
    const extractedPayee = this.extractMerchantPayee(description);
    const extractedLower = extractedPayee.toLowerCase();
    
    // 3. Search dictionary for brand name match
    for (const [category, keywords] of Object.entries(INDIAN_KEYWORD_MAP)) {
      for (const keyword of keywords) {
        if (extractedLower === keyword || extractedLower.includes(keyword)) {
          // If prefix matches NACH and category matches Loans/SIP/Insurance/Utilities, it's high confidence
          if (isNACH && ['EMI/Loans', 'SIP/Investments', 'Insurance', 'Utilities'].includes(category)) {
            return { category, confidence: 'high' };
          }
          return { category, confidence: 'high' };
        }
      }
    }
    
    // 4. Special checks for NACH Debit with no keyword match (could be Loan, SIP, Insurance)
    if (isNACH) {
      // Check for generic SIP/EMI keywords
      if (descUpper.includes('EMI') || descUpper.includes('LOAN') || descUpper.includes('FINANCE')) {
        return { category: 'EMI/Loans', confidence: 'high' };
      }
      if (descUpper.includes('INSURANCE') || descUpper.includes('LIFE') || descUpper.includes('HEALTH')) {
        return { category: 'Insurance', confidence: 'high' };
      }
      if (descUpper.includes('MUTUAL') || descUpper.includes('MF') || descUpper.includes('SIP') || descUpper.includes('AMALGAMATED')) {
        return { category: 'SIP/Investments', confidence: 'high' };
      }
      // General NACH fallback guess
      return { category: 'Other', confidence: 'medium' };
    }
    
    // 5. Check if it's P2P (UPI or NEFT/IMPS Transfer) that looks like a person's name
    const isP2P = descUpper.startsWith('UPI') || descUpper.startsWith('IMPS') || descUpper.startsWith('NEFT') || descUpper.startsWith('RTGS') || descUpper.includes('TRANSFER');
    if (isP2P && this.looksLikePersonalName(extractedPayee)) {
      return { category: 'Personal Transfer', confidence: 'medium' };
    }
    
    // 6. Generic income/salary checks
    if (descUpper.includes('SALARY') || descUpper.includes('PAYROLL') || descUpper.includes('DIRECT DEPOSIT') || (amount > 20000 && descUpper.includes('SAL'))) {
      return { category: 'Income/Salary', confidence: 'high' };
    }
    
    // 7. Generic transfer check
    if (descUpper.includes('TRANSFER') || descUpper.includes('FT') || descUpper.includes('NEFT') || descUpper.includes('IMPS')) {
      return { category: 'Transfers', confidence: 'medium' };
    }
    
    return { category: 'Uncategorized', confidence: 'low' };
  }
};

export function getCategoryIcon(category: string): string {
  if (!category) return '❓';
  const clean = category.replace(/[^\w\s/]/g, '').trim();
  switch (clean) {
    case 'Groceries': return '🛒';
    case 'Dining': return '🍽️';
    case 'Transport': return '🚗';
    case 'Utilities': return '💡';
    case 'Rent/Mortgage': return '🏠';
    case 'Subscriptions': return '📺';
    case 'Shopping': return '🛍️';
    case 'Health': return '🏥';
    case 'Entertainment': return '🎬';
    case 'Income/Salary': return '💰';
    case 'Transfers': return '🔄';
    case 'Fees': return '⚠️';
    case 'Fuel': return '⛽';
    case 'EMI/Loans': return '📈';
    case 'SIP/Investments': return '💼';
    case 'Insurance': return '🛡️';
    case 'Credit Card Payments': return '💳';
    case 'Personal Transfer': return '👥';
    case 'Cash Withdrawal': return '🏧';
    case 'Other': return '⚙️';
    default: return '❓';
  }
}
