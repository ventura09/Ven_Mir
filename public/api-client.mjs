/**
 * Cliente de la API. Generado por el sistema multi-agente.
 *
 * Es un modulo ES sin ninguna dependencia. Se usa en el navegador
 * (<script type="module">) y ademas se puede importar en Node, que es lo que
 * permite probarlo de verdad contra el servidor.
 */
export function createApiClient(baseUrl = '') {
  async function request(path, options = {}) {
    const response = await fetch(`${baseUrl}${path}`, options);

    if (response.status === 204) return null;

    const text = await response.text();
    let body = null;

    if (text) {
      try {
        body = JSON.parse(text);
      } catch {
        // El servidor respondio algo que no es JSON: es un error en si mismo.
        const err = new Error(`Respuesta no valida del servidor (${response.status})`);
        err.status = response.status;
        throw err;
      }
    }

    if (!response.ok) {
      const message = body && body.error ? body.error : `Error ${response.status}`;
      const err = new Error(message);
      err.status = response.status;
      throw err;
    }

    return body;
  }

  return {
    /** Estado del servicio. */
    async health() {
      return request('/health');
    },

    /** Lista los elementos de un recurso. Devuelve siempre un array. */
    async list(resource) {
      const body = await request(`/api/${resource}`);
      return body && Array.isArray(body.data) ? body.data : [];
    },

    /** Crea un elemento. Lanza si el nombre no es valido. */
    async create(resource, name) {
      return request(`/api/${resource}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
    },

    /** Elimina un elemento. Devuelve true si el servidor lo acepto. */
    async remove(resource, id) {
      await request(`/api/${resource}/${id}`, { method: 'DELETE' });
      return true;
    },
  };
}
