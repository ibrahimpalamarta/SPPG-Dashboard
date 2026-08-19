-- SCRUM-13 AC3: "enforced at data layer, not UI".
--
-- Until now the two public views limited which *columns* existed, but the API
-- read them over the same connection that can read menu_costs. This migration
-- adds the missing half: a login role that is only able to see the public
-- surface, which /api/public/* connects as (see src/db.ts `publicDb`).
--
-- Why the views need no base-table grants: a Postgres view runs with the
-- privileges of its owner unless it is declared `security_invoker`. These two
-- are not, so `sppg_public` reads them without being able to touch
-- menu_plans, daily_kitchens or menu_costs underneath.
--
-- Deliberately NOT granted, and therefore unreachable on this connection:
--   menu_costs, recipe_costings, menu_plans, daily_kitchens, akg_compliances,
--   menu_nutritions, upload_batches, kitchens, ingredients, akg_targets,
--   users, audit_logs
-- That covers every category SCRUM-13 AC2 names: cost, exact beneficiary
-- counts, and PII.

-- Created without LOGIN: a password does not belong in a committed migration.
-- scripts/grant-public-role.ts sets it from the environment and flips LOGIN on.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'sppg_public') THEN
    CREATE ROLE sppg_public NOLOGIN;
  END IF;
END
$$;

-- Start from nothing, then add back exactly the public surface. The REVOKEs are
-- belt-and-braces — a fresh role holds no table privileges — but they also make
-- re-running this migration against an already-granted role idempotent.
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM sppg_public;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM sppg_public;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM sppg_public;

GRANT USAGE ON SCHEMA public TO sppg_public;

GRANT SELECT ON
  public_menu_nutrition_view,
  public_kitchen_coverage_view,
  public_summaries,
  cms_announcements,
  cms_documents,
  gallery_images
TO sppg_public;

-- No ALTER DEFAULT PRIVILEGES on purpose: a table added by a later migration
-- must stay unreadable here until someone grants it deliberately. Deny by
-- default is the property worth keeping.

COMMENT ON ROLE sppg_public IS
  'SCRUM-13: read-only role for /api/public/*. SELECT on the two public views, public_summaries and the three CMS tables only. Never grant it anything holding cost, exact beneficiary counts or PII.';
