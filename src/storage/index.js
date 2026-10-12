'use strict';
// Capa de almacenamiento. Generado por el sistema multi-agente.
//
// El driver se elige por configuracion, no por codigo: la misma aplicacion
// funciona en memoria (pruebas rapidas), sobre SQLite en disco o contra
// PostgreSQL por red. Anadir un driver nuevo no obliga a tocar los recursos.
//
//   STORAGE_DRIVER = sqlite | memory | postgres   (por defecto: sqlite)
//   DATABASE_FILE  = ruta del archivo             (sqlite; por defecto ./data/app.db)
//   DATABASE_URL   = cadena de conexion           (postgres)
const path = require('node:path');

const memory = require('./drivers/memory.js');
const sqlite = require('./drivers/sqlite.js');
const postgres = require('./drivers/postgres.js');

const DRIVERS = { memory, sqlite, postgres };

const DEFAULT_DRIVER = 'sqlite';
const DEFAULT_FILE = path.join(process.cwd(), 'data', 'app.db');

function resolveConfig(overrides = {}) {
  const driver = overrides.driver || process.env.STORAGE_DRIVER || DEFAULT_DRIVER;

  // PostgreSQL se identifica con una cadena de conexion, no con un archivo.
  const file = driver === 'postgres'
    ? (overrides.file || process.env.DATABASE_URL || '')
    : (overrides.file || process.env.DATABASE_FILE || DEFAULT_FILE);

  return { driver, file, table: overrides.table };
}

/**
 * Crea un almacen para una tabla. Todos sus metodos devuelven promesas.
 * @param {{table: string, driver?: string, file?: string}} overrides
 */
function createStore(overrides = {}) {
  const config = resolveConfig(overrides);

  if (!config.table) {
    throw new Error('createStore requiere el nombre de la tabla (table)');
  }

  const driver = DRIVERS[config.driver];
  if (!driver) {
    throw new Error(
      `Driver de almacenamiento desconocido: "${config.driver}". `
      + `Disponibles: ${Object.keys(DRIVERS).join(', ')}`,
    );
  }

  return driver.create(config);
}

module.exports = { createStore, DRIVERS, resolveConfig };
