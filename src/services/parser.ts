import Papa from 'papaparse';
import * as pdfjs from 'pdfjs-dist';
import { categorizerService } from './categorizer';

// Define the worker URL using a CDN so it loads correctly in a client-only environment.
pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version || '4.0.370'}/pdf.worker.min.mjs`;

export interface ParsedRawRow {
  [key: string]: string;
}

export interface ColumnMappings {
  date: string;
  description: string;
  amount: string; // Negative for expense, positive for income
  balance?: string;
  debit?: string;  // If separate debit/credit columns
  credit?: string; // If separate debit/credit columns
  flag?: string;   // If amount column + Dr/Cr flag column
}

export interface ParseResult {
  fileName: string;
  headers: string[];
  rawRows: ParsedRawRow[];
  detectedMappings: ColumnMappings;
  confidence: boolean; // True if date, description, and amount are confidently mapped
  confidenceLogs?: string[]; // Warning statements about low-confidence fields
  preambleNickname?: string; // Nickname extracted from account info
  detectedCurrency?: string; // Extracted currency code/symbol
  periodStart?: string; // Period start date extracted from statement metadata
  periodEnd?: string;   // Period end date extracted from statement metadata
}

// Synonym lists for column mapping
const DATE_SYNONYMS = [
  'date', 'txn date', 'txndate', 'transaction date', 'transactiondate', 
  'value date', 'valuedate', 'posting date', 'postingdate', 'posted date', 
  'posted', 'book date', 'entry date', 'date of transaction', 'post date'
];

const DESC_SYNONYMS = [
  'description', 'desc', 'narration', 'particulars', 'transaction', 
  'transaction details', 'remarks', 'details', 'payee', 'merchant', 
  'memo', 'transaction remarks', 'reference', 'ref', 'remark'
];

const DEBIT_SYNONYMS = [
  'debit', 'dr', 'withdrawal', 'withdrawals', 'withdrawal amt', 
  'withdrawal amount', 'paid out', 'money out', 'outflow', 'expense', 
  'dr amount', 'debit amount', 'dr amt', 'debit amt', 'payment', 'charge'
];

const CREDIT_SYNONYMS = [
  'credit', 'cr', 'deposit', 'deposits', 'deposit amt', 
  'deposit amount', 'paid in', 'money in', 'inflow', 'income', 
  'cr amount', 'credit amount', 'cr amt', 'credit amt', 'receipt'
];

const AMOUNT_SYNONYMS = [
  'amount', 'transaction amount', 'value', 'txn amount', 'txn amt', 'amount amt', 'amt'
];

const FLAG_SYNONYMS = [
  'type', 'dr/cr', 'd/c', 'drcr', 'dc', 'indicator', 'flag', 'status', 'cr/dr'
];

const BALANCE_SYNONYMS = [
  'balance', 'closing balance', 'running balance', 'available balance', 
  'balance amt', 'bal', 'ledger balance', 'ledger bal'
];

// Helper to check clean string match
function matchSynonym(cell: string, synonyms: string[]): boolean {
  if (!cell) return false;
  const cleaned = cell.toLowerCase().replace(/[^a-z0-9]/g, '').trim();
  return synonyms.some(syn => {
    const cleanedSyn = syn.toLowerCase().replace(/[^a-z0-9]/g, '').trim();
    return cleaned === cleanedSyn || cleaned.includes(cleanedSyn);
  });
}

// Helper to clean numeric strings (removes commas, currency signs like ₹, $, Rs.)
function cleanNumericString(val: string): string {
  if (val === undefined || val === null) return '';
  let str = String(val).trim();
  
  // Remove currency signs and spaces
  str = str.replace(/[\$,₹\s]/g, '')
           .replace(/\b(?:INR|Rs|Rs\.)\b/gi, '');
           
  // Handle parenthesis for negative values: (1,234.56) -> -1234.56
  if (str.startsWith('(') && str.endsWith(')')) {
    str = '-' + str.substring(1, str.length - 1);
  }
  
  // Handle trailing Dr/Cr flags attached to the number: e.g. "8,238.89 CR" -> "8238.89", "8,238.89 DR" -> "-8238.89"
  if (str.toLowerCase().endsWith('cr')) {
    str = str.substring(0, str.length - 2).trim();
  } else if (str.toLowerCase().endsWith('dr')) {
    str = '-' + str.substring(0, str.length - 2).trim();
  }
  
  return str;
}


function isDateCell(val: string): boolean {
  if (!val) return false;
  const str = val.trim();
  const patterns = [
    /^\d{1,4}[-/.]\d{1,2}[-/.]\d{1,4}$/,
    /^\d{1,2}\s+[A-Za-z]{3,9}\s+\d{2,4}$/,
    /^[A-Za-z]{3,9}\s+\d{1,2},?\s+\d{2,4}$/
  ];
  return patterns.some(p => p.test(str));
}

export const parserService = {
  /**
   * Parses a CSV file.
   */
  async parseCSV(file: File): Promise<ParseResult> {
    console.log("[MoneyFlow Debug] parseCSV called for:", file.name);
    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        header: false, // Parse without header to find headers in preamble
        skipEmptyLines: 'greedy',
        complete: (results) => {
          const rawLines = results.data as string[][];
          
          if (rawLines.length === 0) {
            reject(new Error("File appears to be empty."));
            return;
          }

          try {
            const parsed = this.processRawLines(file.name, rawLines);
            resolve(parsed);
          } catch (err) {
            reject(err);
          }
        },
        error: (err) => {
          reject(err);
        }
      });
    });
  },

  /**
   * Processes 2D array from CSV or PDF text layout
   */
  processRawLines(fileName: string, rawLines: string[][]): ParseResult {
    console.log("[MoneyFlow Debug] processRawLines started. Total lines:", rawLines.length);
    
    // 1. Scan first ~20 lines to locate the actual Header Row
    let headerRowIndex = -1;
    let maxScore = -1;
    
    const maxSearchRows = Math.min(rawLines.length, 20);
    
    for (let r = 0; r < maxSearchRows; r++) {
      const row = rawLines[r];
      if (!row || row.length < 3) continue;
      
      let dateMatches = 0;
      let descMatches = 0;
      let debitMatches = 0;
      let creditMatches = 0;
      let amountMatches = 0;
      let flagMatches = 0;
      let balanceMatches = 0;
      
      row.forEach(cell => {
        if (!cell) return;
        const cStr = cell.trim();
        if (matchSynonym(cStr, DATE_SYNONYMS)) dateMatches++;
        else if (matchSynonym(cStr, DESC_SYNONYMS)) descMatches++;
        else if (matchSynonym(cStr, DEBIT_SYNONYMS)) debitMatches++;
        else if (matchSynonym(cStr, CREDIT_SYNONYMS)) creditMatches++;
        else if (matchSynonym(cStr, AMOUNT_SYNONYMS)) amountMatches++;
        else if (matchSynonym(cStr, FLAG_SYNONYMS)) flagMatches++;
        else if (matchSynonym(cStr, BALANCE_SYNONYMS)) balanceMatches++;
      });
      
      // Calculate row mapping score
      // Require date and description matching cells to prevent false header rows matching transaction rows
      const score = (dateMatches * 6) + (descMatches * 6) + (amountMatches * 5) + 
                    (debitMatches * 5) + (creditMatches * 5) + (balanceMatches * 2) + (flagMatches * 2);
      
      // Check if it's a candidate header row
      const isHeaderCandidate = dateMatches > 0 && descMatches > 0 && 
                               (amountMatches > 0 || (debitMatches > 0 && creditMatches > 0) || (amountMatches > 0 && flagMatches > 0));
                               
      if (isHeaderCandidate && score > maxScore) {
        maxScore = score;
        headerRowIndex = r;
      }
    }
    
    // Fall back to row 0 if no candidate is found
    if (headerRowIndex === -1) {
      console.warn("[MoneyFlow Debug] Failed to find candidate header row. Falling back to index 0.");
      headerRowIndex = 0;
    } else {
      console.log("[MoneyFlow Debug] Detected Header Row at index:", headerRowIndex, "Score:", maxScore);
    }
    
    const headers = rawLines[headerRowIndex].map(h => (h || '').trim());
    const preambleRows = rawLines.slice(0, headerRowIndex);
    
    // 2. Extract preamble meta details (date ranges or currency symbols or nickname)
    const { periodStart, periodEnd, extractedNickname, detectedCurrency } = this.extractMetadata(preambleRows);
    
    // Auto-fill account label combining nickname and period
    let finalNickname = extractedNickname;
    if (periodStart && periodEnd) {
      if (finalNickname) {
        finalNickname = `${finalNickname} (${periodStart} - ${periodEnd})`;
      } else {
        finalNickname = `Statement (${periodStart} - ${periodEnd})`;
      }
    }
    
    // 3. Map Header Columns
    const detectedMappings: ColumnMappings = { date: '', description: '', amount: '' };
    const logs: string[] = [];
    
    const findHeaderIndex = (synonyms: string[]): string => {
      for (const h of headers) {
        if (matchSynonym(h, synonyms)) return h;
      }
      return '';
    };

    detectedMappings.date = findHeaderIndex(DATE_SYNONYMS);
    detectedMappings.description = findHeaderIndex(DESC_SYNONYMS);
    
    // Check if separate Debit/Credit exist
    const debitCol = findHeaderIndex(DEBIT_SYNONYMS);
    const creditCol = findHeaderIndex(CREDIT_SYNONYMS);
    if (debitCol && creditCol) {
      detectedMappings.debit = debitCol;
      detectedMappings.credit = creditCol;
    } else {
      detectedMappings.amount = findHeaderIndex(AMOUNT_SYNONYMS);
      const flagCol = findHeaderIndex(FLAG_SYNONYMS);
      if (detectedMappings.amount && flagCol) {
        detectedMappings.flag = flagCol;
      }
    }
    
    detectedMappings.balance = findHeaderIndex(BALANCE_SYNONYMS);
    
    // Log confidence findings
    if (!detectedMappings.date) logs.push("Could not confidently auto-map the 'Date' column.");
    if (!detectedMappings.description) logs.push("Could not confidently auto-map the 'Description/Payee' column.");
    if (!detectedMappings.amount && (!detectedMappings.debit || !detectedMappings.credit)) {
      logs.push("Could not locate separate Debit/Credit columns or a single Amount column.");
    }
    
    const confidence = !!(detectedMappings.date && detectedMappings.description && 
                        (detectedMappings.amount || (detectedMappings.debit && detectedMappings.credit)));
                        
    // 4. Extract and filter transaction rows (ignoring header and footer rows)
    const rawRows: ParsedRawRow[] = [];
    const transactionRows = rawLines.slice(headerRowIndex + 1);
    
    // Helper to identify footer lines (summary statistics, disclaimers)
    const isFooterRow = (row: string[]): boolean => {
      if (!row || row.length === 0) return true;
      const text = row.join(' ').toLowerCase();
      
      const footerKeywords = [
        'total', 'closing balance', 'opening balance', 'carried forward', 
        'brought forward', 'summary', 'disclaimer', 'page 1', 'page of', 
        'statement of account', 'end of statement'
      ];
      
      // If row starts with footer keyword or has empty fields in date column
      const containsKeyword = footerKeywords.some(kw => text.includes(kw));
      return containsKeyword;
    };
    
    transactionRows.forEach(row => {
      if (isFooterRow(row)) return;
      
      // Map cells to columns dictionary
      const parsedRow: ParsedRawRow = {};
      headers.forEach((h, idx) => {
        if (h) parsedRow[h] = (row[idx] || '').trim();
      });
      
      // A valid transaction row MUST have a value in the mapped Date field and not be empty
      const mappedDateCell = detectedMappings.date ? parsedRow[detectedMappings.date] : '';
      const mappedDescCell = detectedMappings.description ? parsedRow[detectedMappings.description] : '';
      
      if (mappedDateCell && isDateCell(mappedDateCell) && mappedDescCell) {
        rawRows.push(parsedRow);
      }
    });
    
    console.log("[MoneyFlow Debug] Auto-detection mapping result:", detectedMappings, " confidence:", confidence);
    
    return {
      fileName,
      headers,
      rawRows,
      detectedMappings,
      confidence,
      confidenceLogs: logs,
      preambleNickname: finalNickname || undefined,
      detectedCurrency: detectedCurrency || undefined,
      periodStart: periodStart || undefined,
      periodEnd: periodEnd || undefined
    };
  },

  /**
   * Extract account metadata from the preamble
   */
  extractMetadata(preambleRows: string[][]) {
    let periodStart = '';
    let periodEnd = '';
    let extractedNickname = '';
    let detectedCurrency = '';
    
    const allText = preambleRows.flatMap(row => row.filter(Boolean)).join(' ');
    
    // 1. Scan for Date ranges in preamble (e.g. "30/06/2026 To 07/07/2026" or "Statement Period: 15-Mar-2026 - 15-Apr-2026")
    const dateRegex = /\b(\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4}|\d{4}[-/.]\d{1,2}[-/.]\d{1,2}|[A-Za-z]{3}\s+\d{1,2})\b/gi;
    const matches = allText.match(dateRegex);
    if (matches && matches.length >= 2) {
      const sorted = [...matches].sort((a, b) => Date.parse(a) - Date.parse(b));
      periodStart = sorted[0];
      periodEnd = sorted[sorted.length - 1];
    }
    
    // 2. Scan for Account name or holder keyword
    for (const row of preambleRows) {
      const rowText = row.join(' ');
      const nicknameMatch = rowText.match(/(?:account\s+name|account\s+nickname|statement\s+for|account\s+type|holder|name)\s*:?\s*([a-zA-Z0-9\s]{3,30})/i);
      if (nicknameMatch && nicknameMatch[1]) {
        const val = nicknameMatch[1].trim();
        // Ignore generic labels
        if (!['statement', 'summary', 'period', 'metadata', 'account'].includes(val.toLowerCase())) {
          extractedNickname = val;
          break;
        }
      }
    }
    
    // 3. Scan for Currency Declarations (INR, USD, EUR, etc., or symbols ₹, $)
    const currencyMatch = allText.match(/\b(INR|USD|EUR|GBP|Rs|Rs\.|₹|\$)\b/i);
    if (currencyMatch && currencyMatch[1]) {
      detectedCurrency = currencyMatch[1];
    }
    
    return { periodStart, periodEnd, extractedNickname, detectedCurrency };
  },

  /**
   * Parses a PDF statement using pdfjs-dist.
   */
  async parsePDF(file: File): Promise<ParseResult> {
    console.log("[MoneyFlow Debug] parsePDF called for:", file.name);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
      const pdf = await loadingTask.promise;
      
      let allTextLines: string[] = [];
      
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        
        const items = textContent.items as any[];
        const linesMap: { [key: number]: any[] } = {};
        
        items.forEach((item) => {
          if (!item.str || item.str.trim() === '') return;
          const y = Math.round(item.transform[5]); // Y coordinate
          
          let matchedY = y;
          const deviation = 4;
          const existingY = Object.keys(linesMap).find(key => Math.abs(Number(key) - y) <= deviation);
          if (existingY) matchedY = Number(existingY);
          
          if (!linesMap[matchedY]) linesMap[matchedY] = [];
          linesMap[matchedY].push(item);
        });
        
        const sortedYs = Object.keys(linesMap).map(Number).sort((a, b) => b - a);
        sortedYs.forEach((y) => {
          const lineItems = linesMap[y].sort((a, b) => a.transform[4] - b.transform[4]);
          const lineStr = lineItems.map((item) => item.str).join('   ');
          allTextLines.push(lineStr);
        });
      }
      
      // Convert text lines to raw 2D array by splitting on multiple spaces
      const rawLines: string[][] = allTextLines.map(line => {
        return line.split(/\s{2,}/).map(s => s.trim()).filter(Boolean);
      });
      
      return this.processRawLines(file.name, rawLines);
    } catch (err: any) {
      console.error("PDF Parsing Error:", err);
      throw new Error(`Failed parsing PDF statement: ${err.message || err}`);
    }
  },

  /**
   * Normalizes raw rows into standard Transaction objects using the selected column mappings.
   */
  normalizeTransactions(
    rawRows: ParsedRawRow[],
    mappings: ColumnMappings,
    statementId: string,
    customRules: any[],
    periodStart?: string,
    periodEnd?: string
  ): any[] {
    console.log("[MoneyFlow Debug] normalizeTransactions started. Rows to normalize:", rawRows.length);
    
    // 1. Scan Date Column to disambiguate DD/MM vs MM/DD format
    const formatPreference = this.determineDateFormat(rawRows, mappings.date);
    console.log("[MoneyFlow Debug] Disambiguated date format preference:", formatPreference);
    
    // 2. Auto-detect Amount Structure Direction
    let amountSignDirection: 'normal' | 'inverted' = 'normal';
    if (mappings.amount && !mappings.flag && !mappings.debit) {
      amountSignDirection = this.determineAmountDirection(rawRows, mappings.amount);
      console.log("[MoneyFlow Debug] Disambiguated signed-amount direction:", amountSignDirection);
    }
    
    const normalized = rawRows.map((row, index) => {
      // Extract and Parse Date
      const rawDate = row[mappings.date] || '';
      const date = this.parseFlexibleDate(rawDate, formatPreference);
      
      // Extract Description
      const description = (row[mappings.description] || '').trim();
      
      // Extract Amount
      let amount = 0;
      if (mappings.debit && mappings.credit) {
        const debitVal = Math.abs(this.cleanAmount(row[mappings.debit]));
        const creditVal = Math.abs(this.cleanAmount(row[mappings.credit]));
        
        if (creditVal !== 0) {
          amount = creditVal; // Deposit (Credit) is positive inflow
        } else if (debitVal !== 0) {
          amount = -debitVal; // Withdrawal (Debit) is negative outflow
        }
      } else if (mappings.amount) {
        let rawVal = this.cleanAmount(row[mappings.amount]);
        
        if (mappings.flag) {
          // One column + Dr/Cr flag column
          const flag = (row[mappings.flag] || '').toLowerCase().trim();
          const absVal = Math.abs(rawVal);
          
          if (flag === 'cr' || flag === 'c' || flag === 'credit' || flag === 'deposit') {
            amount = absVal;
          } else if (flag === 'dr' || flag === 'd' || flag === 'debit' || flag === 'withdrawal') {
            amount = -absVal;
          } else {
            amount = rawVal;
          }
        } else {
          // Single signed amount column
          amount = amountSignDirection === 'inverted' ? -rawVal : rawVal;
        }
      }
      
      // Extract Balance
      const balance = mappings.balance ? this.cleanAmount(row[mappings.balance]) : undefined;
      
      // Categorize
      const catResult = categorizerService.categorize(description, customRules, amount);
      const category = catResult.category;
      const confidence = catResult.confidence;
      
      return {
        id: `${statementId}_${index}_${Date.now()}`,
        statementId,
        date,
        description,
        amount,
        balance,
        category,
        originalCategory: category,
        isUserOverridden: false,
        confidence
      };
    });
    
    // 3. Sanity check dates if period range is present in preamble
    if (periodStart && periodEnd) {
      const parsedStart = new Date(this.parseFlexibleDate(periodStart, formatPreference));
      const parsedEnd = new Date(this.parseFlexibleDate(periodEnd, formatPreference));
      
      if (!isNaN(parsedStart.getTime()) && !isNaN(parsedEnd.getTime())) {
        normalized.forEach(tx => {
          const txDate = new Date(tx.date);
          if (!isNaN(txDate.getTime())) {
            if (txDate < parsedStart || txDate > parsedEnd) {
              console.warn(`[MoneyFlow Warning] Transaction date ${tx.date} is outside the statement period range (${periodStart} to ${periodEnd})`);
            }
          }
        });
      }
    }
    
    console.log("[MoneyFlow Debug] normalizeTransactions finished. Normalized transactions:", normalized.length);
    return normalized;
  },

  /**
   * Determine date format preference (DMY vs MDY vs YMD)
   */
  determineDateFormat(rows: ParsedRawRow[], dateCol: string): 'DMY' | 'MDY' | 'YMD' {
    if (!dateCol) return 'DMY'; // Standard default in India/Europe
    
    let hasFirstFieldAbove12 = false;
    let hasSecondFieldAbove12 = false;
    let looksLikeYMD = false;

    // Scan up to 50 rows
    const sample = rows.slice(0, 50);
    
    for (const row of sample) {
      const cell = (row[dateCol] || '').trim();
      const clean = cell.replace(/[^\d/.-]/g, '');
      const parts = clean.split(/[-/.]/);
      
      if (parts.length === 3) {
        const p1 = Number(parts[0]);
        const p2 = Number(parts[1]);
        
        if (parts[0].length === 4) {
          looksLikeYMD = true;
          break;
        }
        
        if (!isNaN(p1) && p1 > 12) {
          hasFirstFieldAbove12 = true;
        }
        if (!isNaN(p2) && p2 > 12) {
          hasSecondFieldAbove12 = true;
        }
      }
    }
    
    if (looksLikeYMD) return 'YMD';
    if (hasFirstFieldAbove12 && !hasSecondFieldAbove12) return 'DMY'; // Day in first position (DD/MM)
    if (hasSecondFieldAbove12 && !hasFirstFieldAbove12) return 'MDY'; // Day in second position (MM/DD)
    
    // Default fallback is DMY (local Indian standard)
    return 'DMY';
  },

  /**
   * Parses flexible date strings into standard YYYY-MM-DD
   */
  parseFlexibleDate(rawDate: string, preference: 'DMY' | 'MDY' | 'YMD'): string {
    if (!rawDate) {
      return new Date().toISOString().split('T')[0];
    }
    
    const monthsNameMap: { [key: string]: number } = {
      jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
      january: 0, february: 1, march: 2, april: 3, june: 5, july: 6, august: 7, september: 8, october: 9, november: 10, december: 11
    };

    try {
      let str = rawDate.trim().replace(/\s+/g, ' ');
      
      // Match alpha month names like "15 Jan 2026" or "15-Jan-2026" or "Jan 15, 2026"
      const alphaMatch = str.match(/\b([A-Za-z]{3,9})\b/);
      if (alphaMatch && alphaMatch[1]) {
        const monthName = alphaMatch[1].toLowerCase().substring(0, 3);
        const monthIndex = monthsNameMap[monthName];
        
        if (monthIndex !== undefined) {
          // Extract numbers
          const numbers = str.replace(/[A-Za-z,]/g, ' ').split(/\s+/).map(s => s.trim()).filter(Boolean).map(Number);
          if (numbers.length >= 2) {
            let day = numbers[0];
            let year = numbers[1] || new Date().getFullYear();
            
            // Check if format is "Jan 15, 2026" vs "15 Jan 2026"
            const monthWordIdx = str.toLowerCase().indexOf(monthName);
            const firstNumIdx = str.indexOf(String(numbers[0]));
            if (monthWordIdx < firstNumIdx) {
              // "Jan 15, 2026"
              day = numbers[0];
              year = numbers[1] || new Date().getFullYear();
            }
            
            if (year < 100) year += year > 50 ? 1900 : 2000;
            const d = new Date(year, monthIndex, day);
            if (!isNaN(d.getTime())) {
              return d.toISOString().split('T')[0];
            }
          }
        }
      }

      // Numeric format parsing (e.g. 15/01/2026, 2026-01-15)
      const clean = str.replace(/[^\d/.-]/g, '');
      const parts = clean.split(/[-/.]/);
      
      if (parts.length === 3) {
        let day = 1;
        let month = 1;
        let year = new Date().getFullYear();
        
        if (preference === 'YMD' || parts[0].length === 4) {
          year = Number(parts[0]);
          month = Number(parts[1]);
          day = Number(parts[2]);
        } else if (preference === 'MDY') {
          month = Number(parts[0]);
          day = Number(parts[1]);
          year = Number(parts[2]);
        } else {
          // DMY
          day = Number(parts[0]);
          month = Number(parts[1]);
          year = Number(parts[2]);
        }
        
        if (year < 100) {
          year += year > 50 ? 1900 : 2000;
        }
        
        if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
          const d = new Date(year, month - 1, day);
          if (!isNaN(d.getTime())) {
            return d.toISOString().split('T')[0];
          }
        }
      }
    } catch {}
    
    // Final fallback: use native JS parser
    try {
      const p = Date.parse(rawDate);
      if (!isNaN(p)) {
        return new Date(p).toISOString().split('T')[0];
      }
    } catch {}

    return new Date().toISOString().split('T')[0];
  },

  /**
   * Auto-detect the direction of a signed amount column:
   * Normally: Positive values are Inflow/Income, Negative values are Outflow/Expenses.
   */
  determineAmountDirection(rows: ParsedRawRow[], amountCol: string): 'normal' | 'inverted' {
    if (!amountCol) return 'normal';
    
    let positiveRulesScore = 0;
    let negativeRulesScore = 0;
    
    const salaryKeywords = ['payroll', 'salary', 'direct deposit', 'dividend', 'wage', 'ach credit', 'zelle'];
    
    rows.slice(0, 100).forEach(row => {
      const cellVal = row[amountCol] || '';
      const num = this.cleanAmount(cellVal);
      if (num === 0) return;
      
      // Match keywords in rows
      const text = Object.values(row).join(' ').toLowerCase();
      const hasIncomeKeyword = salaryKeywords.some(kw => text.includes(kw));
      
      if (hasIncomeKeyword) {
        if (num > 0) positiveRulesScore += 10;
        else negativeRulesScore += 10;
      }
    });
    
    if (negativeRulesScore > positiveRulesScore) {
      return 'inverted'; // Inverted card statement: Negatives represent deposits/credits
    }
    
    return 'normal';
  },

  cleanAmount(val: string | number): number {
    if (val === undefined || val === null || val === '') return 0;
    if (typeof val === 'number') return val;
    
    const cleaned = cleanNumericString(val);
    const num = Number(cleaned);
    return isNaN(num) ? 0 : num;
  }
};
