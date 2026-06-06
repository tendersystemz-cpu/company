# SUPABASE APPLY GUIDE — TENDER READINESS SYSTEM

Last updated: 2026-06-03

## 1. Purpose

This guide explains how to apply the initial Supabase schema for the Tender Readiness System.

The migration file is:

```txt
supabase/migrations/001_initial_schema.sql
```

## 2. What This Migration Creates

The first migration creates the minimum useful database foundation:

1. `companies`
2. `evidence_register`
3. `company_licenses`
4. `financial_documents`
5. `compliance_reviews`
6. `preq_reviews`
7. `audit_logs`
8. `company_readiness_overview` view
9. helper functions and triggers
10. auto company code generation using `TRC-000001` format

## 3. Company Code Rule

If no company code is supplied, the database automatically generates:

```txt
TRC-000001
TRC-000002
TRC-000003
```

The company code is intended to become the stable internal reference across all modules.

## 4. Safe Manual Apply Method

Use this method during early development.

1. Open Supabase project.
2. Go to **SQL Editor**.
3. Open the file:

```txt
supabase/migrations/001_initial_schema.sql
```

4. Copy all SQL.
5. Paste into Supabase SQL Editor.
6. Run the SQL.
7. Confirm that the tables are created.

## 5. Smoke Test SQL

After applying the migration, run this test:

```sql
insert into public.companies (
  company_name,
  registration_no,
  contact_person,
  source_system
) values (
  'TEST COMPANY SDN BHD',
  '202601010001',
  'System Test',
  'MANUAL_TEST'
)
returning id, company_code, company_name;
```

Expected result:

```txt
company_code should be generated automatically, example: TRC-000001
```

Then test evidence registration:

```sql
insert into public.evidence_register (
  company_id,
  company_code,
  document_type,
  document_title,
  file_url,
  verification_status
)
select
  id,
  company_code,
  'SSM_PROFILE',
  'Test SSM Profile',
  'https://drive.google.com/test-file',
  'LINKED'
from public.companies
where company_name = 'TEST COMPANY SDN BHD'
returning id, company_code, document_type, verification_status;
```

Then test dashboard view:

```sql
select *
from public.company_readiness_overview
where company_name = 'TEST COMPANY SDN BHD';
```

## 6. Cleanup Test Data

After smoke test, remove test data:

```sql
delete from public.companies
where company_name = 'TEST COMPANY SDN BHD';
```

Evidence records will be removed automatically because `evidence_register.company_id` uses `on delete cascade`.

## 7. Important Security Note

RLS is not enabled in the first migration.

Reason: user roles, tenant model, reviewer permissions, and company access scope must be designed before enabling RLS.

A later migration should define:

1. admin users,
2. reviewer users,
3. company/group access scope,
4. read/write policies,
5. audit logging policy.

## 8. Next Recommended Migration

Next migration should be:

```txt
supabase/migrations/002_company_profile_modules.sql
```

It should add:

1. company_directors,
2. company_shareholders,
3. project_experience,
4. manpower_equipment,
5. tender_checklists.

Do not add these until the first sync/input workflow is proven.
