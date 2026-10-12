/**
 * Interfaz de ven-mir. Generado por el sistema multi-agente.
 *
 * Reglas que sigue este archivo:
 *  - Nunca usa innerHTML con datos del usuario: todo el texto entra por
 *    textContent. Es la diferencia entre una lista y una inyeccion de codigo.
 *  - Cubre los cuatro estados: cargando, vacio, error y con datos.
 *  - No usa console.log: los errores se muestran en la interfaz.
 */
import { createApiClient } from './api-client.mjs';

const api = createApiClient('');

const elements = {
  form: document.querySelector('#create-form'),
  input: document.querySelector('#item-name'),
  select: document.querySelector('#resource-select'),
  list: document.querySelector('#item-list'),
  status: document.querySelector('#status'),
  empty: document.querySelector('#empty-state'),
  refresh: document.querySelector('#refresh'),
  submit: document.querySelector('#submit'),
};

const state = {
  resource: elements.select.value,
  items: [],
  busy: false,
};

function setStatus(message, kind) {
  elements.status.textContent = message;
  elements.status.dataset.kind = kind;
}

function render() {
  elements.list.replaceChildren();
  elements.empty.hidden = state.items.length > 0;

  for (const item of state.items) {
    const row = document.createElement('li');
    row.className = 'item';

    const name = document.createElement('span');
    name.className = 'item-name';
    name.textContent = item.name; // textContent, nunca innerHTML
    row.append(name);

    const date = document.createElement('time');
    date.className = 'item-date';
    date.dateTime = item.createdAt;
    date.textContent = new Date(item.createdAt).toLocaleString('es-ES');
    row.append(date);

    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'danger';
    remove.textContent = 'Eliminar';
    remove.addEventListener('click', () => {
      void removeItem(item.id);
    });
    row.append(remove);

    elements.list.append(row);
  }
}

function setBusy(busy) {
  state.busy = busy;
  elements.submit.disabled = busy;
  elements.refresh.disabled = busy;
}

async function load() {
  setBusy(true);
  setStatus('Cargando...', 'info');
  try {
    state.items = await api.list(state.resource);
    setStatus(`${state.items.length} elemento(s) en ${state.resource}`, 'ok');
  } catch (error) {
    state.items = [];
    setStatus(`No se pudo cargar: ${error.message}`, 'error');
  } finally {
    setBusy(false);
    render();
  }
}

async function createItem(name) {
  setBusy(true);
  try {
    await api.create(state.resource, name);
    elements.form.reset();
    state.items = await api.list(state.resource);
    // El recuento va en el mensaje: si desapareciera, el estado dejaria de
    // reflejar cuantos elementos hay y la interfaz se volveria inconsistente.
    setStatus(`Creado. ${state.items.length} elemento(s) en ${state.resource}`, 'ok');
  } catch (error) {
    setStatus(`No se pudo crear: ${error.message}`, 'error');
  } finally {
    setBusy(false);
    render();
  }
}

async function removeItem(id) {
  setBusy(true);
  try {
    await api.remove(state.resource, id);
    state.items = await api.list(state.resource);
    setStatus(`Eliminado. ${state.items.length} elemento(s) en ${state.resource}`, 'ok');
  } catch (error) {
    setStatus(`No se pudo eliminar: ${error.message}`, 'error');
  } finally {
    setBusy(false);
    render();
  }
}

elements.form.addEventListener('submit', (event) => {
  event.preventDefault();
  const name = elements.input.value.trim();
  if (name === '') {
    setStatus('Escribe un nombre antes de crear', 'error');
    elements.input.focus();
    return;
  }
  void createItem(name);
});

elements.select.addEventListener('change', () => {
  state.resource = elements.select.value;
  void load();
});

elements.refresh.addEventListener('click', () => {
  void load();
});

void load();
