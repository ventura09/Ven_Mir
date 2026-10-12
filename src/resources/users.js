'use strict';
// Recurso "users" (Cuentas de usuario y autenticacion). Generado por el sistema multi-agente.
//
// Aqui vive la validacion y las reglas del recurso. La persistencia se delega
// en src/storage, de modo que cambiar de motor no obliga a tocar este archivo.
//
// La interfaz es ASINCRONA a proposito: node:sqlite responde al instante y
// PostgreSQL habla por red. Si la capa fuese sincrona, no se podria cambiar de
// motor sin reescribir todo el servicio.
const { randomUUID } = require('node:crypto');
const { createStore } = require('../storage/index.js');

const store = createStore({ table: 'users' });

async function list() {
  return store.list();
}

async function get(id) {
  return store.get(id);
}

async function create(input) {
  if (!input || typeof input.name !== 'string' || input.name.trim() === '') {
    const err = new Error('name is required');
    err.status = 400;
    throw err;
  }

  return store.create({
    id: randomUUID(),
    name: input.name.trim(),
    createdAt: new Date().toISOString(),
  });
}

async function remove(id) {
  return store.remove(id);
}

async function reset() {
  return store.reset();
}

async function close() {
  return store.close();
}

/** Describe el almacenamiento activo. Util para diagnostico y para las pruebas. */
function storage() {
  return { driver: store.driver, location: store.location, table: store.table };
}

module.exports = {
  name: 'users',
  list,
  get,
  create,
  remove,
  reset,
  close,
  storage,
};
