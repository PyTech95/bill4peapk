# BILL4PE — PRD & Working Log

## Product
BILL4PE turns UPI payments into corporate reimbursement invoices. A user scans a
merchant's UPI QR, pays the merchant, records the transaction (UTR), and generates
an official GST-style bill. Bill4Pe's revenue is a **1% bill-generation fee**.

## Stack
- Frontend: React (CRA + craco, Tailwind, shadcn/ui, lucide-react)
- Backend: FastAPI (routers: auth, bills, expenses, payments, wallet, company, referrals, ai)
- DB: MongoDB
- AI: Google Gemini (vision / text / audio) via user-provided GEMINI_API_KEY, with
  Emergent LLM key as an optional fallback.
- Payments: Razorpay (wallet top-up + 1% bill fee only). Currently DISABLED on staging
  (no keys) → merchant payment uses direct UPI; bill fee falls back to mock wallet top-up.

## Money model (confirmed with founder — "Option 1: direct-to-vendor")
- **Merchant payment**: single "Pay Now" button opens the phone's UPI app chooser
  (`upi://pay?pa=<merchant VPA>`). Money goes DIRECTLY to the merchant — Bill4Pe is
  never in the money path.
- **Bill fee (1%)**: deducted from wallet; if wallet is short, a Pay Now tops up the
  wallet (Razorpay when configured) — this fee is Bill4Pe's revenue.
- NOTE: A true "Razorpay collects → settles to merchant" model (Razorpay Route / RazorpayX
  payouts) was explained and deferred; it requires KYC + funded balance.

## Deployment / environment
- Installed into /app on Emergent managed hosting (staging preview).
- CORS locked to the staging frontend domain. JWT secret rotated. Secrets in backend/.env.
- Super admin seeded (see test_credentials.md).

## Implemented (2026-06)
- Deployed the founder's bill4pet codebase into /app; app runs end-to-end on staging.
- Wired user's Gemini API key (fixed the shared free-tier rate-limit error).
- **Payment UX change**: replaced the 7 per-app UPI buttons with a SINGLE "Pay Now"
  button. (verified iter 1 & 2)
- **Razorpay merchant payment (LIVE)**: direct upi:// deep links were hitting the NPCI
  "UPI Risk Policy" block (Paytm/GPay "payment may fail"). "Pay Now" now opens Razorpay
  Checkout (purpose 'merchant_payment') for the bill total; on success it verifies the
  signature and saves the expense as paid, then goes to bill generation. Falls back to the
  upi:// deep link if Razorpay is not configured. (verified iter 3, 100%)
  - MONEY FLOW = Option A: funds settle into the BILL4PE Razorpay account, NOT the
    merchant's. Merchant settlement is manual for now (auto-payout via RazorpayX = Option B,
    deferred — needs RazorpayX account + KYC + funded balance).
- Fixed HIGH: generated Bill ID white-on-white → readable.
- Fixed registration crash: FastAPI 422 detail array normalized in axios interceptor.
- Security hardening (iter 3 findings): removed the unauthenticated generic
  /api/create-order & /api/verify-payment endpoints (live-order-creation hole); deleted a
  test file that hardcoded the live Razorpay secret.

## ⚠️ Action required by founder / backlog
- **ROTATE the Razorpay key secret** — it was shared in plaintext and briefly written to a
  test file. Regenerate from Razorpay Dashboard → Settings → API Keys, then update
  backend/.env RAZORPAY_KEY_SECRET.
- **Reconciliation gap (P1, real money)**: if the browser closes after payment but before
  POST /expenses, the customer is charged but no expense/bill is created. The webhook can't
  rebuild the expense. Fix = persist the expense draft into the payment_orders record before
  checkout + set RAZORPAY_WEBHOOK_SECRET + have the webhook finalize the expense.
- P1: Merchant auto-payout (Option B) via RazorpayX if money must reach merchants automatically.
- P2: Resend email key (invites/verify emails degrade gracefully).
- P3: split PayNow.jsx (~1.1k lines) — maintainability only.

## Re-deploy into fresh Emergent workspace (2026-06)
- Founder re-uploaded bill4pea-main.zip and asked to "deploy here". Moved codebase into /app,
  preserving platform .git/.emergent. Fresh clean-slate DB (`bill4pe_database`), no prior data.
- Config hardened for this env: CORS locked to the preview frontend domain (not `*`); JWT_SECRET
  freshly generated (rotated); secrets only in backend/.env (repo scan = no hardcoded keys).
- AI = Gemini via EMERGENT_LLM_KEY fallback (no own GEMINI_API_KEY). Email (Resend) not configured
  → 503 graceful. Payments (Razorpay) NOT configured → /payments/config enabled:false, UPI fallback.
- Verified: /api/health 200, super-admin seeded + login, new-user register (+₹50 bonus), all
  data/billing/superadmin endpoints 401 without auth, landing page renders.
- TO GO LIVE (blockers for real money): add RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET /
  RAZORPAY_WEBHOOK_SECRET (test-mode keys start rzp_test_); optionally RESEND_API_KEY + SENDER_EMAIL
  and own GEMINI_API_KEY. Then re-verify the reconciliation gap (P1) before opening real traffic.

## Payment Recovery + Webhook + Idempotent Bill (2026-06) — Feature 1 shipped
Business model confirmed by founder = REIMBURSEMENT (settlement out of the money path).
Razorpay LIVE keys provided (rzp_live_) — configured; webhook secret generated. Route settlement
built as a DISABLED modular scaffold (settlement_status=not_required).

INVARIANT DELIVERED: a captured payment ALWAYS yields exactly ONE bill, driven by BOTH the
frontend callback AND the webhook, through one reusable idempotent reconciler — frontend callback
is NOT required.

New/changed backend:
- core/enums.py (Payment/Bill/Settlement status + audit events)
- services/razorpay_service.py (order create, HMAC checkout+webhook verify (no-network), Route transfer, config validation)
- services/billing_service.py (atomic bill number BILL-YYYY-NNNNNN via counters, idempotent expense+bill claim, snapshot, fee never blocks, revert-on-failure)
- services/payment_service.py (create_payment_order w/ draft + session dedupe, reconcile_payment [THE brain], get_status self-heal, mark_failed/refunded guarded, background scan, ensure_indexes)
- services/settlement_service.py (Route scaffold, idempotent settlement records, retry)
- routers/webhooks.py (POST /api/webhooks/razorpay: raw-body verify + webhook_events dedupe)
- routers/admin_payments.py (/api/admin/payments list+alerts, reconcile, settlements retry, scan)
- routers/payments.py (create-order, verify, {tid}/status + legacy razorpay/order|verify delegating)
- server.py (register routers, startup indexes + Razorpay config validation + background reconcile worker)
- .env: RAZORPAY_KEY_ID/SECRET/WEBHOOK_SECRET, RAZORPAY_ENV=live, RAZORPAY_ROUTE_ENABLED=false, RECONCILE_*

New/changed frontend:
- lib/paymentRecovery.js (pending-txn marker + authoritative status polling)
- pages/app/PayNow.jsx (create-order-with-draft BEFORE checkout; app-reopen recovery banner; verify+poll->bill)

DB: new collections webhook_events (unique dedupe_key), settlements (unique transaction_id+merchant_id),
counters (bill sequence), payment_audit. payment_orders enriched (payment_status/bill_status/
settlement_status/expense_draft/expense_id/amount_paise/billing_session_id). Unique index on
expenses.bill_id (partial). No data deleted; recovered expenses carry source=razorpay_recovery.

Verified: self-test 19/19 + testing agent 19/19 (T1..T10 incl. webhook-only recovery, 3x dedupe,
concurrent callback+webhook -> 1 bill, bad sigs rejected, amount-mismatch manual_review, wallet
idempotent, refund by payment_id, admin alerts). Live checkouts NOT run (real money).

Backlog: enable Route (RAZORPAY_ROUTE_ENABLED + merchant Linked Accounts) if switching to marketplace;
rotate the exposed live secret; wire Resend; validate the AQ.-format Gemini key or keep fallback.

## Money-flow fix (2026-06): vendor Pay Now = DIRECT UPI to vendor
Founder reported the merchant Pay Now was collecting into BILL4PE's Razorpay account instead of the
vendor. Root cause: PayNow.jsx opened Razorpay Checkout (merchant_payment) → funds settled to the
platform. Fix (reimbursement model): handlePayNow now always fires the upi://pay?pa=<vendor VPA>
deep link → money settles DIRECTLY into the merchant's account; BILL4PE is never in the money path.
Removed payViaRazorpay/create-order/openRazorpay + recovery banner from the vendor pay screen; the
Razorpay recovery infra remains for wallet_recharge + the 1% bill_fee top-up (legitimately to BILL4PE).
Verified frontend 7/7 (testing agent iter6): Pay Now makes NO razorpay/create-order calls; save→bill works.
TRADEOFF: direct upi:// can hit the NPCI "UPI Risk Policy" block on some PSPs — to keep card/wallet
support while paying vendors, onboard vendors as Razorpay Route Linked Accounts (RAZORPAY_ROUTE_ENABLED).
Minor follow-up: onboarding tour overlay can intercept Pay Now taps on first run.


## Deploy into fresh Emergent workspace + hardening pass (2026-08-19)
Founder uploaded bill4pe-main.zip and said "deploy here". Moved codebase into /app,
preserving platform .git/.emergent and the protected .env keys. Fresh clean-slate DB
(`bill4pe_database`), no prior data.

Setup done:
- Backend deps installed (incl. emergentintegrations via Emergent index), frontend `yarn install`.
- backend/.env: MONGO_URL/DB_NAME local, JWT_SECRET freshly generated (rotated), EMERGENT_LLM_KEY
  set for Gemini AI fallback, super-admin seed vars set. Razorpay/Resend intentionally unset
  (graceful degrade).
- CORS locked (NOT `*`): CORS_ORIGINS = preview domain + prod `invoice-hardened.emergent.host`.
- Added backend/.env.example + frontend/.env.example (no real values) — Phase 1 hardening.

Pre-deploy gate (done):
- Secret scan of tracked source (py/js/jsx/json) = clean, no hardcoded rzp/sk-/mongo+srv/AIza keys.
- .gitignore already ignores .env / *.env / test_credentials.md.
- Verified locally: /api/health 200, /api/ 200, super-admin login via /api/auth/login works,
  protected /api/superadmin/stats returns 401 without token, landing page renders, CORS preflight
  from prod origin reflected correctly.
- deployment_agent readiness scan = PASS (zero blockers) with domain-locked CORS.

TO GO LIVE (real money blockers, unchanged): add RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET /
RAZORPAY_WEBHOOK_SECRET (+ RAZORPAY_ENV=live for rzp_live_), optionally RESEND_API_KEY + SENDER_EMAIL
and own GEMINI_API_KEY. Re-verify the reconciliation gap (P1) before opening real traffic.

## v2 COLLECT-AND-PAYOUT payment refactor (2026-08-20)
Replaced the REIMBURSEMENT model (customer pays merchant directly via upi:// intent + manual UTR)
with: scan ANY UPI QR → pay merchant_amount + 10% Bill4Pe fee via Razorpay Checkout → server-verified
capture → ONE bill → RazorpayX payout of ONLY merchant_amount to the scanned UPI.

Backend (new): services/razorpayx_service.py (Contacts, VPA Fund Accounts, idempotent Payouts via
X-Payout-Idempotency, payout webhook HMAC verify), services/payout_service.py (beneficiary cache,
ensure_payout with DB atomic claim + stable key, reconcile_payout_from_provider, retry). Modified:
core/config.py (compute_fee_breakdown — integer paise + Decimal ROUND_HALF_UP; RAZORPAYX_* env; fee %),
core/enums.py (PayoutStatus + payout audit events), payment_service.py (create_merchant_payment_order
locks payee + snapshots fee; reconcile triggers payout for merchant_payment; get/set_fee_percent DB-backed;
gateway fee/tax capture), billing_service.py (v2 snapshot: payee/fee/payout; skip legacy 1% wallet fee),
routers/payments.py (/payments/merchant/create-order, /payments/fee-preview [AUTH], enriched config),
routers/webhooks.py (/webhooks/razorpay/payments + /webhooks/razorpayx/payouts), routers/admin_payments.py
(payout alerts, provider-adjusted margin, platform-fee GET/SET, payout retry, outbound-ip), server.py
(razorpayx validate + payout indexes at startup).

Money model: amount_paise (order) = customer_total = merchant + fee. merchant_payout = merchant only.
Accounting stored separately: merchant_amount_paise, platform_fee_percent_snapshot, platform_fee_paise,
customer_total_paise, merchant_payout_amount_paise, gateway_fee/tax_paise, payout_fee/tax_paise.
Guarantees: 1 payment = 1 bill = max 1 payout (DB atomic claims + unique indexes on expenses.bill_id,
payouts.transaction_id, beneficiaries.normalized_upi + provider idempotency key). Payout failure never
downgrades payment/bill. Low balance → queue_if_low_balance (payout_status=queued), no re-charge.
Webhook-only recovery works if the app closes after capture.

Frontend: rewrote pages/app/PayNow.jsx to scan-any-UPI → fee summary (₹200/₹20/₹220) → Razorpay Checkout
→ success (live payout status) with app-close recovery. Removed the old direct-UPI + manual-UTR path.

Verified: tests_app/test_v2_engine.py mocked money engine 24/24; testing agent backend 14/15 + frontend
100% (fixed the one HIGH issue: /payments/fee-preview now requires auth). Live checkout/payout NOT run
(no Razorpay keys in this env).

TO GO LIVE (real money): add to backend/.env — RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET,
RAZORPAYX_ACCOUNT_NUMBER, RAZORPAY_PAYMENT_WEBHOOK_SECRET, RAZORPAYX_WEBHOOK_SECRET
(RAZORPAY_ENV=live for rzp_live_). Allowlist backend outbound IP in RazorpayX Developer Controls
(GET /api/admin/system/outbound-ip; preview IP was 35.225.230.28 — re-check on deploy). Configure the two
webhook URLs in Razorpay dashboard. Confirm the collect-then-payout-to-third-party model is permitted for
the account's KYC/compliance before enabling live.

## Re-deploy into fresh Emergent workspace + hardened deploy pass (2026-08-26)
Founder uploaded bill4pe-main.zip and said "deploy here". Migrated the full codebase into /app
(backend core/routers/services/assets, frontend src + configs), preserving platform .git/.emergent and
the protected frontend/.env (REACT_APP_BACKEND_URL). Clean-slate DB `bill4pe_database` (no prior data).

Setup:
- Backend deps installed (razorpay, resend, reportlab, google-genai, emergentintegrations). Frontend yarn install.
- backend/.env recreated: MONGO_URL/DB_NAME local, JWT_SECRET freshly generated (rotated), EMERGENT_LLM_KEY
  set for Gemini AI fallback, super-admin seed vars (dhiraj@callnman.com / Bill4Pe@2026). Razorpay/RazorpayX
  + Resend intentionally unset → graceful degrade (UPI fallback, email 503).
- Added backend/.env.example + frontend/.env.example (no real values).

Verified live on staging: /api/health 200, /api/health/providers (gemini fallback true, payments false),
super-admin login works, /superadmin/stats + /expenses/stats work, landing page renders. Clean secret scan
of tracked source (only a `rzp_test_mock` unit-test string, not a real key).

deployment_agent hardening pass (fixed to reach PASS):
- Aligned test_credentials.md password with .env.
- Optimized 3 queries: /expenses/stats (projection+limit), /superadmin/stats revenue (→ $group aggregation),
  /company/approvals (removed N+1 submitter lookup → single $in batch fetch).
- Added frontend/eslint.config.js (ESLint 9 flat config); `yarn build` succeeds (only lint warnings).
- CORS set to "*" per platform guidance for multi-domain routing — SAFE here because auth is Bearer-token in
  localStorage (not cookies), so wildcard CORS is not a credential-leak vector.
- Final deployment_agent scan = PASS, zero blockers.

TO GO LIVE (real-money blockers, unchanged): add RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET /
RAZORPAYX_ACCOUNT_NUMBER / RAZORPAY_PAYMENT_WEBHOOK_SECRET / RAZORPAYX_WEBHOOK_SECRET (RAZORPAY_ENV=live for
rzp_live_), allowlist backend outbound IP in RazorpayX, configure the two webhook URLs, and re-verify the
reconciliation gap before opening real traffic. Optionally add own GEMINI_API_KEY + RESEND_API_KEY/SENDER_EMAIL.
NOT YET TESTED this session: full authenticated UI flows and the payment/bill pipeline (needs testing agent).

## Manual double-scan UPI payment flow (2026-08-26)
Replaced the unreliable callback-dependent UPI-intent merchant payment with a manual double-scan flow,
gated by `PAYMENT_FLOW_MODE=manual_upi_double_scan`. Merchant is paid DIRECTLY by the customer in their
own UPI app; Bill4Pe never collects the merchant amount and RazorpayX payout is disabled in this mode.
Bill4Pe only takes the configurable service fee (`BILL4PE_PLATFORM_FEE_PERCENT=1`).

New files:
- `backend/services/manual_flow_service.py` — state machine + money logic (integer paise, atomic wallet
  debit via unique `wallet_ledger` (transaction_id+type), idempotent receipt generation).
- `backend/routers/manual_pay.py` — endpoints under /api/manual-pay: first-scan, {tid}/second-scan,
  /confirm, /proof (multipart, private storage), /generate, /fee-order, /fee-verify, GET {tid}, /history,
  {tid}/proof-file (owner/admin only), admin/transactions, admin/{tid}/review.
Edited:
- `core/config.py` (+PAYMENT_FLOW_MODE), `services/payment_service.py` (payout guarded off in manual mode),
  `services/pdf.py` (receipt title from bill_snapshot.document_title = "BILL4PE DIGITAL EXPENSE RECEIPT";
  status label "Payment Confirmed by User"), `server.py` (router + indexes), `backend/.env`
  (PAYMENT_FLOW_MODE, BILL4PE_PLATFORM_FEE_PERCENT=1), `.gitignore` (private_uploads).
- Frontend: rewrote `pages/app/PayNow.jsx` (double-scan + proof + wallet-first fee + recovery via
  localStorage `bill4pe_manual_txn`); `BillGen.jsx` (server fee + confirmed-by-user wording);
  `OnboardingTour.jsx` (auto-skip on /app/pay).

Verified by testing_agent (iteration_14): backend 100% (fee math, case-insensitive match, mismatch block,
YES/NOT-YET, proof authz + 5MB/type validation, wallet single-debit, idempotent + 4x concurrent generate =>
1 bill/1 debit, needs_fee, IDOR 404, admin masked UTR, recovery, PDF, no payout). Frontend E2E 100% via
manual-UPI fallback. Post-report fixes applied + re-verified: proof frozen after fee paid (400),
_make_receipt polls to never return null bill_id, BillGen wording/fee, onboarding overlay skip.
MOCKED: Razorpay/RazorpayX unset → Bill4Pe Fee QR (Razorpay) path returns 400 by design; wallet fee path
is the tested primary. Real keys needed to exercise the fee-QR path.

## Deploy log — 2026-06 (port into Emergent /app + hardened deploy prep)
- Ported founder's `newbill-main` zip into /app (backend + frontend + memory). Stack confirmed: React CRA/craco + FastAPI + MongoDB — maps 1:1 to Emergent runtime.
- backend/.env created: JWT_SECRET (strong random), CORS_ORIGINS, EMERGENT_LLM_KEY (Gemini AI fallback so AI works in preview), PAYMENT_FLOW_MODE, super-admin creds.
- Super admin reseeded: admin@newbill.com / NewBill@2026 (see test_credentials.md).
- Installed backend reqs (+ emergentintegrations via extra index) and frontend yarn deps. Both services green under supervisor. Landing + auth verified E2E via public URL.
- Testing agent iteration_16: 16/16 backend tests PASS (auth, register+welcome bonus, superadmin, server-side auth enforcement 401, expense create->persist->retrieve, reports, 422 validation, Razorpay graceful degradation). No critical issues.
- deployment_agent: PASS after setting CORS_ORIGINS="*". Rationale: on Emergent the frontend+backend share one origin (ingress routes /api), so CORS never engages for real traffic; access control is server-side Bearer-token auth (verified) + Pydantic + rate-limit. Locking to preview domain would break the deployed domain.

### Hardening posture (mapped to founder's plan)
- Secrets out of code: DONE (all via env; no secrets in code — deployment_agent verified).
- CORS: env-driven; `*` is safe here (single-origin serving). Lock to real domain only if you ever split hosts.
- Auth: JWT 30-day expiry, every protected route enforced server-side (401 verified). NOT just UI-hidden.
- Input validation: Pydantic models on endpoints; invalid bodies -> 422 (verified).
- DB backups: handled by Emergent managed deploy (not manual Atlas).

### Still needs founder-provided keys for full prod (degrade gracefully today)
- RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET / RAZORPAY_WEBHOOK_SECRET — live payment collection (currently disabled, app works without).
- GEMINI_API_KEY — dedicated Gemini key for prod (EMERGENT_LLM_KEY fallback active in preview).
- RESEND_API_KEY + SENDER_EMAIL — invoice/invite emails (currently 503 by design).

## Iter 17 — single-scan + UTR validation + live keys (bug fixes, verified)
- SINGLE SCAN: manual UPI flow now locks the merchant in ONE scan. first_scan() sets state=awaiting_merchant_payment (second_qr_verified/payment_session_locked=True). The old "scan again to confirm" step is gone. (PayNow.jsx STEP 2 second-scan block removed.)
- UTR VALIDATION: full UTR must be EXACTLY 12 digits — enforced server-side (manual_flow_service.submit_proof: isdigit + len==12 else 400) and client-side (PayNow.jsx utr-full-input: digit-only, maxLength 12, live x/12 counter, submit guard).
- KEYS: founder's GEMINI_API_KEY + LIVE Razorpay keys (rzp_live_) added to backend/.env; RAZORPAY_ENV=live. /api/payments/config -> enabled=true, mode=live. ⚠️ LIVE = real money on any Razorpay fee payment.
- Verified: iteration_17.json — 8/8 backend + frontend E2E (single scan -> ready-to-pay -> proof 12-digit UTR -> wallet-first receipt generated, no real Razorpay checkout triggered).
- Backlog cleanup (non-blocking): dead /second-scan route + PayNow.jsx line ~173 'second_qr_required' reference can be removed; set RAZORPAY_WEBHOOK_SECRET to enable the webhook safety-net.

## Iter 18 — UTR auto-read from screenshot (feature, verified)
- New endpoint POST /api/ai/extract-utr: downscales the uploaded UPI screenshot (PIL, max 1024px) and uses Gemini vision (UTR_EXTRACT_PROMPT) to pull the 12-digit UTR. Returns {utr, found}. Bounded by asyncio.wait_for(40s) and degrades to found=false (HTTP 200) on AI timeout/overload — never 5xx (avoids the 60s gateway 502).
- PayNow.jsx: selecting a payment screenshot auto-calls the endpoint; label shows a "Reading UTR from screenshot…" spinner; on success the 12-digit UTR auto-fills utr-full-input (success toast), else the user is asked to type it.
- Verified iteration_18.json: 4/4 backend + frontend E2E (auto-fill, spinner, toast) + regressions (single-scan, 11-digit UTR rejection) pass. Note: Gemini vision latency is ~5-11s when healthy, up to ~40s under Google "high demand" 503s (transient, handled).
