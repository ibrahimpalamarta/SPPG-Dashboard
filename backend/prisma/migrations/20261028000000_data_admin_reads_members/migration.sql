-- PRD §3 / AC-MEM-01: Data Operasional sees the member list but cannot invite or change anyone.
INSERT INTO "role_permissions" ("role", "permission") VALUES ('DATA_ADMIN', 'users:read')
ON CONFLICT DO NOTHING;
