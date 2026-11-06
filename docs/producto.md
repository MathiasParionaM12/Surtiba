# Producto: qué hace Surtiba (MVP)

## La promesa al comprador (sale de la landing; la app tiene que cumplirla)
1. **Cotizar el evento en minutos**: cotizador de evento + cotización en PDF
2. **Precios reales sin preguntar**: escala de precios visible con sesión
3. **El pedido de cada marca en una sola compra**: carrito multimarca
4. **Volver a pedir sin empezar de cero**: repetir pedido y favoritos

## Pantallas por rol

### Visitante (sin sesión)
| Pantalla | Qué tiene |
|---|---|
| Inicio | Qué es Surtiba y botones de "Crear cuenta" e "Ingresar" |
| Marcas (21-oct-2026) | Directorio `/marcas`: cada marca activa con su logo, su descripción, sus categorías y cuántos productos tiene. Al tocarla, `/marcas/[id]` muestra sus productos con los filtros del catálogo. Nunca contacto ni dirección. La marca edita su logo y descripción en «Mi marca» |
| Catálogo | Productos con foto, nombre, marca, ml, grado, unidades por caja y **solo el precio "desde"** (el del primer tramo), mostrado como "S/ 300 por caja" y debajo "Precios por volumen al ingresar" |

### Comprador
Cualquiera puede registrarse y pedir. No requiere aprobación.

| Pantalla | Qué tiene |
|---|---|
| Registro / login | Correo y contraseña. Datos: nombre, empresa, tipo de negocio (catering, organizador de eventos, wedding planner, bar/restaurante u otro), WhatsApp (solo Perú: el +51 va fijo desde el 5-nov-2026) y RUC (opcional) |
| Catálogo | Filtros por categoría y buscador; en «Más filtros» (21-oct-2026): precio máximo por caja, marca, presentación (ml), grado de alcohol, disponibilidad (con stock o por encargo, solo con sesión) y orden. Quedan en la dirección para compartirla. Antes: filtros por categoría y marca. Precio "desde", corazón de favorito y stock disponible ("Agotado" si es 0) |
| Detalle de producto | Escala de precios completa, stock disponible y registro sanitario. **Calcula tu margen** (21-oct-2026): pone a cuánto lo vendería, por trago (bares, caterings, eventos) o por botella (por ejemplo, una licorería), y cuántas cajas compraría; ve su costo, su ganancia por unidad y por caja y su margen. Es una estimación en el navegador: no cambia precios ni pedidos |
| **Cotizador de evento** | Ver la sección "Cotizador" más abajo |
| Favoritos | Sus productos guardados |
| Carrito | Agrupado por marca, con subtotal por marca. Avisa si no llega al pedido mínimo (3 cajas en total). Si un producto no alcanza el stock, pide decidir **antes de pagar** (5-nov-2026): **pedir lo que falta por encargo**, **cambiarlo por otro con stock** (hasta 3 de la misma categoría) o **llevar solo lo que hay**. Botón **"Descargar cotización (PDF)"** |
| Confirmar pedido | Quién recibe (nombre y celular +51), dirección completa (calle y número, dpto./oficina, distrito de Lima o Callao, código postal y referencia) y nota. **Ya no elige el día de entrega** (6-nov-2026): pone la **fecha de su evento** (opcional; si tiene una cotización de las 2 últimas semanas sin pedido, sale de ella) y ve "Te lo llevamos el jueves 19 de noviembre". Casilla **"Lo quiero lo antes posible"**. Si no se llega antes del evento, se le avisa y no puede pagar hasta marcar esa casilla o cambiar la fecha. Se autocompleta con el perfil (su dirección habitual) y el último pedido |
| **Libro de Reclamaciones** (22-oct-2026) | `/libro-de-reclamaciones`, enlazado con ícono en el pie de todas las páginas. Para cualquiera, con o sin cuenta: reclamo o queja, datos (documento, domicilio, correo), producto o servicio, pedido y monto (opcionales), qué pasó y qué pide. Recibe un código correlativo (REC-2026-0001) y la fecha límite de respuesta (15 días hábiles, de lunes a viernes). Ve su copia para imprimir o guardar en PDF (todavía no se envía por correo). Con cuenta, ve sus hojas y la respuesta |
| Condiciones y privacidad (22-oct-2026) | `/condiciones` (precios con IGV, encargos, pago simulado, entrega, cancelaciones y devoluciones) y `/privacidad` (Ley 29733: qué datos, para qué, quién los ve, dónde están y derechos ARCO). Los datos de Surtiba (razón social, RUC, dirección, correo) dicen "Por definir" hasta que existan: se llenan en `lib/empresa.ts` |
| **Mi perfil** (22-oct-2026) | Desde su nombre y su foto en el encabezado. Foto o logo (privada: solo la ven él y Surtiba), nombre, empresa, tipo de negocio, WhatsApp, RUC, dirección de entrega habitual y cambiar contraseña (pide la actual). No se guardan métodos de pago ni tarjetas |
| Mis pedidos | Lista con su estado. Botón **"Repetir pedido"** |
| Detalle del pedido | Línea de tiempo: Recibido → En preparación → En camino → Entregado |

El comprador **nunca** ve datos de contacto de las marcas. Si tiene dudas, habla con Surtiba.

### Marca (una cuenta por marca)
Cómo entra una marca (decidido el 14-oct-2026): en **Crear cuenta** elige **"Quiero vender"** y llena los datos de su marca (nombre comercial, razón social, RUC, dirección de recojo). Queda como **solicitud en revisión** (no vende ni compra) hasta que el admin la **aprueba** y fija su % de comisión y su pedido mínimo. Recién ahí es marca y ve su panel. Si el admin la rechaza, ve el motivo.

| Pantalla | Qué tiene |
|---|---|
| Inicio / **Mis números** | **Hoy** (encargos por responder, órdenes por preparar, listas esperando recojo); cajas vendidas del mes, ventas del mes (S/) con la comparación con el mes anterior y su línea de 4 semanas, comisión por pagar, órdenes pendientes; **Para vender más** (21-oct-2026): productos estrella (90 días), lo que le pidieron por encargo (30 días), en cuántas cotizaciones salió (30 días) y su cumplimiento (encargos aceptados, no atendidas, días hasta «Listo»). Solo totales: nunca datos de compradores |
| Órdenes | Solo sus subpedidos: código, productos, cajas, total y fecha de recojo. **Sin datos del comprador** |
| Detalle de la orden | Botones **"Listo para recojo"** y **"No puedo atenderla"** (con motivo obligatorio) |
| Productos | Su lista con las **cajas en stock editables** en la misma tabla y un solo "Guardar stock" (la pestaña Stock se juntó aquí el 5-nov-2026). En "Editar": datos, fotos y **escala de precios**. Cada producto nuevo dice "En revisión" hasta que Surtiba lo aprueba; si lo rechaza, ve el motivo |

### Admin (equipo Surtiba)
| Pantalla | Qué tiene |
|---|---|
| Inicio | Solo **lo que necesita atención** (5-nov-2026): solicitudes de marca, reclamos por responder, órdenes listas, pedidos para enviar o en camino, encargos esperando y pagos pendientes. Si no hay nada: "Todo al día". Los números están en Métricas |
| Marcas | Revisar solicitudes de "Quiero vender" (aprobar con % de comisión y pedido mínimo, o rechazar con motivo). Editar marcas: comisión, pedido mínimo, contacto, activar/desactivar. Puede editar sus productos |
| Pedidos | Todos los pedidos en pestañas por etapa (22-oct-2026): Por atender, Por recoger, En camino, Cerrados y Todos, cada una con su número. Filtros por marca y pago y buscador por código o comprador, que se aplican al instante. Ve los datos del comprador |
| Logística | **Por día de entrega** (6-nov-2026): resumen (próxima entrega, órdenes por recoger y pedidos para ese día, atrasados) y luego un bloque por día (los atrasados primero). En cada día: **Recoger** (la víspera, agrupado por marca, con **"Recogí todo de esta marca"**, que también recoge lo que la marca no marcó como listo y avisa en rojo) y **Entregar** (dirección, quién recibe, cuántas marcas faltan y **"Entregado"**). "En camino" pasa solo cuando no falta recoger nada. Abajo: **días de entrega y anticipación** y **envío por zona** |
| **Reclamos** (22-oct-2026) | Hojas por responder (la que vence antes primero, en rojo si venció) y respondidas. Cada hoja se responde una sola vez y el comprador recibe un aviso |
| **Métricas** (21-oct-2026) | Ventas del mes (entregado) vs el anterior, cajas, pedidos y ticket promedio, comisión generada y exonerada, vendido por semana (8 semanas); embudo de 30 días (vieron un producto → carrito → empezaron a pedir → pedido → pagado → entregado) y cotización → pedido; operación (horas hasta listo, recojo y entrega; atrasos); ranking de marcas; compradores activos, nuevos y recurrentes, por tipo de negocio y distrito; productos más vendidos, más cotizados y nunca vendidos. Todo de `admin_insights()` |
| Pagos | Marcar un pedido como pagado y con qué método: transferencia, Yape, Plin o efectivo. Sin pasarela |

## Reglas de negocio

### Visibilidad de precios
- Sin sesión: solo el precio "desde" (el precio por caja del primer tramo).
- En estos documentos, "precio desde" = precio del primer tramo. **En pantalla nunca se usa la palabra "desde"**: se muestra "S/ 300 por caja" y debajo "Precios por volumen al ingresar".
- Con sesión de comprador: la escala completa.
- Esto se controla en la base de datos (una vista o función que solo devuelve el primer tramo), no solo ocultándolo en pantalla.
- RLS filtra filas, no columnas. Para ocultar columnas (stock al visitante, contactos y dirección de las marcas) se usan **vistas**.

### Entregas (decidido el 5/6-nov-2026)
- **Solo martes y jueves.** Hay que pedir con **2 días de anticipación** (jueves → hasta el martes; martes → hasta el domingo). El admin cambia los días y la anticipación en Logística (`entregas_config`).
- **El comprador no elige el día**: Surtiba le asigna la **última entrega antes de su evento**; sin evento, o con "Lo quiero lo antes posible", la **más cercana**. Si no se llega antes del evento, `crear_pedido` no deja pagar (salvo con esa casilla).
- **Si el evento cae un día de entrega** (martes o jueves), el comprador elige: **la entrega anterior** (por defecto, con margen) o **el mismo día, en la mañana**. Si no hay entrega anterior posible, queda el mismo día (`pedidos.mismo_dia`, `42_candados_y_mismo_dia.sql`).
- **El recojo es la víspera** de la entrega y se asigna solo (ya no se pone a mano).
- **Encargos:** la entrega es la primera después de que todas sus marcas lo tengan listo (respetando el evento); se recalcula cuando las marcas confirman y cuando el comprador paga.
- La regla está en `privado.entrega_asignada` (`41_entregas_martes_jueves.sql`) y la misma, para mostrarla antes de pagar, en `lib/entregas.ts`. Los feriados no se descuentan.

### Candados del admin (6-nov-2026)
El admin ya no puede saltarse pasos (la base lo bloquea aunque se llame directo):
- **Recoger:** solo lo que la marca marcó **"listo"**. "Recogí todo de esta marca" recoge solo lo listo. Si la marca entregó una orden sin marcarla, se recoge desde el pedido con **doble confirmación** ("Confirmo que la marca me entregó esta orden").
- **Recoger, en camino y entregado** exigen que el pedido esté **pagado completo**; si no, el pedido muestra "Bloqueado: falta el pago de S/ X" y Logística "Falta pago".
- **Marcar pagado a mano** pide confirmar "Recibí S/ X".

### Envío (decidido el 22-oct-2026)
- **Fijo por pedido según la zona del distrito**, sin importar las cajas: zona 1 (Lima Centro y Moderna: Barranco, Breña, Jesús María, La Victoria, Cercado, Lince, Magdalena, Miraflores, Pueblo Libre, Rímac, San Borja, San Isidro, San Luis, San Miguel, Surco, Surquillo) **S/ 20**; zona 2 (el resto de Lima y el Callao) **S/ 35**. Son supuestos: el admin los cambia en Logística.
- **Uno solo por compra:** si se divide en compra directa + encargo, el envío va en la directa; si es solo encargo (o "todo junto"), en el encargo. Si todas las marcas de un pedido quedan fuera, el envío vuelve a 0.
- Lo calcula `crear_pedido` en la base (tablas `zonas_envio` y `distritos_envio`); el navegador solo lo muestra. El recojo en cada marca lo cubre la comisión (7 %).

### Devoluciones (decidido el 22-oct-2026)
- Solo si el producto llegó roto o dañado, vencido o distinto a lo pedido. El comprador avisa dentro de las 48 horas siguientes a la entrega. Surtiba revisa con la marca y repone o devuelve lo pagado por esas cajas. No hay devoluciones por cambio de opinión.

### IGV (decidido el 22-oct-2026)
- **Los precios incluyen IGV.** La marca pone el precio final por caja; es lo que ve y paga el comprador. Se avisa "incluye IGV" en el catálogo, el producto, el carrito, el pedido, el cotizador y el PDF. Los cálculos no cambian.

### Escala de precios
- Cada producto tiene uno o más tramos: `desde_cajas`, `hasta_cajas` (vacío = sin tope) y `precio_caja`.
- El precio se elige según las cajas **de ese producto** en el pedido.
  - Ejemplo: de 1 a 4 cajas, S/ 300; de 5 a 9, S/ 285; 10 o más, S/ 270. Si pide 6, paga S/ 285 cada una.
- Los tramos no se superponen ni dejan huecos, y el primero empieza en 1. Validarlo al guardar.
- Si la marca cambia precios, los pedidos ya hechos no cambian (el precio se copia en el ítem).

### Stock
- La marca declara cuántas cajas tiene de cada producto.
- Se puede pedir más de lo disponible: **lo que falta se convierte en un pedido por encargo** aparte (ver "Pedidos por encargo y pago").
- **Al pagar la compra directa, el stock se descuenta** (se reserva) en la misma transacción. Un encargo no reserva stock: la marca lo produce. (Los encargos "todo junto" anteriores al 5-nov-2026 sí apartaron lo que había en stock.)
- Si un subpedido se rechaza o se cancela, vuelve al stock exactamente lo que se había apartado.
- Si dos compradores piden la última caja al mismo tiempo, solo uno se la lleva en compra directa; al otro esa caja le queda por encargo.

### Pedidos por encargo y pago (fase 7, decidido el 14-oct-2026)
- **Compra directa (hay stock):** al confirmar, el cliente **paga en el carrito** (pago simulado: Yape, Plin, transferencia o tarjeta) y se reserva el stock. No hay aprobación de la marca: Surtiba coordina el recojo. La marca igual marca "Listo para recojo" cuando lo tiene empacado.
- **Pedido por encargo (pide más que el stock):** lo que falta va en un **pedido aparte** con su propio código, en estado **"por confirmar"**. Todos los productos aceptan encargo.
  - Cada marca **acepta** (indicando la fecha en que lo tendrá listo) o **rechaza** con motivo.
  - Cuando todas respondieron y alguna aceptó, el pedido pasa a **"confirmado · por pagar"** y el cliente ve el aviso *"Tu pedido está confirmado y en producción. Págalo para continuar"* (más un número en "Mis pedidos").
  - Al pagar, sigue el flujo normal. La marca no puede marcarlo "Listo para recojo" antes del pago. Si todas rechazan, se cancela.
- **Se decide en el carrito** (5-nov-2026, reemplaza la elección del 14-oct): por cada producto que no alcanza, el comprador elige **encargo** (la columna `carrito.encargo`), **cambio por otro con stock** o **solo lo que hay**. `crear_pedido` no deja pagar si queda algo sin decidir (`40_sin_stock_en_el_carrito.sql`).
  - Lo que tiene stock es compra directa (se paga y sale); lo aceptado por encargo va en un **pedido aparte** que la marca confirma y se paga después, sin otro envío.
  - **Se quitó "todo junto"** (un solo pedido por encargo con todo el carrito).
- Ambos pedidos usan el precio del tramo según el **total** de cajas pedidas del producto. El pedido mínimo se cuenta sobre el total.
- **Si una marca no atiende algo ya pagado, Surtiba devuelve la plata** ("Te devolvemos S/ X", por fuera de la app). Ya no se agregan reemplazos a un pedido pagado (se borró `agregar_reemplazo`): el detalle del pedido sugiere productos parecidos que van al carrito, para un pedido nuevo.

### Aprobación de productos (5-nov-2026)
- Lo que **crea una marca** queda **en revisión** y no aparece en el catálogo, el directorio ni el cotizador hasta que el admin lo aprueba en **Panel Surtiba → Productos por aprobar** (`/admin/productos`, también en su Inicio).
- El admin **aprueba** o **rechaza con motivo**; la marca recibe un aviso. Si corrige uno rechazado y guarda, vuelve a revisión.
- Editar un producto ya aprobado (precio, stock, fotos, datos) no pide aprobación otra vez. Lo que crea el admin entra aprobado.
- Los productos que ya existían quedaron aprobados.

### Pedido mínimo
**Desde el 5-nov-2026 (Mathias): 3 cajas en total por pedido, de cualquier marca.** No se puede pedir 1 caja sola; 3 cajas de 3 marcas distintas, sí. Ya no hay mínimo por marca (se quitó del registro "Quiero vender", del panel de la marca y del admin).
- La constante es `PEDIDO_MINIMO_CAJAS` en `lib/catalogo.ts`, y `crear_pedido` lo vuelve a revisar en la base (`38_minimo_3_cajas.sql`).
- El carrito y el cotizador lo avisan en rojo ("Te faltan 2 cajas") y no dejan continuar. El detalle de cada producto lo dice.
- Antes (19-oct) el mínimo por marca estaba pausado en 1 caja. Las columnas `pedido_minimo_cajas` quedan en la base sin uso.

### Subpedidos
- Cada pedido se divide en un **subpedido por marca**, y cada uno tiene su propio estado.
- Un subpedido puede quedar sin atender de dos formas:
  - **Rechazado**: la marca pulsa "No puedo atenderla" y escribe el motivo.
  - **Cancelado**: el admin lo cancela por otros motivos.
- Un subpedido **rechazado cuenta igual que uno cancelado**: no suma al total del pedido, no bloquea el paso a "en camino" y su stock vuelve.
- En ambos casos el total del pedido se recalcula y el comprador lo ve en su pedido. Surtiba le avisa al comprador por fuera de la app.
- El pedido pasa a **"en preparación" automáticamente** cuando al menos una marca marca su subpedido como "listo para recojo".

### Comisión
- Cada marca tiene su % de comisión, que configura el admin.
- Al crear el subpedido se **copia** el % vigente.
- Se calcula **cuando el subpedido se entrega**: total del subpedido × %.
- **Primeros 3 pedidos sin comisión:** los primeros 3 subpedidos *entregados* de cada marca llevan comisión 0. Se cuenta por marca.
- La app solo calcula y muestra la comisión. Cobrarla y pagarle a la marca se hace por fuera.

### Cotizador de evento (versión completa, decidida el 14-oct-2026)
**Solo con cuenta** (comprador; el admin también lo ve). Sin sesión, `/cotizador` explica qué hace con un ejemplo y pide crear cuenta.

Asistente en **3 pasos** (desde el 6-nov-2026; antes eran 4):
1. **Evento:** tipo (llena los valores típicos), nombre y fecha (opcionales), invitados, **adultos que no toman alcohol** (sugerido: 20 % de los adultos), **menores de edad** (opcional; no toman ni brindan), hora de inicio, duración, lugar (interior / aire libre o verano) y **¿Cómo es tu público?** (toma poco / normal / toma bastante, cada uno con sus tragos por hora; lo sugiere el tipo de evento).
   - **Momentos del evento** (sección plegable dentro de este paso; antes era un paso aparte). Ya vienen sugeridos según el tipo de evento y se abren solo para cambiarlos. Uno tras otro: **bienvenida** (con su trago o los de la barra), **cena con vino**, **brindis** (espumante) y **fiesta**, que ocupa las horas que quedan.
2. **Barra:** el comprador busca los tragos del recetario (por nombre o por ingrediente, ej. "pisco") o usa **"Crear mi trago"**: nombre e ingredientes por trago, elegidos de la lista o escritos a mano (hasta 5 tragos propios de 8 ingredientes; viven solo en su cotización y el servidor los revisa y decide qué ingredientes vende Surtiba). Marca cada uno como **principal (3), secundario (2) u ocasional (1)**; no se usan porcentajes. Si el cliente final compra parte del licor, marca **"¿Tu cliente pone algún licor?"** (casillas con los licores de su barra que vende Surtiba): esos salen del pedido y del total y van a **"Lo pone tu cliente"**, en botellas de 750 ml (también en el PDF). El descorche queda fuera por ahora (7-nov-2026). Además elige **"¿Pedimos un poco extra por si acaso?"**: lo justo, +10 % o +20 % (el sugerido lo fija el admin), con cuántos tragos de más significa.
3. **Resultado:** tragos por momento, costo total y por invitado, y el detalle por ingredientes (recetario, 21-oct-2026). Se suman los ingredientes de todos los tragos: **"Lo que necesitas de Surtiba"** (pisco, ron, vino… con el producto recomendado o elegido; en los licores el comprador elige cuál), **"Lo que pedirías a Surtiba"** (cajas editables, cada producto con su botón *Agregar*) y **"Lo consigues por tu cuenta"** (hielo, agua y gaseosas, y todo lo que Surtiba no vende o no tiene por ahora, con cantidades y para qué tragos).

Cálculo (toman = invitados − menores − adultos que no toman; factor = público × horario: de día se toma menos, salvo que el público ya sea "toma poco", para no castigar dos veces):
- bienvenida = toman × tragos por hora × horas × factor
- cena = toman × copas por hora × horas × factor
- brindis = **todos los adultos** × copas de brindis (aunque no tomen, levantan la copa)
- fiesta = toman × factor × tragos por hora (la 1.ª hora más fuerte solo si la fiesta es lo primero)
- todo × (1 + margen). Cajas = ml ÷ (ml de la botella × botellas por caja), hacia arriba.
- Agua y gaseosas: 0.35 L por hora para quien no toma (adultos y menores). Hielo en **bolsas de 3 kg** (como se vende en Lima).

**Ajustes por la investigación (7-nov-2026, `docs/investigacion/`):** pisco sour y maracuyá sour a **60 ml** de pisco (medida IBA; antes 90); **cerveza** como trago secundario en boda, cumpleaños y quinceañero (Surtiba no la vende: sale en "Lo consigues por tu cuenta"); nuevo tipo **Quinceañero**; agua de quien no toma de 0.5 a 0.35 L/h.

Todos los valores (`parametros_cotizador`, tipos de evento y tragos) **los edita el admin**. Los iniciales se revisaron con la investigación de `docs/investigacion/` y siguen **por confirmar en entrevistas con caterings** y la pantalla lo dice: "Estimación referencial. Ajusta las cantidades antes de pedir."

Se guarda (COT-0001) con "Descargar PDF"; en **Mis cotizaciones** el comprador la vuelve a abrir en el cotizador o baja el PDF. "Agregar todo al carrito" reemplaza las cajas de esos productos en el carrito.

Para el brindis existe la categoría **Espumante** (decidida el 14-oct-2026).

### Cotización en PDF
- Se genera desde el carrito: logo, fecha, código (COT-0001), productos por marca, cajas, precio por caja y totales.
- **Cada cotización se guarda** en una tabla simple (comprador, fecha, ítems y total) para medir cuántas terminan en pedido.
- También se descarga desde el cotizador (con el evento, sus momentos y la lista de insumos). Solo compradores con sesión.
- "Terminó en pedido": cuando el comprador envía un pedido, su última cotización sin pedido de los últimos 30 días queda vinculada a ese pedido.
- Pie: "Precios válidos sujetos a stock al momento de pedir." No promete fechas de entrega.

### Avisos
- **Campana en la app** (21-oct-2026): arriba a la derecha, con el número de avisos nuevos; al abrirla se marcan leídos. **En tiempo real:** el aviso llega al instante, sale un aviso flotante con «Ver» y la pantalla se actualiza sola.
  - Comprador: encargo confirmado (págalo), en preparación, en camino, entregado, cancelado.
  - Marca: nueva orden, nuevo encargo por confirmar, el cliente pagó el encargo (ya puede prepararlo). Solo con el código de la orden, nunca datos del comprador.
  - Admin: nuevo pedido, pedido pagado, encargo aceptado o rechazado, orden lista para recojo.
- Correos automáticos solo si sobra tiempo. Nada de WhatsApp API.

## Para después (pedido por Mathias el 14-oct-2026, todavía no construir)
- **Validación de marcas con documentos:** al pedir "Quiero vender", subir su catálogo y certificados (DIGESA, registro sanitario, etc.).
- ~~**Aprobación de productos**~~ → construida el 5-nov-2026 (ver "Aprobación de productos" en Reglas de negocio).
- ~~**Pago al comprar**~~ → ya construido en la fase 7 (ver "Pedidos por encargo y pago").
- **Pedido mínimo y comisión (ya aplicado):** el pedido mínimo lo decide cada marca (al registrarse y en su panel); la comisión es fija para todas: 5 % desde el 14-oct-2026 y **7 % desde el 22-oct-2026** (Surtiba cubre el recojo; `COMISION_PCT` en `lib/catalogo.ts`).

## Fuera del MVP (no construir; si parece necesario, preguntar)
- Pasarela de pago (Culqi, Mercado Pago, Izipay): será el próximo año
- Facturación electrónica
- Optimización de rutas o GPS de reparto
- Chat (y en ningún caso entre comprador y marca)
- WhatsApp API
- App móvil nativa (pero la web tiene que verse bien en el celular)
- Distribuidores y mayoristas como compradores

## Decisiones pendientes (no inventarlas; preguntar a Mathias)
- % de comisión definitivo (el experimento mostró que 12% es alto). **Por ahora es fija de 7 %** para todas las marcas (era 5 % desde el 14-oct-2026; subió el 22-oct-2026).
- ¿Quién emite la factura al comprador, Surtiba o la marca? (tema SUNAT: se define después, no afecta el prototipo)
- Horarios de entrega (los días ya están: martes y jueves)
- Valores iniciales del cotizador
