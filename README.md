# MoneyFlow — Personal Finance Visualizer

MoneyFlow is a production-quality, responsive personal finance visualizer that processes bank statements entirely client-side. Built for privacy-first transaction intelligence, it helps users map their cashflow, identify subscriptions, analyze spending trends, and audit statement records with zero server overhead.

---

## 🔒 Privacy Architecture
MoneyFlow operates under a first-class privacy constraint:
1. **Local Parsing:** CSV statements (parsed via PapaParse) and PDF statements (parsed via pdf.js) are extracted entirely inside the browser sandboxed environment.
2. **Local Persistence:** Data is stored locally in IndexedDB using the lightweight `idb` wrapper.
3. **No External Backends:** No financial data, statements, or metadata ever leave the user's browser or travel to a server.

---

## 🚀 Getting Started

### Prerequisites
Make sure you have [Node.js](https://nodejs.org/) installed (v18+ recommended).

### Installation & Launch
1. Open a terminal in the project directory.
2. Install the dependencies:
   ```bash
   npm install
   ```
3. Run the development server:
   ```bash
   npm run dev
   ```
4. Click the local server link (usually `http://localhost:5173`) to open MoneyFlow.

---

## 📊 Sandbox & Demo Data
You can test and preview MoneyFlow immediately:
1. **Instant Demo Button:** On the landing screen, click **"Import Demo Statements"**. This generates a synthetic 3-month sandbox dataset (representing Jan, Feb, and March 2026 checkings ledger) to showcase all visualization and anomaly triggers.
2. **Drag & Drop CSVs:** We have provided synthetic CSV files in the [sample-data/](file:///c:/Users/Admin/OneDrive/Documents/Antigravity/Bank%20Statement/sample-data/) directory:
   - `checking-statement-january.csv`
   - `checking-statement-february.csv`
   You can drag and drop these files to test the parser and columns detector.

---

## 🛠️ Parsing & Column Mapping Mechanics

### 1. Auto-Detection Engine
When you drop or select a statement, MoneyFlow checks the table structure:
- **Date Column:** Scans headers for keywords (e.g., *Date*, *Posting*, *Trans Date*) and validates cells for MM/DD/YYYY, DD/MM/YYYY, or ISO date syntax.
- **Description Column:** Matches header names (e.g., *Description*, *Details*, *Payee*, *Narrative*) and ensures cell values are non-numeric strings.
- **Amount Column:** Checks for *Amount*, *Value*, *Total*, or separate *Debit* / *Credit* column headers.

### 2. Low-Confidence Remapping Modal
If auto-detection fails to locate the Date, Description, or Amount confidently, it places the statement into a queue and opens the **Column Mapper Modal**:
- Shows a live **Raw Grid Preview** of the first 5 rows of the statement.
- Enables toggling between a single Amount column or separate Debit/Credit columns.
- Lets you link required fields to the correct headers manually.
- Permits assigning an Account Nickname before normalizing the transaction records.

---

## 🧩 Folder Structure
- `src/services/db.ts` - Persistence layer wrapper around IndexedDB.
- `src/services/parser.ts` - PDF & CSV parser containing auto-detection scoring and transaction normalization.
- `src/services/categorizer.ts` - Smart matching rules engine mapping keywords to categories.
- `src/services/analyzer.ts` - Recurring subscription flags, MoM trend comparison (>20% category spike), new merchant notices, and high spend anomaly engines.
- `src/context/FinanceContext.tsx` - Main React state provider managing file queues, theme presets, rules, active tab routing, and filtering queries.
- `src/components/Upload/` - Upload dropzones and column re-mapping visualizers.
- `src/components/Dashboard/` - Cashflow KPI widgets, interactive custom SVG Sankey diagram, category pie charts, and monthly trend bars.
- `src/components/Tracker/` - Intelligence insight list displaying subscriptions, growth charts, and anomaly cards.
- `src/components/Transactions/` - Mobile-responsive transaction ledger with search filtering, inline categorization dropdowns, and bulk actions.
- `src/components/Settings/` - Category rules editor, active statements manager, and data purge panel.
