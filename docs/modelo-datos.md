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
          ├─ (rol=comprador) ─► favoritos ─► productos
          └─ (rol=comprador) ─► cotizaciones ─► (pedido, si terminó en pedido)

Cotizador (lo edita el admin): parametros_cotizador · tipos_evento ─► tipo_evento_recetas ◄─ recetas ─► receta_ingredientes ◄─ ingredientes
```

## Tablas

### perfiles
Extiende `auth.users` de Supabase (mismo `id`).
| Columna | Tipo | Nota |
|---|---|---|
| id | uuid PK | = auth.users.id |
| rol | text | `comprador` · `marca` · `admin` · `solicitante` (se registró con "Quiero vender" y espera aprobación) |
| nombre | text | |
| empresa | text | |
| tipo_negocio | text | `catering` · `organizador_eventos` · `wedding_planner` · `bar_restaurante` · `otro` (solo compradores) |
| whatsapp | text | |
| ruc | text | opcional, 11 dígitos |
| marca_id | uuid FK → marcas | solo si rol = marca (una cuenta por marca) |
| creado_en | timestamptz | |

### marcas (datos públicos: los ve cualquiera si la marca está activa)
| Columna | Tipo | Nota |
|---|---|---|
| id | uuid PK | |
| nombre_comercial | text | |
| pedido_minimo_cajas | integer | ≥ 1 |
| activa | boolean | si es false, sus productos no se ven |
| creado_en | timestamptz | |

### solicitudes_marca (fase 5)
Solicitudes de "Quiero vender". Las crea el trigger al registrarse; el admin las aprueba (crea la marca con 5 % de comisión y el pedido mínimo que eligió la marca) o las rechaza con motivo. Las ven la propia persona y el admin.
| Columna | Tipo | Nota |
|---|---|---|
| perfil_id | uuid FK → perfiles | quien la envió (rol `solicitante` hasta que la aprueben) |
| nombre_comercial / razon_social / ruc / direccion_recojo | text | datos de la marca |
| contacto_nombre / contacto_whatsapp | text | |
| pedido_minimo_cajas | integer | lo decide la marca |
| estado | text | `pendiente` · `aprobada` · `rechazada` |
| motivo_rechazo | text | |
| marca_id | uuid FK → marcas | la marca creada al aprobar |

### marcas_privado (solo la propia marca y el admin)
Separada de `marcas` para no usar vistas que se salten RLS.
| Columna | Tipo | Nota |
|---|---|---|
| marca_id | uuid PK, FK → marcas | |
| razon_social | text | |
| ruc | text | 11 dígitos |
| contacto_nombre / contacto_whatsapp / contacto_correo | text | |
| direccion_recojo | text | dónde recoge Surtiba |
| comision_pct | numeric(5,2) | ej. 5.00. Se copia al subpedido al crearlo |

### productos
| Columna | Tipo | Nota |
|---|---|---|
| id | uuid PK | |
| marca_id | uuid FK → marcas | |
| nombre | text | |
| categoria | text | `pisco` · `ron` · `gin` · `vodka` · `vino` · `espumante` · `licor` · `coctel_listo` · `otro` |
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

### carrito (fase 3)
Se guarda en la cuenta del comprador (lo ve en cualquier dispositivo).
| Columna | Tipo | Nota |
|---|---|---|
| comprador_id | uuid FK → perfiles | |
| producto_id | uuid FK → productos | |
| cajas | integer | 1 a 999 |
| agregado_en | timestamptz | |
PK compuesta (comprador_id, producto_id). La vista `carrito_detalle` le agrega el precio del tramo que corresponde a las cajas (calculado en la base de datos).

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
| direccion_entrega | text | calle y número |
| direccion_detalle | text | dpto., oficina (opcional) |
| distrito | text | distrito de Lima o Callao |
| codigo_postal | text | 5 dígitos (opcional) |
| referencia | text | opcional |
| recibe_nombre / recibe_telefono | text | quién recibe; celular en formato +51987654321 |
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
| cajas_reservadas | integer | cuántas salieron del stock (compra directa: todas; encargo separado: 0; "todo junto": las que había). Es lo que vuelve al stock si se rechaza o cancela |
| precio_caja_centimos | integer | **copia** del precio aplicado según la escala |
| subtotal_centimos | integer | cajas × precio |

### Cotizador (fase 6: `17_cotizador.sql`, `20_cotizador_completo.sql`, `21_limpieza_cotizador.sql`)
Los valores iniciales son **supuestos por validar con caterings**; el admin los edita.

**parametros_cotizador** (una sola fila): % que no toma alcohol, multiplicadores por público (tranquilo / normal / fuerte) y de día, tragos por hora de bienvenida y de fiesta (y de la 1.ª hora si la fiesta es lo primero), copas por hora de cena, copas de brindis, qué trago se usa en la cena y en el brindis, hielo por invitado por hora, multiplicador de hielo con calor, litros de agua y gaseosas por hora (los que toman y los que no) y margen sugerido. Se edita solo con `admin_guardar_parametros`.

**tipos_evento**: nombre, duración típica (`horas`), `perfil` del público, momentos por defecto (`bienvenida` + horas + trago, `cena` + horas, `brindis`), orden, activo.

**recetas** (tragos): nombre, `categoria` del licor (la misma lista que `productos.categoria`), `ml_por_trago`, y lo que Surtiba no vende: `mezclador` + `mezclador_ml`, `limones` y `jarabe_ml` por trago. Orden, activo.

**ingredientes** (recetario, 21-oct-2026): nombre, `unidad` (ml / unidad / g), `categoria` de producto de Surtiba que lo cubre (pisco, ron, gin, vodka, vino, espumante, licor, cóctel listo) o vacío si Surtiba no lo vende, orden, activo.

**receta_ingredientes**: cuánto lleva cada trago: (receta_id, ingrediente_id, `cantidad` por trago en la unidad del ingrediente). Las cantidades iniciales son recetas clásicas y **supuestos por validar**. Las columnas viejas de `recetas` (`ml_por_trago`, `mezclador`, `limones`, `jarabe_ml`) ya no las usa el cotizador; `admin_guardar_trago` las llena solo para cumplir sus reglas.

Los **tragos propios** del comprador ("Crear mi trago") no tienen tabla: viajan en la entrada del cotizador (`propios`) y se guardan dentro de `cotizaciones.evento`. `limpiarEntrada` los revisa y pone la categoría de cada ingrediente desde `ingredientes`; uno escrito a mano nunca es de Surtiba.

**tipo_evento_recetas**: la barra de cada tipo de evento: (tipo_evento_id, receta_id, `nivel`: principal / secundario / ocasional, que pesan 3 / 2 / 1).

**cotizaciones**: `codigo` (COT-0001), comprador_id, creado_en, `evento` (jsonb; en la versión 2 guarda la entrada completa para volver a abrirla y un resumen con momentos e insumos; null si vino del carrito), `items` (jsonb: copia de productos, cajas y precios), `total_centimos`, `pedido_id` (null hasta que termina en pedido). Solo la crea `crear_cotizacion`; nadie la escribe directo.

**avisos** (campana, 21-oct-2026): perfil_id, `texto`, `enlace` (ruta de la app), `leido_en`, creado_en. Los crean solo los triggers de `pedidos` y `subpedidos` (`supabase/sql/27_avisos.sql`); cada persona ve los suyos y solo puede cambiar `leido_en`.

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
| marcas (nombre comercial, pedido mínimo) | sí, las activas | sí, las activas | las activas y la suya | todo |
| marcas_privado (contacto, dirección, RUC, comisión) | no | no | la suya | todo |
| productos | activos | activos | los suyos (editar) | todo |
| escalas_precio | solo precio "desde" | todas las activas | las suyas (editar) | todo |
| stock | no | disponible | el suyo (editar) | todo |
| perfiles | no | el suyo | el suyo | todo |
| pedidos | no | los suyos | **no** | todo |
| subpedidos e items | no | los de sus pedidos | solo los de su marca | todo |
| favoritos | no | los suyos | no | no hace falta |
| tipos_evento, recetas, tipo_evento_recetas, parametros_cotizador, ingredientes, receta_ingredientes | los activos | los activos | los activos | todo (editar) |
| cotizaciones | no | las suyas (solo leer) | no | todas (solo leer) |

La marca **no puede leer la tabla `pedidos`** (ahí están la dirección y los datos del evento). Todo lo que necesita está en su subpedido.

### Cómo está implementado (fase 1, ver `supabase/sql/`)
- **Todo pasa por RLS.** No hay vistas que se salten RLS (se quitaron en `07_sin_vistas_definer.sql`).
- **Visitante (rol `anon`)**: lee `productos` solo en columnas públicas (sin `stock_cajas` ni `registro_sanitario`: si las pide, recibe "permission denied"), solo el primer tramo de `escalas_precio` y las `marcas` activas. No puede escribir en ninguna tabla.
- **Vista `catalogo_publico`** (`security_invoker = true`): productos activos de marcas activas con el precio del primer tramo. Respeta el RLS de quien la consulta.
- **Funciones de ayuda** en el esquema `privado` (no se exponen en la API): `mi_rol()`, `es_admin()`, `mi_marca_id()`, `marca_activa()`.
- **Perfil automático**: al crear un usuario, un trigger le crea un perfil con rol `comprador`. Los roles `marca` y `admin` solo se asignan desde el servidor.
- Cada usuario puede editar solo `nombre`, `empresa`, `tipo_negocio`, `whatsapp` y `ruc` de su perfil; nunca su `rol` ni su `marca_id`.
- Sin insert directo en `pedidos`, `subpedidos` ni `items`: se crearán con funciones del servidor (fases 3–5).
- Los productos no se borran; se desactivan (`activo = false`).

## Lógica en el servidor
**Crear un pedido** es una sola transacción. Implementado en la función `crear_pedido` (`supabase/sql/08_carrito_y_pedidos.sql`): el navegador solo manda los datos de entrega; los productos y cajas salen del `carrito` guardado. La entrega se puede pedir desde mañana (hora de Lima).
1. Se recibe solo `[{producto_id, cajas}]` y los datos de entrega.
2. Se bloquean las filas de esos productos (`SELECT … FOR UPDATE`) y se revisa el stock.
3. Se calculan los precios según la escala, se agrupa por marca y se valida el pedido mínimo.
4. Se crean `pedidos`, `subpedidos` e `items`, y se descuenta `stock_cajas`.
5. Si algo falla, no se guarda nada.

**Entregar un pedido:** se calcula la comisión de cada subpedido, con exención si la marca tiene menos de 3 subpedidos entregados antes.

**Editar el recetario (admin):** `admin_guardar_trago` guarda un trago y sus ingredientes en una sola transacción (`supabase/sql/25_editor_recetario.sql`): revisa que cada ingrediente exista, sin repetidos y con cantidad entre 0 y 1000, y calcula solo el licor principal (`recetas.categoria`). `admin_guardar_ingrediente` crea o edita un ingrediente; lo que vende Surtiba se mide en ml.

## Caché de datos públicos (fase 8, parte D)
Lo que es igual para todos los visitantes se guarda en caché (`"use cache"`, se renueva cada hora y al instante con `updateTag`). Se lee con `clientePublico()` (sin sesión), así RLS solo entrega lo público. **Nada que dependa de la sesión va en caché.**

| Qué | Dónde | Etiqueta | Se renueva al instante cuando… |
|---|---|---|---|
| Catálogo del visitante (`catalogo_publico`) | `lib/catalogo-publico.ts` | `catalogo` | una marca o el admin guardan un producto o una foto, o el admin edita una marca |
| Supuestos, tipos de evento y tragos activos | `supuestosCotizador()` en `lib/cotizador-datos.ts` | `cotizador` | el admin guarda supuestos, un tipo de evento o un trago |

Si se agrega una acción que cambia esos datos, debe llamar a `updateTag` con su etiqueta.

## Métrica principal
**Cajas vendidas del mes** = suma de `total_cajas` de los subpedidos `entregado` cuyo `entregado_en` cae en el mes.
