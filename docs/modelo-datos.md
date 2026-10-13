# Modelo de datos (Supabase / PostgreSQL)

Nombres de tablas y columnas en español, sin tildes, en minúsculas y con guion bajo.
El dinero se guarda en **céntimos (integer)**. Las fechas, con `timestamptz`. Los IDs, con `uuid`.

## Mapa

```
perfiles ─┬─ (rol=marca) ─► marcas ─► productos ─► escalas_precio
          │                              ▲
          │                              │
          ├─ (rol=comprador) ─► pedidos ─► subpedidos (uno por marca) ─► items
          │                                                               (cada ítem apunta a un producto)
          └─ (rol=comprador) ─► favoritos ─► productos

config_cotizador (1 fila, la edita el admin)
```

## Tablas

### perfiles
Extiende `auth.users` de Supabase (mismo `id`).
| Columna | Tipo | Nota |
|---|---|---|
| id | uuid PK | = auth.users.id |
| rol | text | `comprador` · `marca` · `admin` |
| nombre | text | |
| empresa | text | |
| tipo_negocio | text | `catering` · `organizador_eventos` · `wedding_planner` · `bar_restaurante` · `otro` (solo compradores) |
| whatsapp | text | |
| ruc | text | opcional, 11 dígitos |
| marca_id | uuid FK → marcas | solo si rol = marca (una cuenta por marca) |
| creado_en | timestamptz | |

### marcas
| Columna | Tipo | Nota |
|---|---|---|
| id | uuid PK | |
| nombre_comercial | text | |
| razon_social | text | |
| ruc | text | 11 dígitos |
| contacto_nombre / contacto_whatsapp / contacto_correo | text | solo lo ve el admin |
| direccion_recojo | text | dónde recoge Surtiba |
| pedido_minimo_cajas | integer | ≥ 1 |
| comision_pct | numeric(5,2) | ej. 8.00 |
| activa | boolean | si es false, sus productos no se ven |
| creado_en | timestamptz | |

### productos
| Columna | Tipo | Nota |
|---|---|---|
| id | uuid PK | |
| marca_id | uuid FK → marcas | |
| nombre | text | |
| categoria | text | `pisco` · `ron` · `gin` · `vodka` · `vino` · `licor` · `coctel_listo` · `otro` |
| ml | integer | por botella |
| grado | numeric(4,1) | % de alcohol |
| unidades_por_caja | integer | |
| registro_sanitario | text | |
| foto_url | text | ruta en Supabase Storage |
| stock_cajas | integer | ≥ 0. Lo actualiza la marca; baja al enviar un pedido |
| activo | boolean | |

### escalas_precio
| Columna | Tipo | Nota |
|---|---|---|
| id | uuid PK | |
| producto_id | uuid FK → productos | |
| desde_cajas | integer | el primer tramo es 1 |
| hasta_cajas | integer null | null = sin tope |
| precio_caja_centimos | integer | |

Sin sesión, solo se puede leer el **precio "desde"** mediante una vista o función (por ejemplo, `catalogo_publico`) que devuelve el precio del tramo con `desde_cajas = 1`. La tabla completa solo la leen compradores con sesión, la marca dueña y el admin.

### favoritos
| Columna | Tipo | Nota |
|---|---|---|
| comprador_id | uuid FK → perfiles | |
| producto_id | uuid FK → productos | |
| creado_en | timestamptz | |
PK compuesta (comprador_id, producto_id).

### pedidos
| Columna | Tipo | Nota |
|---|---|---|
| id | uuid PK | |
| codigo | text | legible, ej. `SUR-0001` |
| comprador_id | uuid FK → perfiles | |
| estado | text | `recibido` · `en_preparacion` · `en_camino` · `entregado` · `cancelado` |
| evento_nombre / evento_tipo | text | opcional |
| evento_fecha | date | opcional |
| invitados | integer | opcional |
| fecha_entrega_deseada | date | |
| direccion_entrega | text | |
| nota | text | opcional |
| subtotal_centimos | integer | suma de los subpedidos no cancelados |
| envio_centimos | integer | 0 por ahora (decisión pendiente) |
| total_centimos | integer | subtotal + envío |
| pago_estado | text | `pendiente` · `pagado` (lo marca el admin a mano) |
| pago_metodo | text | ej. `transferencia`, `yape` |
| pagado_en | timestamptz | |
| creado_en / entregado_en | timestamptz | |

### subpedidos
| Columna | Tipo | Nota |
|---|---|---|
| id | uuid PK | |
| pedido_id | uuid FK → pedidos | |
| marca_id | uuid FK → marcas | |
| codigo | text | **copia** del código del pedido (`SUR-0001`): la marca no puede leer `pedidos` pero necesita el código |
| estado | text | `pendiente` · `listo_recojo` · `recogido` · `entregado` · `rechazado` · `cancelado` |
| fecha_recojo | date | la pone el admin; la marca la ve |
| total_centimos | integer | |
| total_cajas | integer | |
| comision_pct_aplicada | numeric(5,2) | copia del % al crear |
| exento_comision | boolean | true si es uno de los primeros 3 entregados de la marca |
| comision_centimos | integer | se calcula al entregar; 0 si está exento |
| motivo_rechazo | text | obligatorio si se rechaza |
| listo_en / recogido_en / entregado_en | timestamptz | |
| creado_en | timestamptz | |

Restricción: un solo subpedido por (pedido_id, marca_id).

### items
| Columna | Tipo | Nota |
|---|---|---|
| id | uuid PK | |
| subpedido_id | uuid FK → subpedidos | |
| producto_id | uuid FK → productos | |
| cajas | integer | ≥ 1 |
| precio_caja_centimos | integer | **copia** del precio aplicado según la escala |
| subtotal_centimos | integer | cajas × precio |

### config_cotizador (se diseña y crea en la fase 6)
Borrador. En la fase 6 se rediseña (parámetros por tipo de evento, recetas, ml) y se agrega la tabla `cotizaciones`. Ver "Ideas para la fase 6" en `producto.md`.
| Columna | Tipo | Nota |
|---|---|---|
| tragos_primera_hora | numeric | por invitado |
| tragos_hora_siguiente | numeric | por invitado y por hora |
| ml_por_trago | integer | |
| actualizado_en | timestamptz | |

## Estados

```
SUBPEDIDO (lo ve la marca)
pendiente ─► listo_recojo ─► recogido ─► entregado
    │             │
    └► rechazado  └► cancelado (admin)

PEDIDO (lo ve el comprador; lo mueve el admin)
recibido ─► en_preparacion ─► en_camino ─► entregado
    └──────────► cancelado
```
- El pedido pasa a `en_preparacion` automáticamente cuando al menos un subpedido está `listo_recojo`.
- Un subpedido `rechazado` cuenta igual que `cancelado`: no suma al total, no bloquea `en_camino` y su stock vuelve.
- El pedido pasa a `en_camino` solo si todos sus subpedidos no cancelados están `recogido`.
- Al pasar el pedido a `entregado`, sus subpedidos pasan a `entregado` y se calcula la comisión.

## Quién puede ver qué (RLS)

| Dato | visitante | comprador | marca | admin |
|---|---|---|---|---|
| marcas (nombre comercial) | sí, las activas | sí, las activas | la suya | todo |
| contacto y dirección de marcas | no | no | la suya | todo |
| productos | activos | activos | los suyos (editar) | todo |
| escalas_precio | solo precio "desde" | todas las activas | las suyas (editar) | todo |
| stock | no | disponible | el suyo (editar) | todo |
| perfiles | no | el suyo | el suyo | todo |
| pedidos | no | los suyos | **no** | todo |
| subpedidos e items | no | los de sus pedidos | solo los de su marca | todo |
| favoritos | no | los suyos | no | no hace falta |
| config_cotizador (fase 6) | no | leer | no | editar |

La marca **no puede leer la tabla `pedidos`** (ahí están la dirección y los datos del evento). Todo lo que necesita está en su subpedido.

### Cómo está implementado (fase 1, ver `supabase/sql/`)
- **Vistas públicas** (las usa el visitante; también sirven al comprador):
  - `catalogo_publico`: productos activos de marcas activas con el precio del primer tramo. Sin stock ni escala completa.
  - `marcas_publicas`: id, nombre comercial y pedido mínimo de las marcas activas. Sin contacto ni dirección.
  - Son de solo lectura. Supabase las marca como "Security Definer View": es intencional.
- **Funciones de ayuda** en el esquema `privado` (no se exponen en la API): `mi_rol()`, `es_admin()`, `mi_marca_id()`, `marca_activa()`.
- **Perfil automático**: al crear un usuario, un trigger le crea un perfil con rol `comprador`. Los roles `marca` y `admin` solo se asignan desde el servidor.
- Cada usuario puede editar solo `nombre`, `empresa`, `tipo_negocio`, `whatsapp` y `ruc` de su perfil; nunca su `rol` ni su `marca_id`.
- Sin insert directo en `pedidos`, `subpedidos` ni `items`: se crearán con funciones del servidor (fases 3–5).
- Los productos no se borran; se desactivan (`activo = false`).

## Lógica en el servidor
**Crear un pedido** es una sola transacción (función de PostgreSQL o ruta del servidor):
1. Se recibe solo `[{producto_id, cajas}]` y los datos de entrega.
2. Se bloquean las filas de esos productos (`SELECT … FOR UPDATE`) y se revisa el stock.
3. Se calculan los precios según la escala, se agrupa por marca y se valida el pedido mínimo.
4. Se crean `pedidos`, `subpedidos` e `items`, y se descuenta `stock_cajas`.
5. Si algo falla, no se guarda nada.

**Entregar un pedido:** se calcula la comisión de cada subpedido, con exención si la marca tiene menos de 3 subpedidos entregados antes.

## Métrica principal
**Cajas vendidas del mes** = suma de `total_cajas` de los subpedidos `entregado` cuyo `entregado_en` cae en el mes.
