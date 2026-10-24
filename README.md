# الظل الملكي للعبايات — Royal Shadow Abayas

A bilingual Arabic/English abaya storefront with a separately routed admin dashboard. It uses Next.js App Router, TypeScript, Tailwind CSS, Prisma ORM 7, and MySQL 8+. The current implementation is one Next.js application: storefront, admin pages, and versioned REST endpoints deploy together and share the same database. Arabic is the default and prices are in SAR. The development seed creates required roles, size/color options, and first-run settings without inventing catalog or promotional content. Guest carts are stored in MySQL behind an HTTP-only session cookie; wishlists remain in the browser. Guest checkout creates a pending sandbox order and reserves stock transactionally.

## Requirements

- Node.js 20.19+ (Node 26 is supported) and npm
- MySQL 8.0+

If Node.js is installed but not on `PATH`, add its actual install folder for the current PowerShell session only:

```powershell
$env:Path = "C:\Program Files\nodejs;$env:Path"
node --version
npm --version
```

Use the verified installation directory on your machine; this does not change the permanent or system-wide `PATH`.

## Local setup (Windows PowerShell)

1. Install dependencies:

   ```powershell
   npm.cmd install
   ```

2. Copy `.env.example` to `.env`. Set `DATABASE_URL`, `NEXTAUTH_SECRET` (or `AUTH_SECRET`), `JWT_SECRET`, `ADMIN_SEED_EMAIL`, and a unique `ADMIN_SEED_PASSWORD` of at least 20 characters. Do not commit `.env` or use development secrets in production.

3. Create two separate, empty MySQL databases: `fashion_store` and `fashion_store_shadow`. Set `DATABASE_URL` to the first and `SHADOW_DATABASE_URL` to the second. Prisma uses the shadow database to safely calculate migrations; it may clear and recreate tables in that database. Never point it at the application database.

4. Generate the client, apply migrations, and create the configured administrator:

   ```powershell
   npm.cmd run db:generate
   npx.cmd prisma migrate dev
   npm.cmd run db:seed
   ```

   The seed script creates RBAC roles and permissions, the configured administrator, standard size/color options, and first-run store settings. It does not insert sample categories, products, product prices/images, promotions, or banners. Add real catalog content from the admin dashboard.

5. Create or recover the configured Super Admin account without reseeding catalog data:

   ```powershell
   npm.cmd run admin:create
   ```

   This command reads credentials from `.env`, hashes the password, grants `SUPER_ADMIN`, activates the account, and writes an audit log entry. If the configured email already exists, the command deliberately resets that account's password to `ADMIN_SEED_PASSWORD`. Never use a weak/shared value such as `admin`; use a unique password of at least 20 characters and keep `.env` private.

6. Run validation and start the app:

   ```powershell
   npm.cmd run lint
   npm.cmd run typecheck
   npm.cmd test
   npm.cmd run build
   npm.cmd run dev
   ```

   The integration test requires the migrated and seeded development database. It creates a uniquely identified pending order, verifies its payment and stock reservation, and removes only its own test records and stock reservation in a `finally` cleanup.

Open `http://localhost:3000/` or `http://localhost:3000/ar` for Arabic, `http://localhost:3000/en` for English, and `http://localhost:3000/admin/login` for admin sign-in.

## Features and boundaries

- The `/admin` route tree has its own Royal Shadow layout and is protected on the server. Every admin page re-checks an active user and an allowed administrative role. Super Admins can create administrator accounts and manage staff roles/status under `/admin/users`; the last active Super Admin cannot be removed or deactivated.
- Admin overview, product, order, customer, category, inventory, promotion, banner, homepage-section, sales report, activity log, settings, and administrator-access pages read live MySQL data. Product and order lists support server-side search/filtering/pagination; products can be created, edited, archived, and published. Product URLs are generated automatically from the product name on creation; editing a product preserves its existing URL. Product, category, and banner forms upload local images and save their local paths. Banner and homepage-section destination links can be entered, changed, or cleared in the admin panel; only same-site paths and HTTPS URLs are accepted. Category creation, promotion and banner creation/status changes, order status transitions, inventory adjustments, and pending-order cancellation are guarded by admin roles and recorded in the audit log. Inventory and cancellation updates preserve the stock reservation rules in database transactions.
- Product cards support wishlists, hover imagery, stock status, sale pricing, and a deliberate product-detail step so customers must choose a size and color before adding an item. The header cart icon links to the full localized cart page. Guest cart operations are exposed under `/api/v1/cart`, validate live variants and stock on the server, and preserve legacy items that no longer have a variant so customers can remove them explicitly.
- Checkout validates guest details and Saudi mobile numbers with Zod, creates a pending sandbox payment, and atomically reserves stock. No automatic discount is applied unless a promotion rule is explicitly implemented for checkout; successful submission is not proof of payment.
- Versioned REST endpoints are available under `/api/v1` and protected admin endpoints under `/api/admin/v1`. The generated OpenAPI document is served at `/api/openapi.json`. These routes are part of this Next.js app; this repository does not currently contain separate NestJS, PostgreSQL, Redis, or generated-client applications.
- Review submission/listing and admin moderation, plus admin APIs for promotions, banners, home sections, and pages, are available. The admin dashboard creates and activates promotions and banners, creates categories and homepage sections, and manages optional homepage-section links. Customer account/order history, password recovery, coupon redemption at checkout, full page editing, refunds, and editing existing variant size/color combinations remain incomplete. Super Admins can create administrator accounts and manage administrator roles/status at `/admin/users`.
- Real payment processing (mada, Visa/Mastercard, Apple Pay, Tamara, Tabby, bank transfer, or cash on delivery), payment provider adapters, verified webhooks, refunds/reconciliation, customer OTP/email sign-in, private order history/tracking, coupon redemption, newsletter subscriptions, shipping-provider integration, and full variant editing are not implemented. Do not collect card details or claim a gateway/regulatory integration is live.
- Only Saudi checkout/address validation and SAR are configured.
- Legacy product image files remain on disk for existing database references and tests, but the storefront no longer assigns them as fallback imagery. Upload brand-owned product images when creating actual catalog entries.
- Arabic uses Tajawal; English uses Montserrat and Cormorant Garamond.

## REST API currently available

The public API includes `GET /api/health` (including a live database connectivity check), `GET /api/v1/products`, `GET /api/v1/products/:slug`, `GET /api/v1/categories`, `GET /api/v1/search`, `GET /api/v1/home`, `GET /api/v1/pages/:slug`, `GET /api/v1/settings/public`, product review listing/submission, and guest cart read/add/update/remove/clear operations under `/api/v1/cart`. Admin endpoints under `/api/admin/v1` cover the dashboard, product list/create/read/update/archive/publish status, category list/create, orders and guarded status changes, inventory, customers, promotions and activation, banners and activation, homepage sections, pages, and review moderation. Admin endpoints re-check the signed-in user's active state and database roles on the server.

OpenAPI 3.1 is available from `GET /api/openapi.json`. This describes the implemented API surface only; it is not a claim that the remaining endpoints in the broader product brief have been delivered.

## Local image uploads

Administrators with the Super Admin or Product Manager role can upload JPEG, PNG, or WebP images for products, categories, and banners. The server checks the file size and image signature; SVG and remote image URLs are not accepted for new records. Uploaded files are stored outside `public/` and served from `/uploads/<generated-name>`. Product image edits preserve shared files and remove a replaced uploaded file only after confirming that no product, category, or banner still references it. Existing image records are not migrated or deleted.

The default storage directory is `.data/uploads` beneath the application working directory. Configure `IMAGE_STORAGE_DIR` to an absolute path or a path relative to the application working directory when needed. `IMAGE_UPLOAD_MAX_BYTES` defaults to `5242880` (5 MiB) and can be set from 1 byte to 20 MiB. The storage directory is ignored by Git and must be backed up and persisted alongside the database. Production deployments must mount the same durable filesystem on every application instance; ephemeral/serverless filesystems are not suitable. The Prisma schema and database require no migration for uploads.

## Migrations

Migration `20261022000000_reconcile_existing_schema` records the verified database changes that existed before the localized storefront migration. On a database that already had the initial baseline, the reconciliation was marked as applied only after confirming the migration replay exactly matched the current schema; it did not execute schema changes against or reset that database. Fresh databases apply all migration SQL in order.

Migration `20261022200000_cart_sessions_require_product_size` is additive: it adds a default-required product size flag and unique guest cart session/item keys without deleting cart records. Before deploying it to an existing database, create and verify a full database backup. Its changes can be reversed by dropping the new `requiresSize` column and unique indexes, then restoring the prior non-unique cart session index.

## Deploying online

1. Provision a managed MySQL 8+ database and a production host that supports the installed Next.js version and Node.js 20.19+. Set the production `DATABASE_URL` to the database connection string. Use TLS database connections and a least-privilege database user.
2. Configure production environment variables in the hosting provider's secret manager: `DATABASE_URL`, `APP_URL`, `NEXTAUTH_URL`, `NEXTAUTH_SECRET`, `AUTH_SECRET`, `JWT_SECRET`, and `PAYMENT_PROVIDER`. Generate unique random secrets for each environment. Do not set `SHADOW_DATABASE_URL` in production; it is only for development migration generation.
3. Deploy schema migrations with `npx prisma migrate deploy`, then build and start with `npm run build` and `npm run start`. Do not run the development seed on production. Apply catalog and owner credentials through approved administrative workflows.
4. Configure HTTPS, domain DNS, backups/restore testing, monitoring, rate limits, and a persistent image-storage provider. Replace all sample photography and confirm the commercial registration, VAT number, privacy/terms, shipping, returns and customer-support information before launch.
5. A real payment gateway is **not connected**. To add one, create a server-only adapter for a Saudi-compatible provider, obtain sandbox credentials directly from that provider, keep test and production credentials separate, verify signed webhooks server-side, handle duplicate events idempotently, and mark an order paid only after verified provider confirmation. Add refund/reconciliation handling and provider-specific tests before enabling production payments. Never collect card data in this application or treat a redirect as proof of payment.

The production checklist is not a compliance certification. Confirm applicable Saudi e-commerce, VAT, consumer-protection, privacy, and e-invoicing requirements with qualified providers before launch.
