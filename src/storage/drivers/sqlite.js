'use strict';
// Driver de almacenamiento SQLITE. Generado por el sistema multi-agente.
//
// Usa el modulo node:sqlite incorporado en Node (>= 22.5): persistencia real en
// un archivo, sin ninguna dependencia externa.
const fs = require('node:fs');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');

// El nombre de tabla se interpola en SQL (no admite parametros), asi que se
// valida contra una lista blanca estricta. Sin esto, un nombre de tabla vendria
// a ser una inyeccion SQL por configuracion.
const SAFE_IDENTIFIER = /^[a-z][a-z0-9_]{0,62}$/;

function create({ table, file }) {
  if (!SAFE_IDENTIFIER.test(String(table))) {
    throw new Error(`Nombre de tabla no valido: "${table}". Solo se permite [a-z][a-z0-9_]*`);
  }

  const inMemory = !file || file === ':memory:';
  if (!inMemory) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
  }

  const db = new DatabaseSync(inMemory ? ':memory:' : file);

  db.exec(`CREATE TABLE IF NOT EXISTS ${table} (
    id         TEXT PRIMARY KEY,
    name       TEXT NOT NULL,
    created_at TEXT NOT NULL
  )`);

  const columns = 'id, name, created_at AS createdAt';
  const statements = {
    list: db.prepare(`SELECT ${columns} FROM ${table} ORDER BY created_at DESC`),
    get: db.prepare(`SELECT ${columns} FROM ${table} WHERE id = ?`),
    insert: db.prepare(`INSERT INTO ${table} (id, name, created_at) VALUES (?, ?, ?)`),
    remove: db.prepare(`DELETE FROM ${table} WHERE id = ?`),
    reset: db.prepare(`DELETE FROM ${table}`),
    count: db.prepare(`SELECT COUNT(*) AS total FROM ${table}`),
  };

  return {
    driver: 'sqlite',
    location: inMemory ? ':memory:' : file,
    table,

    list() {
      return statements.list.all();
    },

    get(id) {
      return statements.get.get(id) || null;
    },

    create(item) {
      // run() confirma la escritura en el archivo: al volver, el dato esta en disco.
      statements.insert.run(item.id, item.name, item.createdAt);
      return item;
    },

    remove(id) {
      return statements.remove.run(id).changes > 0;
    },

    reset() {
      statements.reset.run();
    },

    count() {
      return statements.count.get().total;
    },

    close() {
      db.close();
    },

    // Conexion cruda, para consultas que no encajan en la interfaz comun.
    raw() {
      return db;
    },
  };
}

module.exports = { create, SAFE_IDENTIFIER };
