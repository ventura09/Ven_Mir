# Especificacion de UI - ven-mir

Generada por el agente `ui-designer` a partir del pedido original.

## Pedido original

> API REST de tareas y usuarios

## Pantallas propuestas

### Listado de users

- Origen de datos: `GET /api/users`
- Accion principal: crear un elemento nuevo.
- Acciones por fila: eliminar con confirmacion.

### Detalle / edicion de users

- Origen de datos: `GET /api/users/:id`
- Validacion en cliente espejo de la del servidor (name obligatorio).
- Al guardar con exito, volver al listado y refrescar.

## Estados que toda pantalla debe cubrir

| Estado | Comportamiento esperado |
|---|---|
| Cargando | Indicador visible; sin salto de layout |
| Vacio | Mensaje explicito + accion principal |
| Error | Mensaje comprensible + reintento |
| Con datos | Listado/tabla paginada |

## Reglas de accesibilidad minimas

- Todo control interactivo es alcanzable por teclado.
- Contraste minimo 4.5:1 en texto normal.
- Errores de formulario asociados al campo con `aria-describedby`.

_Nota: este agente produce especificacion, no maquetas renderizadas._
