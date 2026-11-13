# Graph Report - zaptec-invoice-app  (2026-11-13)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 152 nodes · 271 edges · 12 communities (8 shown, 4 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 7 edges (avg confidence: 0.94)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `f9d3b196`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Frontend UI
- API Routes
- Database Models
- Zaptec Integration
- PDF Generation
- Data Layer
- External APIs
- Config Files
- Utility Functions
- Entry Points

## God Nodes (most connected - your core abstractions)
1. `main()` - 11 edges
2. `sync_data()` - 10 edges
3. `generate_invoices()` - 9 edges
4. `generate_invoice_pdf()` - 9 edges
5. `Consumption` - 7 edges
6. `Owner` - 7 edges
7. `App()` - 7 edges
8. `_upload_invoice_to_supabase()` - 6 edges
9. `authenticate_user()` - 6 edges
10. `fetch_charge_history()` - 6 edges

## Surprising Connections (you probably didn't know these)
- `test_format_currency()` --calls--> `_format_currency()`  [EXTRACTED]
  tests/backend/test_pdf_generator.py → backend/pdf_generator.py
- `test_format_date()` --calls--> `_format_date()`  [EXTRACTED]
  tests/backend/test_pdf_generator.py → backend/pdf_generator.py
- `test_format_number()` --calls--> `_format_number()`  [EXTRACTED]
  tests/backend/test_pdf_generator.py → backend/pdf_generator.py
- `generate_invoices()` --uses--> `Consumption`  [INFERRED]
  backend/main.py → backend/models.py
- `generate_invoices()` --uses--> `Owner`  [INFERRED]
  backend/main.py → backend/models.py

## Import Cycles
- None detected.

## Communities (12 total, 4 thin omitted)

### Community 0 - "Frontend UI"
Cohesion: 0.12
Nodes (15): _create_signed_invoice_url(), _extract_kwh(), _extract_session_bounds(), generate_invoices(), _get_billing_period(), health(), list_invoices(), login() (+7 more)

### Community 1 - "API Routes"
Cohesion: 0.17
Nodes (10): sync_data(), Consumption, Owner, extract_kwh(), extract_session_bounds(), main(), _api_get(), authenticate_user() (+2 more)

### Community 2 - "Database Models"
Cohesion: 0.18
Nodes (17): dependencies, react@^18.2.0, react-dom@^18.2.0, createSupabaseConnection(), fetchApi(), generateInvoices(), getApiUrl(), getInvoices() (+9 more)

### Community 3 - "Zaptec Integration"
Cohesion: 0.19
Nodes (11): _build_charging_items(), _format_currency(), _format_date(), _format_number(), generate_invoice_pdf(), MockConsumption, MockOwner, test_format_currency() (+3 more)

### Community 4 - "PDF Generation"
Cohesion: 0.18
Nodes (12): devDependencies, vite@^5.0.0, @vitejs/plugin-react@^4.0.0, name, private, scripts, build, dev (+4 more)

### Community 5 - "Data Layer"
Cohesion: 0.20
Nodes (3): mock_db(), test_generate_invoices(), test_sync_data()

### Community 6 - "External APIs"
Cohesion: 0.20
Nodes (10): devDependencies, supabase@^2.76.14, name, private, scripts, build, dev, postinstall (+2 more)

### Community 8 - "Config Files"
Cohesion: 0.40
Nodes (4): buildCommand, headers, installCommand, outputDirectory

## Knowledge Gaps
- **2 isolated node(s):** `backend`, `zaptec-invoice-app`
  These have ≤1 connection - possible missing edges. (Counts symbols only; 52 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `generate_invoice_pdf()` connect `Zaptec Integration` to `Frontend UI`?**
  _High betweenness centrality (0.032) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `sync_data()` (e.g. with `Consumption` and `Owner`) actually correct?**
  _`sync_data()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `backend`, `zaptec-invoice-app` to the rest of the system?**
  _2 weakly-connected nodes found - possible missing edges._
- **Should `Frontend UI` be split into smaller, more focused modules?**
  _Cohesion score 0.1164021164021164 - nodes in this community are weakly interconnected._
- **Why does `react` connect `Database Models` to `PDF Generation`?**
  _High betweenness centrality (0.027) - this node is a cross-community bridge._
- **Are the 3 inferred relationships involving `generate_invoices()` (e.g. with `Consumption` and `Invoice`) actually correct?**
  _`generate_invoices()` has 3 INFERRED edges - model-reasoned connections that need verification._
- **Are the 2 inferred relationships involving `Consumption` (e.g. with `generate_invoices()` and `sync_data()`) actually correct?**
  _`Consumption` has 2 INFERRED edges - model-reasoned connections that need verification._