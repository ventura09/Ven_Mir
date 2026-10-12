# API - ven-mir

Base URL local: `http://127.0.0.1:3000`

| Metodo | Ruta | Descripcion | Codigos |
|---|---|---|---|
| GET | `/health` | Estado del servicio y recursos montados | 200 |
| GET | `/api/tasks` | Lista tasks | 200 |
| POST | `/api/tasks` | Crea un elemento de tasks | 201, 400 |
| GET | `/api/tasks/:id` | Obtiene un elemento de tasks | 200, 404 |
| DELETE | `/api/tasks/:id` | Elimina un elemento de tasks | 204, 404 |
| GET | `/api/users` | Lista users | 200 |
| POST | `/api/users` | Crea un elemento de users | 201, 400 |
| GET | `/api/users/:id` | Obtiene un elemento de users | 200, 404 |
| DELETE | `/api/users/:id` | Elimina un elemento de users | 204, 404 |

## Formato de error

```json
{ "error": "descripcion del problema" }
```

## Formato de recurso

```json
{
  "id": "uuid",
  "name": "texto",
  "createdAt": "ISO-8601"
}
```

_Documento generado automaticamente por el subagente doc-writer._
