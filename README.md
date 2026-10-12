# ven-mir

Cubre: API REST de tareas y usuarios

Generado por el **sistema multi-agente** (8 agentes + 6 subagentes).

## Requisitos

- Node.js >= 20 (probado en v24)

## Arranque

```bash
npm start
# -> http://127.0.0.1:3000/health
```

## Pruebas

```bash
npm test
```

Son pruebas reales con `node:test`: levantan el servidor en un puerto efimero y
hacen peticiones HTTP. No hay dobles de prueba ni resultados simulados.

## Recursos disponibles

- `tasks` — Gestion de tareas
- `users` — Cuentas de usuario y autenticacion

## Estructura

```
.
├── server.js              # router HTTP + estaticos, sin dependencias
├── public/                # panel web: sin framework y sin build
│   ├── index.html
│   ├── app.mjs            # interfaz (modulo ES nativo)
│   ├── api-client.mjs     # capa de datos, probable en Node
│   └── styles.css
├── src/resources/         # un modulo CRUD por recurso
├── src/storage/           # capa de almacenamiento enchufable y asincrona
│   ├── index.js           # elige el driver por configuracion
│   └── drivers/
│       ├── sqlite.js      # persistencia real en archivo (node:sqlite)
│       ├── postgres.js    # PostgreSQL (requiere: npm install pg)
│       └── memory.js      # en memoria, para pruebas
├── tests/                 # pruebas node:test (API, persistencia y panel)
├── db/schema.sql          # esquema propuesto (PostgreSQL)
├── docs/API.md            # contrato de la API
├── docs/UI.md             # especificacion de interfaz
├── Dockerfile
└── .github/workflows/ci.yml
```

## Panel web

En `http://127.0.0.1:3000/` hay un panel que lista, crea y elimina elementos
contra la misma API. Se sirve desde el mismo proceso: no hay un servidor aparte
ni un paso de compilacion.

**Sin framework a proposito** (HTML + CSS + modulos ES nativos). Un build de
React anadiria `node_modules` y un paso de compilacion que no se puede verificar
sin un navegador. Este panel se verifica por su contrato: que se sirve con el
tipo correcto, que el salto de directorio esta bloqueado y que su capa de datos
funciona contra el servidor real.

**Lo que las pruebas NO cubren:** el renderizado visual. `tests/ui.test.js`
comprueba el contrato HTTP y la logica de datos, no que el navegador pinte bien.
Para eso hace falta un navegador.

### Seguridad de la interfaz

- Todo el texto entra por `textContent`, nunca por `innerHTML`. El auditor de
  seguridad **falla la etapa** si aparece una asignacion a `innerHTML` con
  contenido.
- El servidor de estaticos descodifica la ruta y comprueba que el resultado sigue
  dentro de `public/`: un `../` codificado devuelve `403`.

## Almacenamiento

Por defecto la aplicacion **persiste en SQLite** usando el modulo `node:sqlite`
incorporado en Node: sin dependencias externas y con los datos en disco.

```bash
npm start                                    # SQLite en ./data/app.db
STORAGE_DRIVER=memory npm start              # sin persistencia, para pruebas
STORAGE_DRIVER=postgres DATABASE_URL=... npm start
```

| Variable | Por defecto | Valores |
|---|---|---|
| `STORAGE_DRIVER` | `sqlite` | `sqlite`, `memory`, `postgres` |
| `DATABASE_FILE` | `./data/app.db` | cualquier ruta (sqlite) |
| `DATABASE_URL` | — | `postgres://usuario:clave@host:5432/basedatos` |

### PostgreSQL

Es el unico motor que necesita un paquete externo, porque Node no habla su
protocolo de serie:

```bash
npm install pg
DATABASE_URL=postgres://usuario:clave@127.0.0.1:5432/midb npm start
```

El paquete se carga de forma perezosa: si no usas PostgreSQL, no hace falta
tenerlo instalado.

### Cambiar de motor

La interfaz de almacenamiento es **asincrona** y todos los drivers la respetan,
por eso se pueden intercambiar sin tocar el servicio. La validacion vive en
`src/resources/`; los drivers solo guardan. Anadir un motor nuevo es anadir un
archivo en `src/storage/drivers/` y registrarlo en `src/storage/index.js`.

### Probar contra cada motor

La misma suite de pruebas sirve para los tres:

```bash
npm test                                                     # sqlite
STORAGE_DRIVER=memory npm test                               # memoria
STORAGE_DRIVER=postgres DATABASE_URL=postgres://... npm test  # PostgreSQL
```

## Trazabilidad

- Pedido original: `API REST de tareas y usuarios`
- Generado: `2026-10-12T16:55:55.811Z`

_Las pruebas comprueban que el dato queda realmente en el motor: se lee desde
una conexion independiente y, ademas, con SQL directo contra la base de datos._
