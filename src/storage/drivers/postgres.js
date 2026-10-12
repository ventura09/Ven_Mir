'use strict';
// Driver de almacenamiento POSTGRESQL. Generado por el sistema multi-agente.
//
// Este es el unico driver que necesita un paquete externo, porque hablar el
// protocolo de PostgreSQL no es algo que Node traiga de serie:
//
//     npm install pg
//
// El paquete se carga de forma perezosa: si no se usa PostgreSQL, no hace falta
// tenerlo instalado y la aplicacion arranca igual.
const SAFE_IDENTIFIER = /^[a-z][a-z0-9_]{0,62}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function loadPg() {
  try {
    return require('pg');
  } catch (cause) {
    const err = new Error(
      "El driver postgres necesita el paquete 'pg'. Instalalo con:  npm install pg",
    );
    err.cause = cause;
    throw err;
  }
}

/** Oculta la contrasena antes de registrar una cadena de conexion. */
function maskConnectionString(value) {
  return String(value).replace(/(:\/\/[^:/@]+:)[^@]*(@)/, '$1***$2');
}

function create({ table, file }) {
  if (!SAFE_IDENTIFIER.test(String(table))) {
    throw new Error(`Nombre de tabla no valido: "${table}". Solo se permite [a-z][a-z0-9_]*`);
  }

  const { Pool } = loadPg();

  if (!file) {
    throw new Error(
      'El driver postgres requiere una cadena de conexion: define DATABASE_URL '
      + '(por ejemplo postgres://usuario:clave@127.0.0.1:5432/midb)',
    );
  }

  const pool = new Pool({ connectionString: file });

  // created_at se devuelve como cadena ISO para que el contrato sea identico al
  // del driver sqlite: dos motores distintos no deben cambiar el JSON de la API.
  const columns = `id, name, to_char(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS "createdAt"`;

  let schemaReady = null;
  function ensureSchema() {
    if (!schemaReady) {
      schemaReady = pool.query(`CREATE TABLE IF NOT EXISTS ${table} (
        id         UUID PRIMARY KEY,
        name       TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )`);
    }
    return schemaReady;
  }

  return {
    driver: 'postgres',
    location: maskConnectionString(file),
    table,

    async list() {
      await ensureSchema();
      const result = await pool.query(`SELECT ${columns} FROM ${table} ORDER BY created_at DESC`);
      return result.rows;
    },

    async get(id) {
      // Un id que no es un UUID no puede existir en una columna UUID. Sin esta
      // comprobacion PostgreSQL lanzaria un error de sintaxis y la API
      // responderia 500 en lugar del 404 que corresponde.
      if (!UUID.test(String(id))) return null;
      await ensureSchema();
      const result = await pool.query(`SELECT ${columns} FROM ${table} WHERE id = $1`, [id]);
      return result.rows[0] || null;
    },

    async create(item) {
      await ensureSchema();
      await pool.query(
        `INSERT INTO ${table} (id, name, created_at) VALUES ($1, $2, $3)`,
        [item.id, item.name, item.createdAt],
      );
      return item;
    },

    async remove(id) {
      if (!UUID.test(String(id))) return false;
      await ensureSchema();
      const result = await pool.query(`DELETE FROM ${table} WHERE id = $1`, [id]);
      return result.rowCount > 0;
    },

    async reset() {
      await ensureSchema();
      await pool.query(`DELETE FROM ${table}`);
    },

    async count() {
      await ensureSchema();
      const result = await pool.query(`SELECT COUNT(*)::int AS total FROM ${table}`);
      return result.rows[0].total;
    },

    async close() {
      await pool.end();
    },

    // Pool crudo, para consultas que no encajan en la interfaz comun.
    raw() {
      return pool;
    },
  };
}

module.exports = { create, SAFE_IDENTIFIER, maskConnectionString };
