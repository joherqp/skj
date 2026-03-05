# CVSKJ - Sales & Distribution Management System

A professional, modern, and responsive web application for managing sales, inventory, and employees. Built using **Next.js 16+**, **TypeScript**, and **Supabase**.

## 🚀 Key Features

- **Real-time Dashboard**: Overview of sales performance, stock levels, and targets.
- **Point of Sales (POS)**: Streamlined transaction processing with QR/Barcode integration.
- **Inventory Control**: Comprehensive product tracking, stock mutation, and demand-based alerts.
- **Sales Targeting**: Set and monitor daily, weekly, or monthly goals for branches and individuals.
- **Role-Based Access Control**: Secure access for Admin, Leader, and Sales staff.
- **Financial Monitoring**: Track deposits (setoran), petty cash, and reimbursements.

## 🛠 Tech Stack

- **Framework**: [Next.js](https://nextjs.org/) (App Router)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **UI Components**: [Shadcn UI](https://ui.shadcn.com/)
- **Database & Auth**: [Supabase](https://supabase.com/)
- **State Management**: [TanStack Query](https://tanstack.com/query/latest)
- **Maps API**: [Google Maps Platform](https://developers.google.com/maps) (Routes & Distance Matrix)

## 📂 Project Structure (Next.js Standard)

```
skj/
├── src/
│   ├── app/              # Next.js App Router (Layouts, Pages, Groups, Globals)
│   ├── components/       # UI & Feature components
│   ├── contexts/         # Auth & Database Context providers
│   ├── hooks/            # Custom React hooks
│   ├── lib/              # Utils & API clients (Supabase, Maps)
│   └── types/            # TypeScript type definitions
├── public/               # Static assets
├── scripts/              # Utility scripts (SQL/Type generation)
├── supabase/             # Supabase SQL setup
└── .env.local            # Environment variables
```

## 💻 Local Development

1.  **Clone the repository** and install dependencies:
    ```bash
    npm install
    ```

2.  **Configure Environment Variables**:
    Create a `.env.local` file in the root directory:
    ```env
    NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
    NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
    SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
    SUPABASE_JWKS_URL=https://your-project-ref.supabase.co/auth/v1/.well-known/jwks.json
    NEXT_PUBLIC_SUPABASE_REQUEST_TIMEOUT_MS=20000
    NEXT_PUBLIC_SUPABASE_STORAGE_KEY=cvskj-auth-token
    NEXT_PUBLIC_VAPID_PUBLIC_KEY=your_vapid_public_key
    VAPID_PRIVATE_KEY=your_vapid_private_key
    VAPID_SUBJECT=mailto:admin@example.com
    NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_key
    ```

3.  **Run the development server**:
    ```bash
    npm run dev
    ```
    Access the app at `http://localhost:3000`.

4.  **Run lint checks**:
    ```bash
    npm run lint
    ```

## 🏗 Deployment

### Recommended: Vercel / Cloudflare Pages
1. Connect your GitHub repository.
2. Ensure the build settings are:
   - Framework Preset: `Next.js`
   - Build Command: `npm run build`
   - Output Directory: `.next`
3. Add the required Environment Variables in the platform dashboard.

### Alternative: Self-Hosting (aaPanel/Nginx)
1. Build the project locally: `npm run build`.
2. Upload the project to your server.
3. Configure Nginx to proxy requests to the Next.js service (standard port 3000).

## 📄 License

Proprietary - CVSKJ Sales & Distribution Management System.
