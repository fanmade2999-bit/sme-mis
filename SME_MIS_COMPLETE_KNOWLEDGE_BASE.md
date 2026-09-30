# SME: MIS with Price and Stock Control — Complete Project Knowledge Base

Status: Living project knowledge base / engineering handoff
Last consolidated: 2026-10-01
Repository: fanmade2999-bit/sme-mis
Default branch: main

## 0. Purpose of this file

This file is the long-form project memory for the SME MIS project.

It is intentionally more detailed than a normal README. A future development session should be able to read this file and recover:

- what the project is;
- why it exists;
- what the academic requirements are;
- what the current design is;
- which design changes were made and why;
- what the live database currently contains;
- what roles can and cannot do;
- how authentication works;
- how RLS works;
- how transactions work;
- how public price comparison works;
- what analytics mean;
- what is currently implemented;
- what is incomplete;
- what is excluded from scope;
- what deployment infrastructure is in use;
- what bugs were encountered and how they were fixed;
- what still needs adviser confirmation;
- what still needs engineering cleanup.

Important distinction:

1. Requirement means something the project is expected to provide.
2. Design decision means the team intentionally chose a specific implementation/model.
3. Implemented means code or database work exists.
4. Live means it has been confirmed against the connected service.
5. Partial means some portion exists but the full requested behavior is not complete.
6. Future/excluded means it is deliberately not part of the current release.
7. Open adviser question means the project should not silently decide it without confirmation.

Never mark an unfinished feature as complete simply because a database field or placeholder UI exists.

---

# 1. Project identity

## 1.1 Final title

SME: MIS with Price and Stock Control

Earlier working title:

Sari-sari Store Price & Stock Control System

The project began as a sari-sari-store-specific idea and was broadened into a general SME Management Information System while retaining the sari-sari store as the representative pilot.

## 1.2 One-line description

A multi-tenant, web-based Management Information System for SME price control, stock control, margin information, staff accountability, and public current-price comparison.

Useful mental model:

Shopee-like price comparison for participating SMEs, but without checkout, payments, delivery, marketplace ordering, or automatic price enforcement.

The business side manages its own operational data. The public side receives a deliberately limited read-only view of current public prices.

---

# 2. Academic context

Course/project context:

- ISPMGT project.
- Presentation target in the original academic plan: first week of October 2026.
- Original project timeline: August 17, 2026 to December 14, 2026.
- Original estimate: 86 working days.

Academic team:

- Mikie Ann Peranco — Project Manager.
- Rojean Mae Margate — Programmer.
- Carlo Hilo — System Analyst.

Primary current project source:

SME_MIS_Project_Knowledge_Base_v2.md

Older academic source:

ISPMGT_Full_Document.docx

The v2 knowledge base explicitly supersedes earlier interpretations where it changes a design detail. The original academic document remains important for the formal scope, chapters, diagrams, planning, CBA, and risk register.

---

# 3. Business problem

The project focuses on SMEs with informal or rotating staffing, especially small retail businesses such as sari-sari stores.

Typical operating conditions described by the project:

- family members may share operational duties;
- relief staff may cover shifts;
- not every worker was present when a supplier price changed;
- not every worker sees the latest delivery;
- pricing knowledge can be kept in memory;
- stock can be tracked informally;
- several workers may otherwise share one account.

These conditions create several problems:

1. Staff may quote an outdated price.
2. Staff may not know whether an item is currently in stock.
3. A shared login prevents identifying which human changed a price or stock.
4. The owner lacks a reliable audit trail.
5. Price/stock disputes are harder to resolve.
6. Margin requires manual memory/calculation if cost is not systematically recorded.
7. Customers may have no independent way to compare the price of the same product across businesses.

The project addresses these through one operational source of truth plus a public comparison layer.

---

# 4. System purposes

## 4.1 Operational purpose

Maintain accurate and attributable operational information:

- SME/business;
- staff membership;
- product identity;
- SME-specific item;
- categories;
- shelf/location;
- current selling price;
- optional cost;
- current stock;
- reorder level;
- QR binding;
- photo path;
- public visibility;
- item lifecycle.

## 4.2 Accountability purpose

Important actions should be attributable to an individual application account.

At minimum:

- price changes;
- stock movements;
- staff-account management;
- cost maintenance where permitted.

The project deliberately moved away from shared login credentials because a shared account cannot reliably answer who performed an action.

## 4.3 Management-information purpose

Turn operational records into decision-support information:

- sales value;
- units sold;
- current margin;
- estimated gross profit;
- inventory capital;
- low-stock state;
- price freshness;
- price-change activity;
- sell speed;
- no-sale indicators;
- public price position.

These are management indicators, not audited accounting statements.

## 4.4 Public purpose

Customers can search public listings and compare current prices across participating SMEs.

The project's interpretation of "prevent overpricing" is:

Prevent or discourage overpricing through transparency, not automatic enforcement.

The system does not impose an automatic price ceiling.

---

# 5. Objectives

## General objective

Design and develop a multi-tenant, web-based management information system that helps SMEs maintain pricing, stock, and margin accuracy across multiple staff members with clear accountability, while giving customers a way to look up and compare current prices across participating SMEs so that overpricing is discouraged through transparency.

## Specific objectives

1. Let each SME operate independently under a multi-tenant account model.
2. Provide individual staff accounts that the Owner can grant and revoke.
3. Enforce role-based access for catalog, price, cost, stock, and staff operations.
4. Let staff quickly confirm current price and stock state before a sale.
5. Retain full price-change history with responsible staff account and timestamp.
6. Calculate item margin automatically when cost exists.
7. Organize items by categories.
8. Support efficient item entry, including a path toward batch entry and unfinished details.
9. Support QR/item identification without silently creating data when a scan fails.
10. Record stock increases and decreases as attributable events.
11. Preserve historical transaction data for analytics.
12. Provide public, read-only product-price comparison.
13. Provide SME-side market reference without automatic price enforcement.
14. Keep private cost, margin, stock, location, QR, and staff information out of the public layer.

---

# 6. Scope

## 6.1 Target scale

The intended target is:

- micro and small SMEs;
- generally single-location businesses;
- informal or rotating staffing;
- sari-sari store as the representative pilot.

Sari-sari stores are the pilot, not the exclusive future target.

## 6.2 Included

- Multi-tenant SME account model.
- Individual staff accounts.
- Owner, Manager, Staff roles.
- Supabase Auth.
- Role-based authorization.
- Product identity and matching.
- SME-specific item catalog.
- Categories.
- Multiple categories.
- Shelf/location.
- Current selling price.
- Optional cost.
- Margin.
- Price history.
- Stock quantity.
- Reorder level.
- Stock increases.
- Stock decreases.
- Sale-time price/cost snapshots.
- Item archive lifecycle.
- Public listing control.
- Public price comparison.
- Price freshness.
- Internal market reference.
- Basic operational analytics.
- BI-ready operational model.
- Auditability.

## 6.3 Explicit exclusions / future work

- Password recovery.
- Supplier management.
- Supplier delivery management.
- Purchase orders.
- Multi-branch consolidation.
- Online/in-app payments.
- Payroll.
- Full accounting.
- General ledger.
- Tax accounting.
- Audited financial statements.
- Forecasting.
- Predictive analytics.
- AI price recommendation.
- Automatic price cap.
- Automatic price enforcement.
- Full marketplace ordering.
- Delivery/order fulfillment.
- Ratings/reviews as a public marketplace.
- Automatic item creation after a failed QR scan.
- Large enterprise branch features.

---

# 7. Root system model

The project is best understood as three connected functions on one operational dataset:

    SME MIS
       |
       +-------------------+
       |                   |
       v                   v
  Private SME          Public transparency
  management           / price comparison
       |
       v
  Analytics / BI

The operational database is the source of truth.

The public layer is read-only.

The analytics/BI layer is derived.

No secondary transactional truth should be created.

---

# 8. Main architecture

## 8.1 Technology stack

Frontend:

- Next.js 16.3.6.
- React 19.
- TypeScript.
- Tailwind CSS.
- Radix UI packages.
- Lucide React.

Backend:

- Supabase.
- PostgreSQL.
- Supabase Auth.
- PostgreSQL Row-Level Security.
- Supabase Edge Functions.

Hosting:

- Vercel.

Version control:

- GitHub.

Runtime:

- Node 24.x.

Supabase libraries:

- @supabase/ssr 0.12.7.
- @supabase/supabase-js 2.117.2.

Vercel CLI used by CI:

- 58.4.4.

---

# 9. Project connections

These identifiers are non-secret project metadata.

GitHub repository:

    fanmade2999-bit/sme-mis

Default branch:

    main

Supabase project reference:

    mypxbnqtxhbofuigyhzu

Vercel project:

    sme-mis

Vercel project ID:

    prj_K7YnFLEs6hKQ8seRjq5zywhslWIn

Vercel team ID:

    team_xDSSktmv9l86xjqPlVRQFmll

Vercel team slug:

    fanmade1

Never place the following in this knowledge base:

- Vercel token.
- Supabase secret key.
- Supabase service-role key.
- Password.
- Session cookie.
- Auth bearer token.
- Any other private credential.

---

# 10. Authentication architecture

The identity provider is Supabase Auth.

The application membership record is STAFF_ACCOUNT.

Conceptually:

    Supabase Auth user
            |
            v
      STAFF_ACCOUNT
            |
            v
           SME

Supabase Auth handles:

- identity;
- password/authentication method;
- session;
- access token.

STAFF_ACCOUNT handles:

- SME membership;
- application role;
- active/revoked state;
- person identity data;
- staff audit metadata.

Do not maintain a second application password hash.

---

# 11. Staff name normalization

## Previous model

A single compound full_name field.

## Current model

Atomic fields:

- first_name;
- middle_name;
- last_name;
- name_suffix.

Current live schema:

- first_name: NOT NULL;
- middle_name: nullable;
- last_name: nullable;
- name_suffix: nullable.

The UI constructs a display name when needed.

Example:

    first_name = Carlo
    middle_name = Armenion
    last_name = Hilo
    name_suffix = NULL

Display:

    Carlo Armenion Hilo

## Why

The atomic structure is better for:

- normalized storage;
- sorting;
- searching;
- reporting;
- future editing;
- structured person data.

## Current live Owner data observed

- First name: Carlo.
- Middle name: Armenion.
- Last name: Hilo.
- Suffix: null.
- Role: OWNER.
- Active: true.

---

# 12. Role model

## Owner

Full SME authority.

Expected capabilities:

- manage staff;
- invite Manager/Staff;
- change staff role;
- revoke staff;
- restore revoked staff;
- manage item catalog;
- manage categories;
- manage locations;
- change selling prices;
- maintain cost;
- perform stock operations;
- view management analytics;
- manage public listing participation;
- see Owner-only profitability information.

## Manager

Operational management role.

Expected capabilities:

- manage item catalog;
- create categories;
- create locations;
- change selling prices;
- restock;
- record losses;
- record spoilage;
- perform corrections;
- perform sale deductions;
- use permitted analytics;
- see public market-reference information.

Not intended to:

- manage staff accounts;
- edit item cost.

## Staff

Frontline operational role.

Expected capabilities:

- view/search catalog;
- inspect current price;
- inspect stock state;
- record sales / stock deductions.

Not intended to:

- change prices;
- edit cost;
- archive items;
- restock;
- record loss/spoilage/correction;
- manage staff.

## Public

Unauthenticated user.

Can:

- search public products;
- see public participating SME listings;
- compare current prices;
- see public freshness information.

Cannot:

- see private stock;
- see cost;
- see margin;
- see shelf/location;
- see QR;
- see staff identity;
- see private audit records.

---

# 13. Permission matrix

| Capability | Owner | Manager | Staff | Public |
|---|---|---|---|---|
| Register SME | Yes | No | No | No |
| Manage staff | Yes | No | No | No |
| View own SME catalog | Yes | Yes | Yes | No |
| Add item | Yes | Yes | No | No |
| Complete item | Yes | Yes | No | No |
| Create category | Yes | Yes | No | No |
| Create shelf/location | Yes | Yes | No | No |
| Archive item | Yes | No | No | No |
| Change price | Yes | Yes | No | No |
| Edit cost | Yes | No | No | No |
| View cost | Yes | Design wording says Manager may, current implementation is stricter | No | No |
| View margin | Yes | Design wording says Manager may, current implementation is stricter | No | No |
| SALE deduction | Yes | Yes | Yes | No |
| RESTOCK | Yes | Yes | No | No |
| LOSS | Yes | Yes | No | No |
| SPOILAGE | Yes | Yes | No | No |
| CORRECTION | Yes | Yes | No | No |
| Price history | Yes | Yes | Yes | No |
| Stock history | Yes | Yes | Yes | No |
| Private analytics | Yes | Yes within approved visibility | Limited | No |
| Public comparison | Yes | Yes | Yes | Yes |

Important:

The academic source has wording that can be interpreted as allowing Manager visibility of margin information. The current implementation is intentionally stricter:

- cost editing is Owner-only;
- Owner profit summary is Owner-only;
- non-Owner catalog screens do not expose cost input.

This should be reconciled with the adviser before broadening Manager access.

---

# 14. Core domain concept: Product vs Item

This is one of the most important normalization decisions.

PRODUCT means:

> What product is this?

ITEM means:

> How does this particular SME sell/manage that product?

Example:

    PRODUCT
    Coca-Cola 1.5L Original
          |
          +-- ITEM / SME A / ₱75 / stock 20
          +-- ITEM / SME B / ₱78 / stock 12
          +-- ITEM / SME C / ₱72 / stock 8

The shared Product identity enables public cross-SME comparison.

Each SME's Item keeps its own:

- price;
- cost;
- stock;
- reorder level;
- location;
- QR;
- photo;
- visibility;
- lifecycle.

---

# 15. Product matching

Matching order:

1. Exact barcode, if available.
2. Exact normalized canonical key.
3. Future fuzzy suggestions may exist, but must never silently merge identities.

Canonical identity is based on standardized product characteristics such as:

- brand;
- product name;
- variant;
- package size;
- package unit.

A meaningful change in:

- variant;
- size;
- unit;
- brand

normally implies a separate product identity.

Examples that should not silently merge:

- Coke 1.5L Original;
- Coke 1.0L Original;
- Coke 1.5L Zero.

---

# 16. Operational entities

## 16.1 SME

Purpose:

Tenant/business.

Core fields:

- sme_id;
- business_name;
- date_registered;
- status;
- public_listing_enabled;
- created_at;
- updated_at.

## 16.2 STAFF_ACCOUNT

Purpose:

Application membership/person.

Current fields:

- account_id;
- sme_id;
- auth_user_id;
- role;
- is_active;
- created_by_account_id;
- created_at;
- updated_at;
- revoked_at;
- revoked_by_account_id;
- first_name;
- middle_name;
- last_name;
- name_suffix.

## 16.3 PRODUCT

Purpose:

Shared product identity.

Current fields:

- product_id;
- brand, nullable;
- product_name;
- variant, nullable;
- package_size_value, nullable;
- package_size_unit, nullable;
- barcode, nullable;
- canonical_key;
- status;
- created_at;
- updated_at.

## 16.4 CATEGORY

Purpose:

SME-specific grouping.

Fields:

- category_id;
- sme_id;
- category_name;
- created_at;
- updated_at.

## 16.5 ITEM

Purpose:

SME-specific product listing.

Current fields:

- item_id;
- sme_id;
- product_id;
- category_id;
- current_price;
- cost, nullable;
- stock_qty;
- reorder_level;
- shelf_location, nullable;
- shelf_location_id, nullable;
- qr_code, nullable;
- photo_path, nullable;
- status;
- public_visible;
- price_updated_at;
- cost_updated_at, nullable;
- cost_updated_by_account_id, nullable;
- created_at;
- updated_at;
- archived_at, nullable;
- archived_by_account_id, nullable.

## 16.6 ITEM_CATEGORY

Purpose:

Normalized many-to-many item/category membership.

Fields:

- item_id;
- category_id;
- sme_id;
- created_at.

Primary key:

    item_id + category_id

The older/current ITEM.category_id remains as a primary/default category field for compatibility and reporting. ITEM_CATEGORY stores all selected categories.

## 16.7 SHELF_LOCATION

Purpose:

Reusable SME-specific physical/storage location.

Fields:

- location_id;
- sme_id;
- location_name;
- is_active;
- created_at;
- updated_at.

## 16.8 PRICE_CHANGE_LOG

Purpose:

Historical price event.

Fields:

- log_id;
- sme_id;
- item_id;
- account_id;
- old_price;
- new_price;
- changed_at.

## 16.9 STOCK_MOVEMENT

Purpose:

Historical stock event.

Fields:

- movement_id;
- sme_id;
- item_id;
- account_id;
- movement_type;
- quantity;
- correction_direction;
- unit_price_snapshot;
- unit_cost_snapshot;
- reason;
- date_time.

---

# 17. Relationships

- SME 1:M STAFF_ACCOUNT.
- SME 1:M CATEGORY.
- SME 1:M ITEM.
- SME 1:M SHELF_LOCATION.
- PRODUCT 1:M ITEM.
- ITEM M:N CATEGORY through ITEM_CATEGORY.
- ITEM 1:M PRICE_CHANGE_LOG.
- ITEM 1:M STOCK_MOVEMENT.
- STAFF_ACCOUNT 1:M PRICE_CHANGE_LOG.
- STAFF_ACCOUNT 1:M STOCK_MOVEMENT.

Tenant-aware relationships are used so that business data should not accidentally cross SME boundaries.

---

# 18. Category design

An item can belong to multiple categories.

Example:

    Medicine
    Topical
    Ointment

Correct database model:

    ITEM
      |
      v
    ITEM_CATEGORY
      |
      v
    CATEGORY

Do not use comma-separated category strings.

Current UI:

- does not silently choose the first category;
- requires explicit category selection;
- allows selecting multiple categories;
- can create a category inline;
- automatically selects a category that was just created.

---

# 19. Shelf/location design

Locations are normalized reusable SME-specific records.

Examples:

- Shelf A;
- Shelf B;
- Back Room;
- Display Counter;
- Cabinet 2;
- Bin 4.

Current UI allows:

1. choosing an existing location;
2. creating a new location directly from the catalog form.

The item stores shelf_location_id, while shelf_location text remains available for compatibility/display.

---

# 20. Product catalog form

Current intended fields:

- Brand — optional.
- Product name — required.
- Variant — optional.
- Barcode — optional.
- Package size — optional.
- Size unit — selectable.
- Selling price — required.
- Cost — optional, Owner-only.
- Categories — one or more.
- Shelf/location — optional.
- Reorder level — optional.
- Opening stock — optional.
- QR binding — optional.

## 20.1 Brand

Brand is nullable.

This is deliberate.

Example:

    Product: Bottled water
    Brand: NULL

The system should not force a brand where one is not meaningful.

## 20.2 Size units

Current UI choices include:

- g;
- kg;
- mg;
- mL;
- L;
- pcs;
- pack;
- box;
- bottle;
- tube;
- sachet;
- roll;
- pair;
- dozen;
- Other.

When a size value exists, a unit is required.

## 20.3 Blank vs zero

Avoid mysterious zero values.

Reorder level:

> Blank means use 0.

Opening stock:

> Blank means start at 0.

The explanatory note should be outside the input, not depend on a cryptic displayed 0.

---

# 21. Barcode and QR status

## Barcode

Current status:

Partial.

Implemented:

- barcode data field;
- manual barcode entry;
- product matching can use barcode.

Not implemented:

- camera barcode scanning workflow.

## QR

Current status:

Partial.

Implemented:

- QR data/binding field;
- manual binding value.

Not implemented:

- full camera QR scanning/binding workflow.

Important rule:

A failed QR scan must not automatically create an item/product.

---

# 22. Batch-entry status

Academic requirement includes efficient batch-capable item entry.

Current implementation:

- single-item creation form is functional;
- database contract supports item creation;
- full polished batch-entry UI is not complete.

Do not say batch entry is complete merely because repeated item creation is possible.

---

# 23. Unfinished-item workflow

Status enum includes:

- UNFINISHED;
- ACTIVE;
- ARCHIVED.

The intended flow is:

1. quickly create core item information;
2. optionally complete QR, quantity, location, photo later;
3. keep incomplete records in an unfinished-items queue.

Current status:

- status support exists;
- atomic creation support exists;
- full polished unfinished queue is not complete.

---

# 24. Item lifecycle

## UNFINISHED

Item needs later completion.

## ACTIVE

Normal operational item.

## ARCHIVED

No longer in normal active operation.

Archive is preferred over hard deletion.

Reason:

Historical events remain meaningful after an item is no longer sold.

---

# 25. Price management

Current price:

    ITEM.current_price

Requirements:

- non-null;
- non-negative.

A successful price change should:

1. authenticate;
2. resolve active account;
3. resolve SME;
4. verify role;
5. lock item;
6. read old price;
7. validate new price;
8. update current price;
9. update price freshness;
10. insert one history row;
11. commit atomically.

Current function:

    set_item_price(item_id, new_price)

Allowed:

- Owner;
- Manager.

Denied:

- Staff.

---

# 26. Price freshness

Use:

    price_updated_at

for price freshness.

Do not use:

    updated_at

for public price freshness.

Reason:

General updated_at may change because:

- stock changed;
- location changed;
- photo changed;
- category changed;
- visibility changed.

Current reporting view:

    v_price_freshness

It derives:

- days_since_price_update;
- is_stale.

Current analytics UI treats prices older than 30 days as stale.

---

# 27. Cost

Cost is optional.

The system must work when cost is unknown.

Do not fabricate a cost.

Current cost update function:

    set_item_cost(item_id, new_cost)

Allowed:

- Owner only.

---

# 28. Margin

Current item margin when cost exists:

    current_price - cost

Margin percentage when current price is greater than zero:

    (current_price - cost) / current_price * 100

Historical estimated gross profit uses sale-time snapshots:

    quantity *
    (unit_price_snapshot - unit_cost_snapshot)

Missing cost:

- do not invent;
- profitability can be unavailable/incomplete;
- cost coverage should be explicit.

---

# 29. Stock control meaning

A stock movement is:

> A recorded event explaining why the quantity of an item changed.

It is not just an arbitrary note.

## SALE

Customer purchased units.

Effect:

    stock decreases

Also captures at sale time:

- unit selling price;
- unit cost when available.

## RESTOCK

Inventory was received or added.

Effect:

    stock increases

## LOSS

Stock was lost, damaged, stolen, missing, or otherwise removed for a loss reason.

Effect:

    stock decreases

Reason required.

## SPOILAGE

Stock became unsellable due to:

- expiry;
- spoilage;
- unusable condition;
- similar reason.

Effect:

    stock decreases

Reason required.

## CORRECTION

The physical count differs from the system quantity.

Example:

    System: 10
    Physical: 12
    Correction: increase by 2

or:

    System: 10
    Physical: 8
    Correction: decrease by 2

Correction direction is required.

---

# 30. Stock transaction integrity

Conceptual sequence:

1. Authenticate.
2. Resolve active STAFF_ACCOUNT.
3. Resolve SME.
4. Verify role.
5. Lock item row.
6. Resolve signed movement.
7. Validate stock.
8. Capture price/cost snapshots for SALE.
9. Insert movement event.
10. Update stock quantity.
11. Commit atomically.

Rule:

Stock must never become negative.

---

# 31. Stock history principle

Do not rewrite historical SALE/RESTOCK/LOSS/SPOILAGE events just because a later count is wrong.

Use a compensating CORRECTION event.

This preserves the audit trail.

---

# 32. Stock UI

The Stock Control interface now explains:

- what a movement is;
- what each movement type means;
- why a reason may be required;
- what correction direction means;
- what quantity means;
- what the new stock quantity will be.

It includes a stock preview:

    current -> resulting

Example:

    10 -> 7 units

---

# 33. Staff-management workflow

Owner-only.

Owner actions:

- invite Manager;
- invite Staff;
- view staff accounts;
- make Staff into Manager;
- make Manager into Staff;
- revoke non-owner account;
- restore revoked non-owner account.

Owner cannot revoke self through the staff-management RPC.

Manager cannot manage staff.

Staff cannot manage staff.

---

# 34. Staff invitation Edge Function

Function:

    invite-staff

Current live state:

- status: ACTIVE;
- version: 4;
- browser CORS support;
- explicit authenticated-token validation;
- gateway verify_jwt disabled;
- user-scoped Supabase client used for actor lookup;
- privileged admin client used for Auth administration;
- structured error responses.

High-level process:

1. Check CORS/preflight.
2. Require POST.
3. Require Authorization bearer token.
4. Validate token and retrieve authenticated user.
5. Find caller's STAFF_ACCOUNT.
6. Require active SME membership.
7. Require Owner role.
8. Validate invitation payload.
9. Check existing Auth account by email.
10. Handle a previously revoked SME account.
11. Create Supabase Auth invitation.
12. Create STAFF_ACCOUNT.
13. If application-account insert fails, delete invited Auth user.
14. Return created account.

---

# 35. Staff invitation bug

Old UI behavior:

    Edge Function returned a non-2xx status code

Problem:

The frontend surfaced the generic SDK wrapper message without exposing enough of the actual server response.

Additional problem:

The earlier function was using an auth/call configuration that was brittle for direct browser invocation.

The new implementation:

- handles browser CORS;
- performs explicit auth validation;
- returns readable server-side errors;
- keeps privileged Auth operations in the admin client;
- detects previously revoked accounts.

The Owner UI now also attempts to extract a useful error from the function response.

---

# 36. Existing Auth account handling

If invitation email already belongs to an Auth user:

- it does not blindly create a duplicate account;
- if that user is a revoked staff member of the current SME, the function tells the Owner to restore the existing account;
- otherwise the invitation returns a conflict-style error instructing the Owner to use another email.

This prevents duplicate identity records and preserves audit history.

---

# 37. Staff restoration

Current function:

    reactivate_staff_account(account_id)

Allowed:

- Owner only.

It changes:

- is_active from false to true;
- revoked_at back to null;
- revoked_by_account_id back to null.

It does not create a new identity.

The goal is:

> restore the existing membership rather than creating a second account.

---

# 38. Setup and registration

## Registration

Current form collects:

- first name;
- middle name, optional;
- last name, optional;
- suffix, optional;
- email;
- password.

Name metadata also uses structured components.

## Setup

The authenticated user creates the SME workspace.

Current normalized bootstrap signature:

- business name;
- first name;
- middle name;
- last name;
- suffix.

The authenticated user becomes Owner.

After setup, a fresh navigation is used so the account state is reloaded rather than relying on stale client routing state.

---

# 39. Bootstrap legacy function

Live database still contains two signatures:

- old two-argument bootstrap_sme_owner;
- newer normalized five-argument bootstrap_sme_owner.

The old two-argument overload has been removed from the live database.

New code should call the five-argument version only.

---

# 40. Current database tables

Confirmed live public tables:

- sme;
- staff_account;
- product;
- category;
- item;
- item_category;
- shelf_location;
- price_change_log;
- stock_movement.

---

# 41. Current database views

Confirmed live views:

- v_inventory_status;
- v_sales_daily;
- v_price_freshness;
- v_public_price_comparison;
- v_public_price_position.

---

# 42. Current database helper functions

Private:

- private.current_sme_id();
- private.current_staff_account_id();
- private.current_staff_role();
- private.touch_updated_at().

Public application functions include:

- archive_item;
- bootstrap_sme_owner;
- change_staff_role;
- create_catalog_item;
- create_item;
- create_shelf_location;
- create_sme_category;
- ensure_product;
- get_owner_profit_summary;
- reactivate_staff_account;
- record_stock_movement;
- revoke_staff_account;
- set_item_cost;
- set_item_price.

---

# 43. RLS principles

Authentication identifies a person.

STAFF_ACCOUNT identifies the person's SME, role, and active state.

RLS identifies which rows that authenticated person may access.

Database functions protect sensitive mutations.

UI hiding is not sufficient security.

---

# 44. RLS policies currently used

## SME

Authenticated users can select their current SME.

Owner can update permitted SME settings only through the guarded public-listing RPC in the current implementation.

Public can read active public-participating SMEs.

## STAFF_ACCOUNT

Authenticated users can select staff in their current SME.

## PRODUCT

Public/authenticated reads can see active product identity subject to policy.

## CATEGORY

Authenticated users can read same-SME categories.

Category creation is performed through a guarded Owner/Manager RPC. Direct authenticated category mutation grants are removed.

## ITEM

Authenticated users can read same-SME items.

Owner/Manager can insert items through guarded catalog RPCs and change public visibility through a guarded RPC.

Direct authenticated item mutation grants have been removed; price, stock, cost, archive, and public-visibility mutations go through database functions.

Public item reads require:

- ACTIVE item;
- public_visible true;
- ACTIVE public-enabled SME;
- ACTIVE product.

## ITEM_CATEGORY

Authenticated users can read relationships belonging to their SME.

## SHELF_LOCATION

Authenticated users can read active locations belonging to their SME.

## PRICE_CHANGE_LOG

Authenticated access limited to same SME.

## STOCK_MOVEMENT

Authenticated access limited to same SME.

---

# 45. Grants and RLS

Grant and RLS are separate controls.

Grant answers:

> Can this database role access the object/column at all?

RLS answers:

> Which rows may it access?

Both must be designed.

The staff_account grants were explicitly updated so the authenticated role can read the normalized name fields and required membership data.

---

# 46. Security-definer rule

Some trusted application functions use SECURITY DEFINER.

This is sensitive because SECURITY DEFINER can bypass ordinary RLS according to the executing privilege context.

Therefore:

- functions must verify authenticated user;
- functions must verify active membership;
- functions must verify role;
- functions must verify current SME;
- anonymous access must be revoked;
- search_path must be controlled;
- functions must not be used as a shortcut around authorization.

---

# 47. Public data boundary

Public-safe data:

- product identity;
- business/SME name;
- current public price;
- price freshness;
- observed public comparison metrics.

Private data:

- cost;
- margin;
- stock;
- reorder level when considered operational;
- shelf/location;
- QR binding;
- staff identity;
- price history;
- stock history;
- private analytics.

---

# 48. Public price comparison

Current public read models:

- v_public_price_comparison;
- v_public_price_position.

Owner controls whether the SME participates in the public layer, and Owner/Manager controls whether each active item is publicly visible.

Public price position can provide:

- minimum observed price;
- average observed price;
- maximum observed price;
- rank;
- listing count.

These are observations.

Do not label them:

- government SRP;
- legal maximum;
- official fair price;
- mandated price.

The feature is transparency, not enforcement.

---

# 49. Public freshness rule

When stock changes:

    price_updated_at stays unchanged.

When price changes:

    price_updated_at changes.

This prevents unrelated item updates from making stale prices appear newly refreshed.

---

# 50. Public prices route

Current route:

    /prices

Current behavior:

- read-only;
- runtime data;
- product-name search;
- current price;
- public listing;
- business name;
- observed range;
- listing count;
- price freshness timestamp.

The public comparison only becomes visible when both the SME-level public listing switch and item-level public visibility permit it.

The page is configured to be dynamic so runtime Supabase data is not required during static build.

---

# 51. Analytics architecture

Operational DB is source of truth.

First derive operational reporting from the live transactional model.

Only after stable metrics exist should an analytical star schema be introduced.

---

# 52. Current analytics views

## v_inventory_status

Supports current inventory status such as:

- item;
- product;
- current price;
- stock quantity;
- reorder level;
- low-stock flag;
- inventory retail value.

## v_sales_daily

Aggregates SALE movement data by day.

Uses sale-time price snapshots.

## v_price_freshness

Calculates:

- price_updated_at;
- days since price update;
- stale-price flag.

## v_public_price_comparison

Safe public comparison layer.

## v_public_price_position

Compares current public prices for the same product.

---

# 53. Current analytics UI

Current analytics page is a 30-day operational view.

Current metrics:

- Sales value;
- Units sold;
- Low-stock count;
- Stale-price count.

Current sections:

- Low-stock watchlist;
- Price-freshness watchlist;
- Owner margin/profit area.

Owner profit information includes:

- sales date;
- item;
- product;
- product name;
- sold quantity;
- sales value;
- cost coverage;
- gross profit.

Incomplete:

- full sell-speed interface;
- full no-sale report;
- full price-change frequency dashboard;
- richer public market-reference analytics;
- full BI star schema.

---

# 54. Analytics formulas

## Current margin

    current_price - cost

## Margin percentage

    (current_price - cost) / current_price * 100

only when current price > 0.

## Sales value

    SUM(SALE.quantity × unit_price_snapshot)

## Estimated gross profit

    SUM(
      SALE.quantity ×
      (unit_price_snapshot - unit_cost_snapshot)
    )

## Inventory capital

    SUM(stock_qty × current_cost)

where current cost exists.

## Low stock

    stock_qty <= reorder_level

## No sale

No SALE event in the selected lookback period while the item was active.

## Sell speed

    units sold / active selling days

## Price-change frequency

Count successful price-change events during a selected period.

---

# 55. Analytics caveat

These metrics are management indicators.

They do not claim to be:

- full accounting profit;
- net income;
- tax result;
- audited statement;
- complete financial ledger.

Use "estimated gross profit" where historical profitability is incomplete.

If cost is missing, do not fabricate a profitability number.

---

# 56. BI future model

## Dimensions

- dim_date;
- dim_sme;
- dim_product;
- dim_category;
- dim_staff;
- optional dim_item.

## Facts

### fact_stock_movement

Grain:

One stock movement event.

### fact_sale

May initially be a reporting view over SALE movements.

Grain:

One sale movement event.

### fact_price_change

Grain:

One successful price-change event.

### fact_inventory_snapshot

Optional later.

Grain:

One item + SME + snapshot date.

### fact_public_price_snapshot

Optional later.

Grain:

One public SME/product price observation at a snapshot date.

---

# 57. BI grain rule

Never start by designing the fact table.

Correct sequence:

1. Identify business event.
2. Define exact grain.
3. Identify dimensions.
4. Identify measures.
5. Build query/report.
6. Materialize only when justified.

Avoid mixing:

- current-state facts;
- event facts;
- daily snapshots

without explicit grain.

---

# 58. Initial BI questions

Inventory:

- How much inventory capital is tied up?
- Which products have the most stock?
- Which products are low stock?

Sales:

- Which products sell the most units?
- Which produce the most sales value?
- Which produce the most estimated gross profit?

Pricing:

- Which items changed price?
- How often?
- How does current SME price compare with observed public prices?

Stock:

- Which items sell quickly?
- Which items have no sales?
- How much movement comes from sale, restock, loss, spoilage, correction?

Management:

- Which categories contribute most?
- Which products combine high sell speed with low stock?

---

# 59. DFD structure

## External entities

Exactly four in the academic Context/Level 1 model:

1. Owner.
2. Manager.
3. Staff.
4. Customer/Public.

Do not collapse these into one generic SME actor at Level 1 because role boundaries matter.

## Level 1 processes

1.0 Manage Accounts and Access.

2.0 Manage Product and Item Catalog.

3.0 Manage Prices.

4.0 Manage Stock.

5.0 Generate Analytics and Margin.

6.0 Serve Public Price Lookup.

## Academic data stores

D1 Staff Account File.

D2 Product Master File.

D3 Item Master File.

D4 Price Change Log.

D5 Stock Movement File.

D6 SME Registry.

The live database has additional implementation support tables for Category, Item Category, and Shelf Location.

---

# 60. Level 2 DFD

The academic deliverable currently retains two formal Level 2 explosions.

## Process 1.0

1.1 Register SME Account.

1.2 Create/Revoke Staff Account.

1.3 Authenticate Login.

1.4 Authorize Action by Role.

## Process 3.0

3.1 Validate Editing Permission.

3.2 Validate Price Input.

3.3 Apply Price Change.

3.4 Record Price Change Entry.

3.5 Display Price Change Status / Market Reference.

Internal engineering documentation can decompose other functions, but the academic submission should preserve the adviser-required diagram count.

---

# 61. DFD design principle

The DFD explains information movement.

It should not invent a new Level 1 process simply because the implementation contains:

- an analytics query;
- product matching;
- market comparison;
- category management.

The six-process Level 1 structure is the current academic baseline unless adviser approval says otherwise.

---

# 62. Normalization principles

Key normalization improvements:

1. Product vs Item.
2. Atomic staff name fields.
3. Item-category many-to-many relationship.
4. Reusable shelf/location entity.
5. Historical event tables instead of overwriting history.

Do not store:

- multiple categories in comma-separated text;
- staff identity as an inseparable compound field when atomic structure is required;
- public/private values together without access control;
- historical events only as a current-state counter.

---

# 63. Transaction contracts

## Price

    authenticate
    -> current account
    -> current SME
    -> role check
    -> lock item
    -> validate new price
    -> update item
    -> update price_updated_at
    -> insert exactly one log
    -> commit

## Stock

    authenticate
    -> current account
    -> current SME
    -> role check
    -> lock item
    -> determine movement delta
    -> validate stock
    -> capture snapshots
    -> insert movement
    -> update stock
    -> commit

## Catalog creation

    authenticate
    -> validate role
    -> validate product
    -> validate categories
    -> validate location
    -> resolve/create product
    -> create item
    -> add category memberships
    -> set location
    -> create opening stock
    -> return safe contract

---

# 64. Auditability

Every important operational action should answer:

- what happened?
- to which item?
- for which SME?
- who performed it?
- when?
- what was the previous state?
- what is the new state?

Price changes store old/new price.

Stock movements store type/quantity/reason and relevant snapshots.

Staff lifecycle stores creation/revocation metadata.

---

# 65. Public transparency interpretation

The public feature is intended to be a decision-support mechanism.

Example:

| Business | Current listed price | Last updated |
|---|---:|---|
| SME A | ₱18.00 | recent timestamp |
| SME B | ₱20.00 | recent timestamp |
| SME C | ₱17.00 | recent timestamp |

The system may show:

Observed range: ₱17.00–₱20.00.

The system should not claim:

- "₱18 is the correct price";
- "₱20 is illegal";
- "Government SRP is ₱17";
- "This business is overcharging" as a formal determination.

---

# 66. SME market-reference view

Authorized management may see:

- own price;
- observed public range;
- observed median/average where approved;
- difference from observed reference.

A large deviation may be treated as a review indicator.

It must not automatically:

- reject the price;
- cap the price;
- change the price.

---

# 67. Academic “why is this an MIS?” defense

Useful answer:

The system is more than inventory storage because it provides management information from accountable operational records. It maintains staff accountability, price history, stock movement history, optional cost/margin information, sales/inventory metrics, and public market-reference information.

---

# 68. Academic “why product and item?” defense

Useful answer:

Product identifies the shared thing being sold. Item identifies one SME's operational listing of that product. This allows multiple businesses to compare the same product while maintaining independent prices, costs, stock, locations, and visibility.

---

# 69. Academic “why not a fact table first?” defense

Useful answer:

The operational database is transactional. Fact tables are analytical structures whose grain must be derived from stable business events. Starting with facts would risk forcing operational data into an inappropriate analytical grain.

---

# 70. Academic “why movement instead of overwriting stock?” defense

Useful answer:

A movement preserves history, accountability, reason, and time. It lets the system keep a current stock quantity while still preserving how that quantity changed.

---

# 71. Academic “why optional cost?” defense

Useful answer:

Not every SME can reliably provide cost at item entry. Forcing a guessed cost would create misleading margin information. The system treats unavailable cost as unavailable profitability instead of fabricating a number.

---

# 72. Academic “why archive instead of delete?” defense

Useful answer:

Historical stock and price events remain useful even after an item is discontinued. Archiving preserves historical context and auditability.

---

# 73. Academic “who manages staff?” defense

Owner only.

Manager handles operational catalog, price, and stock work.

---

# 74. Academic “what is a stock movement?” defense

A stock movement is a historical inventory event, such as a sale, restock, loss, spoilage, or correction. It changes the current quantity and records the actor/time/event details needed for auditability.

---

# 75. Current frontend routes

Known routes:

- /
- /prices
- /setup
- /auth/login
- /auth/register
- /auth/confirm
- /auth/invite
- /auth/error
- /dashboard
- /dashboard/catalog
- /dashboard/stock
- /dashboard/analytics
- /dashboard/staff

---

# 76. Current frontend status

## Dashboard

Implemented:

- role-aware workspace;
- catalog entry;
- stock workspace;
- analytics access;
- Owner-only staff-management access;
- Owner public-listing enable/disable control.

## Catalog

Implemented:

- item creation;
- Product identity;
- optional brand;
- optional variant;
- selectable package units;
- multi-category;
- category creation;
- shelf/location selection;
- shelf/location creation;
- optional cost;
- opening stock;
- reorder level;
- price change;
- Owner archive.

Partial:

- barcode camera scanner;
- QR camera scanner;
- batch creation;
- unfinished queue;
- full history UI;
- photos/storage UI;
- richer catalog filtering.

## Stock

Implemented:

- sale;
- restock;
- loss;
- spoilage;
- correction;
- correction direction;
- required reason for non-sale;
- atomic stock update;
- stock preview;
- role restrictions.

Partial:

- dedicated movement history UI;
- advanced stock reports.

## Analytics

Implemented:

- 30-day sales;
- units;
- low stock;
- stale prices;
- low-stock watchlist;
- price freshness watchlist;
- Owner profit area.

Partial:

- sell speed;
- no-sale;
- price-change frequency;
- market-reference analytics;
- BI/star schema.

## Public price lookup

Core current-state comparison implemented.

---

# 77. No-fake-feature rule

Do not show a fake feature just to make the interface look complete.

Examples:

- fake Scan button;
- fake batch-processing indicator;
- fake forecasting;
- fake price recommendation;
- fake official benchmark.

Until a feature works, either:

- clearly label it;
- keep it hidden;
- or record it as future work.

---

# 78. GitHub Actions CI

Workflow:

    .github/workflows/ci.yml

Triggers:

- workflow_dispatch;
- push to main;
- pull request to main.

Concurrency cancellation is enabled to stop stale iterations from consuming resources.

## Verify job

1. Checkout.
2. Node 24.
3. npm install.
4. npm run lint.
5. npm run build.

## Production job

Runs after successful verification.

It:

1. checks VERCEL_TOKEN;
2. pulls Vercel production settings;
3. reproduces Vercel build;
4. deploys prebuilt artifact.

Pinned Vercel CLI:

    58.4.4

---

# 79. Important CI limitation

The workflow has workflow_dispatch, but the current production-job condition only allows:

    github.event_name == 'push'
    AND
    github.ref == 'refs/heads/main'

Therefore:

> Manual workflow dispatch currently verifies but does not deploy production.

If true manual production deployment is needed later, change the condition to also allow workflow_dispatch.

---

# 80. Vercel deployment strategy

Automatic Vercel Git deployments were disabled after repeated preview/deployment churn during development.

Current model:

    GitHub push
        |
        v
    GitHub Actions verify
        |
        v
    Vercel pull
        |
        v
    Vercel build
        |
        v
    Vercel deploy --prebuilt

vercel.json disables automatic Git deployment.

This means:

> A successful GitHub push or CI run does not automatically mean the newest commit is live on Vercel.

---

# 81. Confirmed Vercel production deployment

Last confirmed production deployment:

Deployment ID:

    dpl_3TJnfxg2huutgJWBjEowq75SKXfQ

State:

    READY

Target:

    production

Framework:

    Next.js

Aliases:

- sme-mis.vercel.app;
- sme-mis-fanmade1.vercel.app.

Confirmed production commit:

    3c28d114de4f1657480b137cef8e451165308e0b

Git integration deployment remains intentionally disabled. Production deployment is expected to occur from the GitHub Actions production job after the verify job succeeds.

---

# 82. Vercel Authentication protection

The production Vercel deployment is currently protected by Vercel Authentication.

Therefore:

- READY does not mean unauthenticated public access;
- public browser requests may redirect to Vercel authentication;
- do not claim unrestricted public availability;
- app-level public price functionality and platform-level Vercel Authentication are separate concerns.

---

# 83. Historical CI/build issues and fixes

## 83.1 NPM cache/lockfile issue

Problem:

CI tried to use npm caching without a suitable lockfile.

Fix:

- removed the incompatible caching requirement;
- use npm install.

## 83.2 Internal anchor/link

Problem:

ESLint rejected a plain internal anchor where Next Link was appropriate.

Fix:

- use Next Link.

## 83.3 Analytics implicit-any

Problem:

Supabase query results lacked explicit row types.

Fix:

- explicit SalesRow;
- InventoryRow;
- FreshnessRow;
- ProfitRow.

## 83.4 Public prices build problem

Problem:

Build attempted to instantiate runtime Supabase state without required build-time environment.

Fix:

- dynamic rendering.

## 83.5 Authenticated dashboard rendering

Problem:

Supabase-backed authenticated routes were not suitable for static build assumptions.

Fix:

- force dynamic rendering for dashboard/catalog/stock/analytics/staff as needed.

## 83.6 Vercel project settings

Problem:

Direct vercel build failed:

No Project Settings found locally.

Fix:

- pull production project settings before build.

## 83.7 Vercel scope

Problem:

An early link attempt used team ID as CLI scope.

Correct team slug:

    fanmade1

Correct team ID:

    team_xDSSktmv9l86xjqPlVRQFmll

## 83.8 Vercel token

Problem:

Initial token setup was insufficient/wrong.

Later corrected so GitHub Actions could authenticate.

Never record token details here.

---

# 84. Important recent feature changes

## Catalog

Added/improved:

- optional brand;
- optional variant;
- optional barcode;
- optional QR;
- package-size unit selector;
- custom Other unit;
- explicit multi-category selection;
- inline category creation;
- inline location creation;
- normalized shelf/location;
- blank-friendly reorder level;
- blank-friendly opening stock;
- helper notes;
- category junction table.

## Staff

Added/improved:

- explicit Owner/Manager/Staff explanation;
- Owner-only management;
- atomic names;
- restore access;
- better invite errors;
- hardened Edge Function;
- browser CORS.

## Stock

Added/improved:

- explanations for each movement;
- correction direction notes;
- stock preview;
- plain-language transaction guidance.

---

# 85. Current database migration history

Confirmed Supabase migration versions include:

- 20260930065314 initial_operational_schema
- 20260930065356 security_transactions_and_public_read_model
- 20260930065430 performance_fk_indexes
- 20260930070210 auth_bootstrap_and_public_view_hardening
- 20260930071013 public_price_lookup_rpc
- 20260930071157 public_price_view_security_invoker
- 20260930071627 account_management_and_reporting_views
- 20260930071940 owner_profit_availability_guard
- 20260930072027 secure_item_creation_transaction
- 20260930072046 activate_completed_item_creation
- 20260930072125 atomic_item_creation_with_opening_stock
- 20260930072426 restore_item_cost_column_protection
- 20260930072447 enforce_item_safe_column_grants
- 20260930073430 harden_operational_rpc_response_contracts
- 20260930074237 enable_anonymous_public_price_position
- 20260930074754 atomic_catalog_item_creation
- 20260930074810 safe_atomic_catalog_item_contract
- 20260930110719 grant_authenticated_staff_account_select
- 20260930191929 catalog_categories_and_locations
- 20260930192112 secure_catalog_category_creation
- 20260930192313 index_item_category_item_fk

The staff-name normalization and reactivation state has now been reconciled into live migration history as:

    20260930211319_normalize_staff_names_and_restore_access

The repository now carries that exact migration version, and the earlier unrecorded 20261001034500 normalization file was removed.

One historical caveat remains:

- Supabase contains two entries named harden_owner_checks_and_drop_legacy_bootstrap:
  20260930202902 and 20260930210747.
- The repository now contains the later applied version 20260930210747.
- The exact original SQL for the earlier 20260930202902 entry was not recovered from repository history.

The later hardening migration is idempotent, so the duplicate live application does not change the final function behavior.

Therefore:

> The live schema is verified in its current state, but exact byte-for-byte historical replay is still not guaranteed until the original 20260930202902 migration source is recovered or formally reconstructed.

---

# 87. Database performance

The item/category relationship introduced a composite foreign-key performance consideration.

Index added:

    idx_item_category_sme_item

The database performance advisor was checked after adding it.

The introduced foreign-key index issue was addressed.

Informational unused-index notices may remain and are not equivalent to correctness failures.

---

# 88. Security verification principles

Security should be reviewed for:

- cross-SME access;
- role bypass;
- public privacy;
- privileged function execution;
- direct table access;
- anonymous function execution;
- cost leakage;
- audit-history leakage;
- Auth identity mismatch.

Do not rely on the UI.

---

# 89. Database test strategy

## Tenant isolation

Examples:

- SME A reads SME B item → denied/zero rows.
- SME A updates SME B item → denied.
- SME A uses SME B category → rejected.
- SME A references SME B event/actor → rejected.
- SME A sees SME B private staff information → denied.

## Role enforcement

- STAFF changes price → denied.
- STAFF changes cost → denied.
- STAFF archives → denied.
- STAFF SALE → allowed when valid.
- STAFF RESTOCK → denied.
- MANAGER changes price → allowed.
- MANAGER changes cost → denied.
- MANAGER manages staff → denied.
- OWNER manages staff → allowed.
- OWNER changes cost → allowed.

## Price integrity

- valid change succeeds;
- exactly one history event;
- unchanged price creates no duplicate history;
- negative price rejected;
- failed transaction does not partially commit;
- historical sale snapshot stays unchanged.

## Stock integrity

- valid SALE decreases stock;
- SALE larger than stock fails;
- RESTOCK increases;
- LOSS/SPOILAGE require reason;
- CORRECTION requires direction;
- negative stock impossible;
- movement history remains.

## Historical integrity

- later price changes do not modify old sale snapshot;
- later cost changes do not modify old sale snapshot;
- archived items retain historical movement context;
- correction creates compensating event.

## Public privacy

- anonymous comparison works;
- anonymous private data access fails;
- disabling public listing removes SME;
- public_visible false removes item;
- stock-only changes do not make price look freshly updated;
- price change updates freshness.

## Product identity

- exact barcode matches existing Product;
- exact canonical key matches Product;
- distinct size/variant stays distinct;
- fuzzy similarity never silently merges.

## Analytics

- sales view matches SALE quantities and snapshots;
- estimated gross profit matches cost-covered sales;
- inventory values reconcile;
- low-stock logic matches threshold;
- no-sale uses defined lookback;
- public comparison only includes eligible listings.

---

# 90. Academic project planning

Original Work Breakdown Structure:

| ID | Activity | Predecessor | Days | Main output |
|---|---|---|---:|---|
| A | Project Planning | — | 10 | Proposal / Work Plan |
| B | Requirements Gathering | A | 10 | Requirements Specification |
| C | System & Database Design | B | 10 | ERD / DFD / Data Dictionary |
| D | UI/UX Design | B | 8 | Screen Mockups / Navigation |
| E | Account & Access Module | C, D | 10 | Account / Role / Access Module |
| F | Item & Catalog Module | E | 15 | Catalog / Category Module |
| G | Price & Stock Module | E | 12 | Price / Margin / Stock Module |
| H | Public Price Lookup Module | F, G | 10 | Public Comparison |
| I | Testing & QA | H | 10 | Test Results / Defect Log |
| J | Deployment | I | 5 | Live System |
| K | Final Documentation & Turnover | J | 6 | Final Docs / User Manual |

Original total:

    86 working days

Original dates:

    August 17, 2026
    through
    December 14, 2026

---

# 91. Academic CBA assumptions

Original development-cost estimate:

    ₱76,857.00

Original recurring annual estimate:

    ₱44,340.00

Estimated annual benefit per participating SME:

    ₱25,320.00

Original five-SME scenario:

    Annual benefit = ₱126,600.00
    Annual recurring cost = ₱44,340.00
    Net annual benefit = ₱82,260.00

Original estimated payback:

    0.93 years
    approximately 11 months

Original Year-1 BCR:

    1.04

These are academic/project-team estimates.

They are not audited financial facts.

---

# 92. Academic risk register

## R1 — Multi-tenant data leakage

Threat:

One SME sees another SME's private data.

Mitigation:

- RLS;
- tenant constraints;
- cross-SME tests.

## R2 — Role permission bypass

Threat:

Restrictions exist only in UI.

Mitigation:

- database-side authorization;
- role-specific tests.

## R3 — Scope creep from public lookup

Threat:

Public feature expands into:

- ratings;
- maps;
- ordering;
- marketplace.

Mitigation:

- scope freeze;
- future-work tracking;
- adviser approval.

## R4 — Critical-path schedule slip

Activities on the critical path have zero float in the academic plan.

## R5 — Free-tier limits

Mitigation:

- small seed data;
- reset test data;
- monitor usage.

## R6 — No password recovery

Known limitation.

## R7 — Low SME participation

Original planning assumption:

    five participating SMEs

Potential effect:

Small comparison sample.

## R8 — SME staff resistance

Mitigation:

- simple screens;
- short orientation;
- status-first workflow.

## R9 — Loss of source code/documents

Mitigation:

- GitHub;
- cloud storage;
- no sole-device copy.

## R10 — Team member unavailable

Mitigation:

- shared repository;
- weekly sync;
- reassignment.

## R11 — Inaccurate cost data

Mitigation:

- optional cost;
- missing-cost handling;
- no fabricated profit.

## R12 — Requirements misunderstood

Mitigation:

- adviser confirmation;
- written scope;
- versioned diagrams.

Additional engineering risks:

## R13 — Product identity mismatch

Wrong cross-SME comparison if distinct products are merged.

## R14 — Historical profitability error

Using current values instead of snapshots could distort past gross profit.

## R15 — History destruction

Hard delete could destroy audit context.

## R16 — BI inconsistency

Analytical layer could disagree with transactional truth.

## R17 — Public privacy leakage

Private cost/stock/staff information could leak through public views.

## R18 — Invitation/email configuration failure

Invite function can be technically correct while email delivery/configuration remains incomplete.

## R19 — Deployment drift

GitHub main can be newer than Vercel production because automatic Git deployment is disabled.

---

# 93. Design decision history

## Decision 1 — Broaden scope to SME

Reason:

Teacher guidance broadened the project beyond one store type.

## Decision 2 — Public transparency rather than price enforcement

Reason:

The public-serving interpretation is best represented as current cross-SME visibility, not an automatic price regulator.

## Decision 3 — Individual staff accounts

Reason:

Accountability.

## Decision 4 — Product vs Item

Reason:

Shared product identity plus independent SME operations.

## Decision 5 — Archive instead of delete

Reason:

Historical correctness and auditability.

## Decision 6 — Sale-time snapshots

Reason:

Historical sales/profit must use values that were true at sale time.

## Decision 7 — Optional cost

Reason:

Missing cost is legitimate; fake cost is misleading.

## Decision 8 — Stock movement events

Reason:

Stock should have an attributable history.

## Decision 9 — Explicit correction direction

Reason:

A numeric correction without direction is ambiguous.

## Decision 10 — Multiple categories

Reason:

A product may belong to several SME-defined groups.

## Decision 11 — Reusable locations

Reason:

Consistent shelf/location data.

## Decision 12 — Atomic staff names

Reason:

Structured person data and normalization.

---

# 94. Root-first implementation order

The project should follow this order:

    Problem
       |
       v
    Business Rules
       |
       v
    Actors / Roles / Use Cases
       |
       v
    Domain Model
       |
       v
    Business Events
       |
       v
    ERD / Relational Schema
       |
       v
    Constraints / Indexes
       |
       v
    Security / RLS
       |
       v
    DFD
       |
       v
    UI Workflows
       |
       v
    Operational Analytics
       |
       v
    BI Facts / Dimensions
       |
       v
    Testing
       |
       v
    Deployment

This is preferred over building pages first and deciding business rules later.

---

# 95. Why ERD comes before detailed DFD refinement

The conceptual business model and operational data need to be understood before detailed data movement can be specified accurately.

The detailed sequence is:

Business problem and rules
-> conceptual domain model
-> operational ERD
-> transaction definitions
-> DFD refinement

The DFD remains important. It should explain how stable business information flows rather than inventing data entities.

---

# 96. Why BI comes after operational design

A transaction model answers:

> What happened?

A fact table answers:

> How should that event be measured analytically?

Therefore the analytical grain should be derived from the operational event.

Do not make the analytical model determine the operational truth.

---

# 97. UX principles

The application should favor:

- obvious labels;
- plain-language helper notes;
- minimal ambiguity;
- mobile-friendly forms;
- deliberate selections;
- no unexplained zeros;
- no invisible assumptions;
- clear role restrictions;
- helpful confirmation/error messages.

Examples:

Bad:

    Record movement

with no explanation.

Better:

    Record stock movement

    This records what happened to the item's stock, updates the quantity,
    and keeps an audit trail showing who recorded the event.

Likewise:

    Cost (Owner only)

    Leave blank when cost is unknown; margin remains unavailable.

---

# 98. Current artifact inventory

Known project artifacts created during the design/implementation process include:

- SME_MIS_Project_Knowledge_Base.md
- SME_MIS_Project_Knowledge_Base_v2.md
- SME_MIS_Root_Design_v1.md
- SME_MIS_Logical_ERD_v1.md
- SME_MIS_Logical_ERD_v1.png
- SME_MIS_Logical_ERD_v1.svg
- SME_MIS_Relational_Schema_v2.md
- SME_MIS_Relational_Schema_v3.md
- SME_MIS_RLS_Auth_Design_v1.md
- SME_MIS_DFD_Design_v2.md
- SME_MIS_DFD_Level1_Clean.png
- SME_MIS_DFD_Level1_Clean.svg
- SME_MIS_Data_Dictionary_v2.md
- SME_MIS_Data_Dictionary_v3.md
- SME_MIS_Supabase_Implementation_Spec_v1.md
- SME_MIS_Analytics_BI_Blueprint_v1.md
- SME_MIS_Design_Status_v1.md
- SME_MIS_Final_Design_Review_v1.md
- SME_MIS_ERD_Final.png
- SME_MIS_Context_Diagram_Final.png
- SME_MIS_DFD_Level1_Final_Clean.png
- SME_MIS_Postgres_Migration_Draft_v1.sql
- SME_MIS_Postgres_Migration_v2.sql
- SME_MIS_Transaction_Function_Contracts_v1.md
- SME_MIS_DB_Test_Cases_v1.md
- SME_MIS_Design_Package_v1.zip
- SME_MIS_SCHEMA_FIRST_README_v1.md
- SME_MIS_Schema_First_Package_v1.zip

---

# 99. Important source hierarchy

When there is a conflict, use this hierarchy.

## Highest: actual current implementation

- live Supabase schema;
- live Supabase functions;
- live Supabase views;
- live RLS;
- current GitHub code;
- successful CI;
- confirmed Vercel deployment.

## Next: approved redesign documents

- SME_MIS_Project_Knowledge_Base_v2.md;
- SME_MIS_Root_Design_v1.md;
- SME_MIS_Relational_Schema_v2.md;
- SME_MIS_Relational_Schema_v3.md;
- SME_MIS_RLS_Auth_Design_v1.md;
- SME_MIS_DFD_Design_v2.md;
- SME_MIS_Analytics_BI_Blueprint_v1.md;
- SME_MIS_Final_Design_Review_v1.md;
- SME_MIS_Transaction_Function_Contracts_v1.md;
- SME_MIS_DB_Test_Cases_v1.md.

## Lowest: older source where superseded

- ISPMGT_Full_Document.docx;
- older six-entity design drafts.

Never silently hide a conflict. Record it.

---

# 100. Current status table

| Area | Status |
|---|---|
| Multi-tenant model | Implemented |
| Supabase Auth | Implemented |
| Owner setup | Implemented |
| Individual accounts | Implemented |
| Owner staff management | Implemented / hardened |
| Manager staff management | Intentionally not allowed |
| Staff role | Implemented |
| Product/Item separation | Implemented |
| Product matching | Implemented core |
| Brand optional | Implemented |
| Package units | Implemented |
| Multi-category | Implemented |
| Category creation | Implemented |
| Reusable shelf/location | Implemented |
| Price management | Implemented |
| Price history | Implemented |
| Optional cost | Implemented |
| Cost Owner-only | Implemented |
| Sale snapshots | Implemented |
| Stock movement | Implemented |
| Restock | Implemented |
| Loss/spoilage | Implemented |
| Correction direction | Implemented |
| Archive | Implemented |
| Public comparison | Core implemented |
| Public freshness | Implemented |
| Basic analytics | Implemented |
| Owner profit summary | Implemented |
| Camera barcode scanner | Not complete |
| Camera QR scanner | Not complete |
| Batch entry UX | Not complete |
| Unfinished queue | Not complete |
| Full history UI | Partial |
| Full stock-history UI | Partial |
| Full sell-speed analytics | Partial |
| No-sale analytics UI | Partial |
| Full price-change analytics | Partial |
| Star-schema BI | Future/optional |
| Password recovery | Excluded/future |
| Suppliers | Excluded |
| Payments | Excluded |
| Forecasting | Excluded |
| Automatic price caps | Excluded |

---

# 101. Current live backend status

Confirmed:

- Supabase project is operational.
- Core operational tables exist.
- RLS is enabled.
- Protected transaction functions exist.
- Public price views exist.
- Category/location normalization exists.
- Staff name normalization is live.
- Staff reactivation function is live.
- Invite Edge Function version 3 is active.
- Performance issue found for the new item-category FK was addressed.
- Latest relevant GitHub CI run #173 succeeded.

---

# 102. Current production status

Confirmed production deployment:

    dpl_3TJnfxg2huutgJWBjEowq75SKXfQ

State:

    READY

Target:

    production

Important:

Production still corresponds to the older confirmed commit until the latest verified main changes are explicitly deployed.

Current GitHub main verification:

    run #173
    result = success
    commit = 935633f8617d0f506455625807db131ba11bb6ee

Automatic Vercel Git deployment remains disabled.

---

# 103. Remaining adviser decisions

1. Confirm the public comparison interpretation exactly matches "prevent overpricing / for the people."
2. Confirm Product-vs-Item is accepted as a schema refinement.
3. Confirm whether exactly two Level 2 DFD diagrams must be submitted.
4. Confirm whether public comparison should show range only or also average/median.
5. Confirm whether five participating SMEs remains realistic.
6. Confirm whether Manager should see current cost/margin directly.
7. Confirm whether complete batch-entry UX is mandatory.
8. Confirm whether the unfinished-items queue is mandatory.
9. Confirm whether real QR/camera scanning is mandatory for final demonstration.

---

# 104. Remaining engineering cleanup

## Database

- Reconcile staff-name normalization with Supabase migration history.
- Remove execution-revoked legacy bootstrap function after no caller remains.
- Confirm clean migration replay reproduces current schema.
- Continue advisor/security validation after major schema changes.

## Staff

- Perform full end-to-end invite email test.
- Test revoked-account restoration.
- Verify invitation completion/authenticated access.

## Catalog

- Implement actual barcode scanner.
- Implement actual QR scanner/binding workflow.
- Build proper batch-entry workflow.
- Build unfinished-items queue.
- Finish complete history UI.
- Finish photo capture/storage if required.
- Add stronger catalog search/filtering.

## Stock

- Add dedicated movement-history browsing.
- Add richer stock reporting.

## Analytics

- Sell-speed report.
- No-sale report.
- Price-change frequency report.
- Market-reference dashboard.
- Decide whether star schema is required or optional.

## Deployment

- Explicitly deploy the newest verified main commit when release is intended.
- Confirm production deployment commit.
- Confirm post-deploy runtime errors.
- Keep platform Vercel Authentication behavior documented.

---

# 105. Scope-control rule

Before adding a feature, ask:

1. Does it change the business problem being solved?
2. Does it create a new entity?
3. Does it create a new business event?
4. Does it add a role permission?
5. Does it affect tenant isolation?
6. Does it expose private data publicly?
7. Does it change historical calculations?
8. Does it change fact-table grain?
9. Does it change the DFD Level 1 structure?
10. Does the adviser need to approve it?

If the answer indicates scope expansion, document it as a new requirement/future work item rather than silently implementing it.

---

# 106. Historical correctness rules

Never let today's state rewrite yesterday's event.

Examples:

Monday:

    price = ₱20
    cost = ₱15

Tuesday:

    price = ₱25

Wednesday:

    sale = 10 units

The Wednesday sale must retain the applicable sale-time snapshots.

Later changing the item's current price must not change the historical sale.

Later changing the item's cost must not rewrite the historical cost snapshot.

---

# 107. Public privacy rules

The public system must never become a side channel for private information.

Do not expose:

- cost;
- margin;
- stock;
- staff identity;
- location;
- QR;
- price audit details;
- stock history;
- private analytics.

Public views should be purpose-built and deliberately limited.

---

# 108. API/function design rules

For every protected function:

- verify auth;
- resolve current STAFF_ACCOUNT;
- verify active membership;
- verify current SME;
- verify role;
- validate input;
- enforce tenant consistency;
- preserve transaction atomicity;
- restrict anonymous execute;
- return a safe result.

For browser-invoked Edge Functions:

- handle CORS;
- validate authentication;
- return meaningful structured error responses.

---

# 109. Development rule for future sessions

Always inspect current code/schema first.

Do not assume an old document is current.

Do not create duplicate tables/functions because a previous draft shows a similar object.

Do not overwrite live behavior simply to make an old design document match.

Instead:

1. inspect live state;
2. identify the intended current design;
3. record the difference;
4. decide whether to change code or documentation;
5. update this knowledge base.

---

# 110. Future-session operating procedure

A new session should:

1. Read this file first.
2. Read the current source-of-truth knowledge base if needed.
3. Inspect live Supabase state before schema changes.
4. Inspect GitHub main before code changes.
5. Check role permissions before UI changes.
6. Check public/private boundaries before exposing fields.
7. Check whether the change creates a historical event.
8. Check analytics grain.
9. Run tests/CI.
10. Verify Vercel separately from GitHub CI.
11. Update this file after material architecture/state changes.

---

# 111. Important project principles to preserve

- Product and Item are different.
- Brand is optional.
- Size unit is selectable.
- Categories can be multiple.
- Locations are reusable.
- Names are atomic.
- Cost is optional.
- Cost editing is Owner-only.
- Staff management is Owner-only.
- Manager does not manage staff.
- Staff is restricted to sale deductions.
- Stock movements are events.
- Corrections require direction.
- Stock cannot become negative.
- Sales store historical price/cost snapshots.
- Archive instead of destructive delete.
- Public price comparison is transparency.
- There is no automatic price cap.
- Public users cannot see private cost/margin/stock/staff data.
- price_updated_at is specifically price freshness.
- Analytics derives from operational truth.
- BI comes after stable transactions and grain.
- DFD Level 1 remains six processes.
- Public lookup does not become a marketplace.
- UI is not the security boundary.
- No fake unfinished features.
- Do not store secrets in this file.
- Successful GitHub CI does not automatically mean Vercel production is updated.

---

# 112. Final design principle

The project should be designed from the business event outward:

    Problem
      ->
    Business rule
      ->
    Actor / role
      ->
    Domain entity
      ->
    Transaction / event
      ->
    Database constraint
      ->
    Security
      ->
    DFD
      ->
    UI
      ->
    Operational analytics
      ->
    BI
      ->
    Testing
      ->
    Deployment

The operational database preserves reality.

The DFD explains information movement.

The UI makes business workflows understandable.

Analytics explains what management can learn from operational history.

BI provides later analytical structure.

The public layer provides transparency while respecting private business data.

---

# 113. Maintenance rule

Update this knowledge base whenever any of the following changes:

- business requirement;
- role;
- permission;
- entity/table;
- field;
- relationship;
- constraint;
- transaction;
- audit rule;
- public exposure;
- analytic formula;
- route;
- authentication flow;
- Edge Function;
- migration;
- RLS;
- deployment strategy;
- project scope;
- adviser decision;
- known bug;
- known limitation.

This file is intended to remain the project's durable memory.

# END OF SME MIS COMPLETE KNOWLEDGE BASE
