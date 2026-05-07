-- ============================================================
-- AI Agent Builder — Schema de producción
-- Ejecutar en el SQL Editor de Neon / Supabase / psql
-- ============================================================

-- 1. Enum para el rol de usuario
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('admin', 'user');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 2. Tabla users
CREATE TABLE IF NOT EXISTS users (
  id           SERIAL PRIMARY KEY,
  email        VARCHAR(255) NOT NULL UNIQUE,
  password     VARCHAR(255) NOT NULL,
  role         user_role    NOT NULL DEFAULT 'admin',
  "createdAt"  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  "updatedAt"  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- 3. Tabla agents
CREATE TABLE IF NOT EXISTS agents (
  id                    SERIAL PRIMARY KEY,
  name                  VARCHAR(255) NOT NULL,
  description           TEXT,
  instructions          TEXT,
  "openaiVectorStoreId" VARCHAR(255),
  "userId"              INTEGER      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  "createdAt"           TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  "updatedAt"           TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- 4. Tabla documents
CREATE TABLE IF NOT EXISTS documents (
  id             SERIAL PRIMARY KEY,
  "agentId"      INTEGER      NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  "fileName"     VARCHAR(255) NOT NULL,
  "fileType"     VARCHAR(255),
  "openaiFileId" VARCHAR(255) NOT NULL,
  "createdAt"    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
  -- sin updatedAt (updatedAt: false en el modelo)
);

-- 5. Tabla conversations
CREATE TABLE IF NOT EXISTS conversations (
  id          SERIAL PRIMARY KEY,
  "agentId"   INTEGER     NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  "userId"    INTEGER     REFERENCES users(id) ON DELETE SET NULL,
  messages    JSONB       NOT NULL DEFAULT '[]',
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
