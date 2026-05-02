# Comprehensive Product Specification: JBROCK

## 1. Product Overview
**JBROCK** is a high-performance, enterprise-grade Sales & Distribution Management System. It is designed as a unified ecosystem to streamline daily sales operations, manage multi-branch inventory, automate financial reporting, and enforce strict administrative controls. 

The application follows a **BaaS (Backend-as-a-Service)** model using Supabase, ensuring real-time data synchronization across all devices while maintaining high security via Row Level Security (RLS).

---

## 2. System Architecture & Tech Stack

### 2.1. Frontend Environment
- **Framework:** Next.js (App Router)
- **State Management:** 
    - **Server State:** TanStack Query (React Query) for efficient caching and background synchronization.
    - **Global UI State:** React Context API.
- **Styling & UI:** 
    - **Base:** Tailwind CSS v4.
    - **Components:** Shadcn UI (Radix UI primitives).
    - **Animations:** Framer Motion for premium, interactive transitions.
    - **Icons:** Lucide React.
- **Data Visualization:** Recharts for dynamic, interactive dashboards.
- **Maps & Geospatial:** Leaflet & Google Maps API for customer/staff location tracking.
- **Data Validation:** Zod for type-safe schema validation.

### 2.2. Backend Environment (Supabase)
- **Database:** PostgreSQL with multi-tenant support.
- **Auth:** Supabase Auth (Email/Password & Google OAuth).
- **Storage:** Supabase Storage for transaction proofs (receipts, photos).
- **Security:** Strict PostgreSQL RLS policies to ensure users only access data within their permitted scope (Branch or User level).

---

## 3. Organizational Structure & RBAC

JBROCK implements a granular **Role-Based Access Control (RBAC)** system with 9 distinct roles:

| Role | Scope | Primary Responsibilities |
| :--- | :--- | :--- |
| **Admin / Owner** | Global | Full system access, management of branches, users, and global configuration. |
| **Manager** | Global/Branch | High-level oversight of operations and performance metrics. |
| **Finance** | Global | Verification of deposits (Setoran), reimbursements, and financial auditing. |
| **Leader** | Branch | Managing a specific branch team, approving branch-level requests. |
| **Gudang** | Branch | Inventory management, restock verification, and stock mutations. |
| **Sales** | Individual | POS operations, customer visits, and individual target tracking. |
| **Staff** | Individual | General operational tasks and attendance. |
| **Driver** | Individual | Delivery tracking and logistics support. |
| **Finance** | Global | Specialized financial reporting and payment verification. |

---

## 4. Core Functional Modules

### 4.1. Point of Sale (POS) & Sales Management
- **Smart Checkout:** Rapid transaction processing with multi-unit support (PCS, Box, etc.).
- **Pricing Engine:** Automated pricing based on customer category, branch, and active promotions.
- **Customer Tiers:** 
    - **Retail:** General walk-in customers.
    - **SA (Sub-Agent):** Regular distributors with specific pricing.
    - **WS (Wholesale):** Bulk buyers with specialized credit limits.
- **Payment Modes:** Support for Cash (Tunai), Transfer, and Credit (Tempo) with automated due date tracking.

### 4.2. Visual Analytics (Laporan Analisa Visual)
- **Dynamic Widget Engine:** Fully customizable dashboard allowing users to pin critical charts.
- **Metric Tracking:** Real-time monitoring of Omzet (Revenue), Qty sold, and Transaction volume.
- **Dimension Filtering:** Scoped analysis by Date Range, Branch, Salesman, and Product Category.
- **Category Focus:** Specialized auto-filtering for high-priority categories (e.g., "Rokok").

### 4.3. Inventory & Stock Management
- **Multi-Branch Stock:** Real-time visibility of inventory across all locations.
- **Mutasi Barang:** Formal process for transferring stock between branches or users.
- **Restock Logic:** Systematic stock addition with unique tracking numbers (`RSK/YYYYMMDD-HHMMSS`).
- **Stock Opname:** Periodic reconciliation of physical vs. recorded stock with discrepancy logging.

### 4.4. Financial Management
- **Setoran (Deposits):** Formal workflow for sales staff to deposit cash/transfer proceeds to the company bank accounts.
- **Petty Cash:** Management of daily operational funds at the branch level.
- **Reimbursements:** Digital submission of expense claims (BBM, Tol, Parkir) with photo proof.

---

## 5. Business Logic & Workflows

### 5.1. The "Persetujuan" (Approval) System
To maintain data integrity and financial security, critical actions require multi-stage approval:
- **Approval Types:** Discount overrides, price edits, transaction deletion, stock mutations, and reimbursement payments.
- **Bidirectional Sync:** Every approval request is linked to its source transaction; once approved, the system automatically executes the corresponding data change.

### 5.2. Customer Visit Workflow (Kunjungan)
- **Geofencing:** Validation of customer location via GPS before allowing transaction or visit logging.
- **Visit History:** Comprehensive logs of staff interactions with customers, including photos and notes.

---

## 6. Data Schema Overview (Core Entities)

### 6.1. Users & Employees
- **Fields:** `roles`, `cabangId`, `koordinat`, `isActive`, `kodeUnik`.
- **Logic:** Merges authentication data with employee profile information.

### 6.2. Products (Barang)
- **Fields:** `hargaBeli`, `hargaJual`, `minStok`, `satuanId`, `multiSatuan`.
- **Logic:** Supports complex unit conversions and branch-specific pricing.

### 6.3. Sales (Penjualan)
- **Fields:** `status` (Draft/Pending/Lunas/Batal), `metodePembayaran`, `jatuhTempo`, `lokasi`.
- **Items:** Detailed line items with subtotal, discount, and conversion logic.

---

## 7. Security & Integrity Standards
- **Supabase RLS:** Ensures data isolation between branches.
- **Audit Trails:** Every record tracks `createdBy`, `createdAt`, `updatedBy`, and `updatedAt`.
- **Zod Validation:** Frontend and backend validation to prevent malformed data insertion.
- **Offline Readiness:** Designed for eventual offline support via PWA service workers and local caching.

---

## 8. Future Roadmap
1. **AI-Powered Insights:** Automated sales forecasting using Gemini/GenAI.
2. **Push Notifications:** Real-time alerts for approvals and low stock levels.
3. **Advanced Closing:** Automated daily branch closing and EOD reporting.
4. **WhatsApp Integration:** Automated sending of receipts and payment reminders via WhatsApp.
