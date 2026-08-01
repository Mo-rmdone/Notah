# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Primary: Egyptian retail shop owners who sell goods (household tools, electrical appliances,
furniture, and similar) on monthly installments and need to track customers, contracts, and
collections without losing money to bad math or memory. Self-registered — a business owner signs
up directly from the public homepage (`ابدأ مجانًا`) and classifies their operation by size
(individual / single shop / multiple branches / chain, `organizations.business_size`); no sales
conversation required to onboard.

Secondary: collectors — staff an owner invites to go out and collect payments in the field. They
get a narrow slice of the product: they can look up customers and record a payment, nothing else.

## Product Purpose

Replace paper ledgers, Excel sheets, and memory with a system where the money is always right.
Owners manage customers, installment contracts, payments, a collector team, supplier debts
(payables), and an auditable capital ledger — all in Arabic, right-to-left, priced and computed in
Egyptian pounds.

## Positioning

The mechanism a paper ledger, an Excel sheet, or a generic SaaS competitor cannot truthfully copy:
**the money math is server-enforced and always correct.** Balances are computed in Postgres
triggers with `numeric(12,2)` — never floating-point arithmetic in the browser. Payments are
allocated against a real per-installment schedule (not a single running total), so a customer who
prepays two months is never wrongly flagged as late. Every mutation to a payment, contract, or
customer is captured in an immutable audit log with no update/delete path, even for the owner.
"The numbers are never wrong" is the claim; multi-tenancy enforced at the database layer via RLS
(not the application layer, where a forgotten query filter can leak) is what backs it.

## Operating Context

- Fully Arabic, right-to-left interface; Cairo/Aref Ruqaa/Changa type system; Eastern-Arabic
  numerals; all money shown as ج.م (EGP).
- Two live roles today: **owner** (full access) and **collector** (read customers, insert
  payments only — cannot see suppliers, capital, or edit/delete anything). The organizations table
  and RLS model anticipate more roles and a branch entity, but only these two exist in the running
  product.
- WhatsApp is the de facto reminder/contact channel — `wa.me` deep links exist throughout, not an
  in-app notification system.
- A second, independent module handles the shop's own payables: suppliers, supplier payments, and
  supplier invoices with attached files. This is outside the "أقساطي" feature-spec document the
  owner reviewed — a real capability that spec doesn't credit.
- Customers are archived, never deleted, to keep payment history intact.
- Deploy targets: Cloudflare (frontend, Workers Static Assets) and Supabase Edge Functions
  (`manage-collector`) as two independent deploy pipelines — shipping one does not ship the other.

## Capabilities and Constraints

Shipped: customer management (search, filter, archive), contracts, payment recording with
optimistic UI, a 5-month customer performance strip, a collections dashboard (capital, collected
today/month, outstanding), supplier payables, and a public marketing homepage with self-serve owner
registration.

Recently added at the database layer, **with no UI yet**: a real per-installment schedule
(`installments` table, generated and kept in sync by triggers), payment allocation
(`payment_allocations`, oldest-unpaid-first waterfall), and an immutable `audit_log`. These exist in
the schema and fix a real correctness bug (the false "متأخر"/late flag on prepaying customers), but
no screen in the app queries them yet — building that UI is open, near-term work.

Explicitly undecided / not yet built: a 5-role permission matrix and branch entity, آجل
(deferred/B2B receivables) as a second product line, ETA e-invoicing, auto-debit mandates, credit
bureau scoring, portfolio analytics (PAR%), and billing/subscription enforcement. These were
identified against the full "أقساطي" feature spec but intentionally deferred — do not assume they
exist.

## Brand Commitments

Name: **Notah**. Marketing tone is direct and benefit-driven, not corporate — e.g. the homepage
headline "إدارة تشعر بها. أقساط تُحصَّل فعلًا." ("Management you can feel. Installments that
actually get collected."). Visual identity was deliberately redesigned from a generic starting
point toward an mdx.so-inspired system (documented in `docs/design-system-mdx.md`): white
background, near-black text, orange accent, pill radii, Changa display type paired with Cairo body
text. Treat that document and the current marketing components as the committed visual world for
the marketing surface, not a draft.

## Evidence on Hand

`supabase/seed.sql` provides realistic sample data (10 customers, 3 suppliers, 6 months of
payments, capital entries) for demos and screenshots — use it rather than inventing placeholder
data. No real customer testimonials, case studies, press mentions, or usage benchmarks exist yet;
do not fabricate any.

## Product Principles

1. The money is never wrong — all balance and schedule math is server-enforced in Postgres, never
   recomputed or trusted from client-side JavaScript.
2. Multi-tenancy is a database guarantee, not an application-layer convention — RLS plus composite
   foreign keys, so a missing query filter cannot leak another shop's data.
3. Design for how Egyptian shops actually work (trust receipts, "known as" names, WhatsApp as the
   real contact channel, a payment-window concept) over generic SaaS defaults.
4. Collectors get the minimum access the job requires; owners get full authority — this is a trust
   boundary enforced by RLS, not a UI-only restriction.
5. Onboarding is self-serve: a qualifying shop owner should be able to sign up and start using the
   product without a sales conversation.

## Accessibility & Inclusion

Arabic RTL is a first-class requirement throughout, not a translated afterthought: logical CSS
properties, RTL-aware components, and Eastern-Arabic numerals are expected in any new UI work.
