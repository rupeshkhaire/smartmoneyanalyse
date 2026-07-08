import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { dbService, type StatementMetadata, type Transaction, type CustomRule } from '../services/db';
import { parserService, type ColumnMappings, type ParsedRawRow, type ParseResult } from '../services/parser';
import { analyzerService, type Insight, type MonthSummary } from '../services/analyzer';
import { categorizerService } from '../services/categorizer';

// Helper to de-duplicate transaction lists using a multiset difference algorithm
function deduplicateTransactions(existing: Transaction[], incoming: Transaction[]): Transaction[] {
  const existingMap = new Map<string, number>();
  existing.forEach(tx => {
    const key = `${tx.date}_${tx.description.toLowerCase().trim()}_${tx.amount.toFixed(2)}`;
    existingMap.set(key, (existingMap.get(key) || 0) + 1);
  });

  const uniqueIncoming: Transaction[] = [];
  incoming.forEach(tx => {
    const key = `${tx.date}_${tx.description.toLowerCase().trim()}_${tx.amount.toFixed(2)}`;
    const count = existingMap.get(key) || 0;
    if (count > 0) {
      // Instance already exists, decrement the match counter to support duplicates but skip importing this duplicate one
      existingMap.set(key, count - 1);
    } else {
      uniqueIncoming.push(tx);
    }
  });

  return uniqueIncoming;
}

interface FinanceContextType {
  statements: StatementMetadata[];
  transactions: Transaction[];
  rules: CustomRule[];
  insights: Insight[];
  ignoredInsightIds: string[];
  
  // Filtering & Search
  activeTab: 'dashboard' | 'insights' | 'transactions' | 'settings';
  setActiveTab: (tab: 'dashboard' | 'insights' | 'transactions' | 'settings') => void;
  selectedStatementIds: string[];
  setSelectedStatementIds: (ids: string[]) => void;
  categoryFilter: string | null;
  setCategoryFilter: (category: string | null) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  dateRange: { start: string; end: string };
  setDateRange: (range: { start: string; end: string }) => void;
  
  // Theme & Preferences
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  currencySymbol: string;
  setCurrencySymbol: (symbol: string) => void;

  // Loading State
  isLoading: boolean;
  errorMessage: string | null;
  setErrorMessage: (msg: string | null) => void;
  
  // Database Operations
  uploadFiles: (files: File[]) => Promise<{ lowConfidenceFiles: ParseResult[]; successCount: number }>;
  importMappedStatement: (file: File, rawRows: ParsedRawRow[], mappings: ColumnMappings, accountNickname: string, periodStart?: string, periodEnd?: string) => Promise<void>;
  deleteStatement: (id: string) => Promise<void>;
  editTransactionCategory: (transactionId: string, category: string) => Promise<void>;
  bulkEditTransactions: (transactionIds: string[], updates: Partial<Transaction>) => Promise<void>;
  createRule: (keyword: string, category: string) => Promise<void>;
  removeRule: (id: string) => Promise<void>;
  ignoreInsight: (id: string) => Promise<void>;
  resetDatabase: () => Promise<void>;
  
  // Computed Data
  monthlySummaries: MonthSummary[];
  filteredTransactions: Transaction[];
}

const FinanceContext = createContext<FinanceContextType | undefined>(undefined);

export const FinanceProvider = ({ children }: { children: ReactNode }) => {
  const [statements, setStatements] = useState<StatementMetadata[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [rules, setRules] = useState<CustomRule[]>([]);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [ignoredInsightIds, setIgnoredInsightIds] = useState<string[]>([]);
  
  const [activeTab, setActiveTab] = useState<'dashboard' | 'insights' | 'transactions' | 'settings'>('dashboard');
  const [selectedStatementIds, setSelectedStatementIds] = useState<string[]>([]);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({ start: '', end: '' });
  
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [currencySymbol, setCurrencySymbol] = useState<string>('₹');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Initialize and load data on component mount
  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      try {
        const dbStatements = await dbService.getAllStatements();
        const dbTransactions = await dbService.getAllTransactions();
        const dbRules = await dbService.getAllRules();
        
        // Load preferences
        const savedTheme = await dbService.getSetting<'light' | 'dark'>('theme', 'dark');
        const savedCurrency = await dbService.getSetting<string>('currency', '₹');
        const savedIgnoredInsights = await dbService.getSetting<string[]>('ignoredInsights', []);
        
        setStatements(dbStatements);
        setTransactions(dbTransactions);
        setRules(dbRules);
        setTheme(savedTheme);
        setCurrencySymbol(savedCurrency);
        setIgnoredInsightIds(savedIgnoredInsights);

        // Apply dark mode theme to body element
        if (savedTheme === 'dark') {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      } catch (err) {
        console.error('Failed to load state from IndexedDB:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  // Compute insights when transactions or ignored lists change
  useEffect(() => {
    if (transactions.length > 0) {
      const generated = analyzerService.detectInsights(transactions, ignoredInsightIds);
      setInsights(generated);
    } else {
      setInsights([]);
    }
  }, [transactions, ignoredInsightIds]);

  // Compute default date range based on uploaded transactions
  useEffect(() => {
    if (transactions.length > 0) {
      const dates = transactions.map(t => t.date).sort();
      setDateRange({
        start: dates[0],
        end: dates[dates.length - 1]
      });
    }
  }, [transactions]);

  // Theme Toggler
  const toggleTheme = async () => {
    const nextTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(nextTheme);
    await dbService.saveSetting('theme', nextTheme);
    
    if (nextTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  // Currency Update
  const updateCurrencySymbol = async (symbol: string) => {
    setCurrencySymbol(symbol);
    await dbService.saveSetting('currency', symbol);
  };

  // Helper to re-categorize all auto-categorized transactions using current custom rules
  const reapplyRules = async (allTransactions: Transaction[], currentRules: CustomRule[]) => {
    const updated = allTransactions.map(tx => {
      if (tx.isUserOverridden) return tx;
      
      const catResult = categorizerService.categorize(tx.description, currentRules, tx.amount);
      return {
        ...tx,
        category: catResult.category,
        confidence: catResult.confidence
      };
    });
    
    // Save updated to IndexedDB and update State
    await dbService.saveTransactions(updated);
    setTransactions(updated);
  };

  // File Uploader
  const uploadFiles = async (files: File[]): Promise<{ lowConfidenceFiles: ParseResult[]; successCount: number }> => {
    console.log("[MoneyFlow Debug] uploadFiles context function called. Total files:", files.length);
    const lowConfidenceFiles: ParseResult[] = [];
    let successCount = 0;
    
    const currentRules = await dbService.getAllRules();
    
    for (const file of files) {
      console.log("[MoneyFlow Debug] Starting file parsing pipeline for:", file.name);
      try {
        let result: ParseResult;
        
        if (file.name.toLowerCase().endsWith('.csv') || file.name.toLowerCase().endsWith('.txt')) {
          result = await parserService.parseCSV(file);
        } else if (file.name.toLowerCase().endsWith('.pdf')) {
          result = await parserService.parsePDF(file);
        } else {
          console.warn(`Unsupported file type: ${file.name}`);
          continue;
        }

        // Check if mappings are high confidence
        if (result.confidence) {
          // Import immediately
          const statementId = `stmt_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
          const nickname = file.name.replace(/\.[^/.]+$/, ""); // Strip file extension
          
          console.log("[MoneyFlow Debug] High confidence detected. Starting transaction normalization for:", file.name);
          const normalized = parserService.normalizeTransactions(
            result.rawRows,
            result.detectedMappings,
            statementId,
            currentRules,
            result.periodStart,
            result.periodEnd
          );

          if (normalized.length > 0) {
            // Deduplicate incoming transactions against existing ones
            const deduplicated = deduplicateTransactions(transactions, normalized);
            
            // Compute date ranges based on actual transactions
            const dates = normalized.map((t: any) => t.date).sort();
            const statement: StatementMetadata = {
              id: statementId,
              name: file.name,
              accountNickname: result.preambleNickname || nickname,
              uploadDate: new Date().toISOString().split('T')[0],
              startDate: dates[0] || '',
              endDate: dates[dates.length - 1] || '',
              transactionCount: normalized.length
            };

            if (deduplicated.length > 0) {
              console.log(`[MoneyFlow Debug] Saving statement and ${deduplicated.length} non-duplicate transactions (out of ${normalized.length} total)`);
              await dbService.saveStatement(statement);
              await dbService.saveTransactions(deduplicated);
              
              // Update react state
              setStatements(prev => [...prev, statement]);
              setTransactions(prev => [...prev, ...deduplicated]);
              successCount++;
            } else {
              console.log("[MoneyFlow Debug] All transactions in statement were duplicates. Registering statement metadata anyway.");
              await dbService.saveStatement(statement);
              setStatements(prev => [...prev, statement]);
              successCount++;
            }
          } else {
            console.warn("[MoneyFlow Debug] No transactions normalized for:", file.name);
          }
        } else {
          console.log("[MoneyFlow Debug] Low confidence detected. Queueing for column mapper modal:", file.name);
          // Push to mapping step
          lowConfidenceFiles.push(result);
        }
      } catch (err: any) {
        console.error("[MoneyFlow Debug] Error parsing statement file:", file.name, err);
        setErrorMessage(`Failed to parse "${file.name}": ${err.message || err}`);
      }
    }
    
    console.log("[MoneyFlow Debug] uploadFiles success. Total imported:", successCount, "Total low-confidence:", lowConfidenceFiles.length);
    return { lowConfidenceFiles, successCount };
  };

  // Manual Import Step
  const importMappedStatement = async (
    file: File,
    rawRows: ParsedRawRow[],
    mappings: ColumnMappings,
    accountNickname: string,
    periodStart?: string,
    periodEnd?: string
  ) => {
    try {
      const statementId = `stmt_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
      const currentRules = await dbService.getAllRules();
      
      const normalized = parserService.normalizeTransactions(
        rawRows,
        mappings,
        statementId,
        currentRules,
        periodStart,
        periodEnd
      );

      if (normalized.length > 0) {
        // Deduplicate against state transactions
        const deduplicated = deduplicateTransactions(transactions, normalized);
        
        const dates = normalized.map((t: any) => t.date).sort();
        const statement: StatementMetadata = {
          id: statementId,
          name: file.name,
          accountNickname: accountNickname || file.name.replace(/\.[^/.]+$/, ""),
          uploadDate: new Date().toISOString().split('T')[0],
          startDate: dates[0] || '',
          endDate: dates[dates.length - 1] || '',
          transactionCount: normalized.length
        };

        if (deduplicated.length > 0) {
          await dbService.saveStatement(statement);
          await dbService.saveTransactions(deduplicated);
          setStatements(prev => [...prev, statement]);
          setTransactions(prev => [...prev, ...deduplicated]);
        } else {
          await dbService.saveStatement(statement);
          setStatements(prev => [...prev, statement]);
        }
      }
    } catch (err) {
      console.error(`Failed importing mapped file ${file.name}:`, err);
      throw err;
    }
  };

  // Delete Statement
  const deleteStatement = async (id: string) => {
    try {
      await dbService.deleteStatement(id);
      
      // Update state
      setStatements(prev => prev.filter(s => s.id !== id));
      setTransactions(prev => prev.filter(t => t.statementId !== id));
      
      // Clear filters if needed
      setSelectedStatementIds(prev => prev.filter(sid => sid !== id));
    } catch (err) {
      console.error(`Failed deleting statement:`, err);
    }
  };

  // Edit Single Category
  const editTransactionCategory = async (transactionId: string, category: string) => {
    const targetTx = transactions.find(t => t.id === transactionId);
    if (!targetTx) return;

    // Update modified transaction
    const updated = transactions.map(tx => {
      if (tx.id === transactionId) {
        const upd: Transaction = { ...tx, category, isUserOverridden: true, confidence: 'high' };
        dbService.updateTransaction(upd); // Update async in IndexedDB
        return upd;
      }
      return tx;
    });
    setTransactions(updated);

    // Learn from manual correction
    const keyword = categorizerService.extractMerchantPayee(targetTx.description);
    if (keyword) {
      console.log(`[MoneyFlow Debug] User manual categorization correction. Auto-learning rule: "${keyword}" -> "${category}"`);
      const existingRule = rules.find(r => r.keyword.toLowerCase() === keyword.toLowerCase());
      
      let nextRules = [...rules];
      if (existingRule) {
        existingRule.category = category;
        await dbService.saveRule(existingRule);
      } else {
        const newRule: CustomRule = {
          id: `rule_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
          keyword,
          category
        };
        await dbService.saveRule(newRule);
        nextRules.push(newRule);
      }
      setRules(nextRules);

      // Apply rule retroactively to all past transactions
      await reapplyRules(updated, nextRules);
    }
  };

  // Bulk Edit Transactions
  const bulkEditTransactions = async (transactionIds: string[], updates: Partial<Transaction>) => {
    const idsSet = new Set(transactionIds);
    const updatedTxs: Transaction[] = [];
    
    // Find payees to learn rules for if category is changing
    const payeesToLearn: { [payee: string]: string } = {};
    
    const updated = transactions.map(tx => {
      if (idsSet.has(tx.id)) {
        const upd = { 
          ...tx, 
          ...updates, 
          isUserOverridden: updates.category ? true : tx.isUserOverridden,
          confidence: updates.category ? 'high' : tx.confidence
        } as Transaction;
        updatedTxs.push(upd);
        
        if (updates.category) {
          const keyword = categorizerService.extractMerchantPayee(tx.description);
          if (keyword) {
            payeesToLearn[keyword] = updates.category;
          }
        }
        
        return upd;
      }
      return tx;
    });

    await dbService.saveTransactions(updatedTxs);
    setTransactions(updated);

    // Apply learned rules
    if (Object.keys(payeesToLearn).length > 0) {
      let nextRules = [...rules];
      for (const [keyword, category] of Object.entries(payeesToLearn)) {
        const existingRule = nextRules.find(r => r.keyword.toLowerCase() === keyword.toLowerCase());
        if (existingRule) {
          existingRule.category = category;
          await dbService.saveRule(existingRule);
        } else {
          const newRule: CustomRule = {
            id: `rule_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
            keyword,
            category
          };
          await dbService.saveRule(newRule);
          nextRules.push(newRule);
        }
      }
      setRules(nextRules);
      await reapplyRules(updated, nextRules);
    }
  };

  // Create Category Rule
  const createRule = async (keyword: string, category: string) => {
    const rule: CustomRule = {
      id: `rule_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      keyword,
      category
    };
    
    await dbService.saveRule(rule);
    const nextRules = [...rules, rule];
    setRules(nextRules);
    
    // Automatically trigger re-categorization of all transactions with new rules
    await reapplyRules(transactions, nextRules);
  };

  // Remove Category Rule
  const removeRule = async (id: string) => {
    await dbService.deleteRule(id);
    const nextRules = rules.filter(r => r.id !== id);
    setRules(nextRules);
    
    // Reapply remaining rules
    await reapplyRules(transactions, nextRules);
  };

  // Ignore An Insight Card
  const ignoreInsight = async (id: string) => {
    const nextIgnored = [...ignoredInsightIds, id];
    setIgnoredInsightIds(nextIgnored);
    await dbService.saveSetting('ignoredInsights', nextIgnored);
  };

  // Reset/Delete Database
  const resetDatabase = async () => {
    setIsLoading(true);
    try {
      await dbService.clearAllData();
      setStatements([]);
      setTransactions([]);
      setRules([]);
      setInsights([]);
      setIgnoredInsightIds([]);
      setSelectedStatementIds([]);
      setCategoryFilter(null);
      setSearchQuery('');
    } catch (err) {
      console.error('Failed clearing IndexedDB:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Computed: Monthly stats
  const monthlySummaries = React.useMemo(() => {
    return analyzerService.getMonthlySummaries(transactions);
  }, [transactions]);

  // Computed: Filtered list of transactions
  const filteredTransactions = React.useMemo(() => {
    return transactions.filter(tx => {
      // 1. Account statement filter
      if (selectedStatementIds.length > 0 && !selectedStatementIds.includes(tx.statementId)) {
        return false;
      }
      
      // 2. Category filter
      if (categoryFilter && tx.category !== categoryFilter) {
        return false;
      }
      
      // 3. Date range filter
      if (dateRange.start && tx.date < dateRange.start) {
        return false;
      }
      if (dateRange.end && tx.date > dateRange.end) {
        return false;
      }
      
      // 4. Search query (matches description, category, amount, or date)
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const descMatch = tx.description.toLowerCase().includes(query);
        const catMatch = tx.category.toLowerCase().includes(query);
        const amtMatch = tx.amount.toString().includes(query);
        const dateMatch = tx.date.includes(query);
        
        return descMatch || catMatch || amtMatch || dateMatch;
      }
      
      return true;
    }).sort((a, b) => b.date.localeCompare(a.date)); // Default sorting: newest first
  }, [transactions, selectedStatementIds, categoryFilter, dateRange, searchQuery]);

  return (
    <FinanceContext.Provider
      value={{
        statements,
        transactions,
        rules,
        insights,
        ignoredInsightIds,
        activeTab,
        setActiveTab,
        selectedStatementIds,
        setSelectedStatementIds,
        categoryFilter,
        setCategoryFilter,
        searchQuery,
        setSearchQuery,
        dateRange,
        setDateRange,
        theme,
        toggleTheme,
        currencySymbol,
        setCurrencySymbol: updateCurrencySymbol,
        isLoading,
        errorMessage,
        setErrorMessage,
        uploadFiles,
        importMappedStatement,
        deleteStatement,
        editTransactionCategory,
        bulkEditTransactions,
        createRule,
        removeRule,
        ignoreInsight,
        resetDatabase,
        monthlySummaries,
        filteredTransactions
      }}
    >
      {children}
    </FinanceContext.Provider>
  );
};

export const useFinance = () => {
  const context = useContext(FinanceContext);
  if (context === undefined) {
    throw new Error('useFinance must be used within a FinanceProvider');
  }
  return context;
};
