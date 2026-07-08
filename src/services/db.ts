import { openDB, type DBSchema, type IDBPDatabase } from 'idb';

export interface StatementMetadata {
  id: string;
  name: string;
  accountNickname: string;
  uploadDate: string;
  startDate: string;
  endDate: string;
  transactionCount: number;
}

export interface Transaction {
  id: string;
  statementId: string;
  date: string; // YYYY-MM-DD
  description: string;
  amount: number; // positive = income, negative = expense
  balance?: number;
  category: string;
  originalCategory: string; // The one first set by the engine
  isUserOverridden: boolean;
  notes?: string;
  confidence?: 'high' | 'medium' | 'low';
}

export interface CustomRule {
  id: string;
  keyword: string; // text to match in description (case-insensitive)
  category: string; // target category
}

export interface AppSetting {
  key: string;
  value: any;
}

interface MoneyFlowDBSchema extends DBSchema {
  statements: {
    key: string;
    value: StatementMetadata;
  };
  transactions: {
    key: string;
    value: Transaction;
    indexes: {
      'by-statement': string;
      'by-date': string;
    };
  };
  rules: {
    key: string;
    value: CustomRule;
  };
  settings: {
    key: string;
    value: AppSetting;
  };
}

const DB_NAME = 'MoneyFlowDB';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<MoneyFlowDBSchema>> | null = null;

function getDB(): Promise<IDBPDatabase<MoneyFlowDBSchema>> {
  if (!dbPromise) {
    dbPromise = openDB<MoneyFlowDBSchema>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        // Statements store
        if (!db.objectStoreNames.contains('statements')) {
          db.createObjectStore('statements', { keyPath: 'id' });
        }
        
        // Transactions store with indexes
        if (!db.objectStoreNames.contains('transactions')) {
          const txStore = db.createObjectStore('transactions', { keyPath: 'id' });
          txStore.createIndex('by-statement', 'statementId');
          txStore.createIndex('by-date', 'date');
        }
        
        // Rules store
        if (!db.objectStoreNames.contains('rules')) {
          db.createObjectStore('rules', { keyPath: 'id' });
        }
        
        // Settings store
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'key' });
        }
      },
    });
  }
  return dbPromise;
}

// Database helper functions
export const dbService = {
  // Statements
  async getAllStatements(): Promise<StatementMetadata[]> {
    const db = await getDB();
    return db.getAll('statements');
  },
  
  async saveStatement(statement: StatementMetadata): Promise<void> {
    const db = await getDB();
    await db.put('statements', statement);
  },
  
  async deleteStatement(id: string): Promise<void> {
    const db = await getDB();
    // Delete statement metadata
    await db.delete('statements', id);
    
    // Delete all transactions associated with this statement
    const tx = db.transaction('transactions', 'readwrite');
    const store = tx.objectStore('transactions');
    const index = store.index('by-statement');
    let cursor = await index.openCursor(IDBKeyRange.only(id));
    while (cursor) {
      await cursor.delete();
      cursor = await cursor.continue();
    }
    await tx.done;
  },

  // Transactions
  async getAllTransactions(): Promise<Transaction[]> {
    const db = await getDB();
    return db.getAll('transactions');
  },

  async saveTransactions(transactions: Transaction[]): Promise<void> {
    const db = await getDB();
    const tx = db.transaction('transactions', 'readwrite');
    const store = tx.objectStore('transactions');
    for (const transaction of transactions) {
      await store.put(transaction);
    }
    await tx.done;
  },

  async updateTransaction(transaction: Transaction): Promise<void> {
    const db = await getDB();
    await db.put('transactions', transaction);
  },

  // Rules
  async getAllRules(): Promise<CustomRule[]> {
    const db = await getDB();
    return db.getAll('rules');
  },

  async saveRule(rule: CustomRule): Promise<void> {
    const db = await getDB();
    await db.put('rules', rule);
  },

  async deleteRule(id: string): Promise<void> {
    const db = await getDB();
    await db.delete('rules', id);
  },

  // Settings
  async getSetting<T>(key: string, defaultValue: T): Promise<T> {
    const db = await getDB();
    const result = await db.get('settings', key);
    return result ? (result.value as T) : defaultValue;
  },

  async saveSetting(key: string, value: any): Promise<void> {
    const db = await getDB();
    await db.put('settings', { key, value });
  },

  // Wipe all databases
  async clearAllData(): Promise<void> {
    const db = await getDB();
    await db.clear('statements');
    await db.clear('transactions');
    await db.clear('rules');
    await db.clear('settings');
  }
};
