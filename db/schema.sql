-- Esquema generado para la feature "Cuentas de usuario y autenticacion"
-- Motor asumido: PostgreSQL. El almacen del servicio es en memoria;
-- este esquema es la propuesta de persistencia real.
-- Idempotente: se puede reejecutar sin errores.

CREATE TABLE IF NOT EXISTS users (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        VARCHAR(255) NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_users_name ON users (name);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users (created_at DESC);
