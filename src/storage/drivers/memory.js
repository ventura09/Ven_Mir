'use strict';
// Driver de almacenamiento EN MEMORIA. Generado por el sistema multi-agente.
//
// Util para pruebas unitarias y para desarrollo rapido. Los datos NO sobreviven
// al reinicio del proceso: si necesitas persistencia, usa el driver sqlite.
function create({ table }) {
  let rows = [];

  return {
    driver: 'memory',
    location: ':memory:',
    table,

    list() {
      return rows.slice().sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
    },

    get(id) {
      return rows.find((row) => row.id === id) || null;
    },

    create(item) {
      rows.push(item);
      return item;
    },

    remove(id) {
      const index = rows.findIndex((row) => row.id === id);
      if (index < 0) return false;
      rows.splice(index, 1);
      return true;
    },

    reset() {
      rows = [];
    },

    close() {
      // No hay recursos que liberar.
    },
  };
}

module.exports = { create };
