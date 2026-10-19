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
| Catálogo | Productos con foto, nombre, marca, ml, grado, unidades por caja y **solo el precio "desde"** (el del primer tramo), mostrado como "S/ 300 por caja" y debajo "Precios por volumen al ingresar" |

### Comprador
Cualquiera puede registrarse y pedir. No requiere aprobación.

| Pantalla | Qué tiene |
|---|---|
| Registro / login | Correo y contraseña. Datos: nombre, empresa, tipo de negocio (catering, organizador de eventos, wedding planner, bar/restaurante u otro), WhatsApp y RUC (opcional) |
| Catálogo | Filtros por categoría y marca. Precio "desde", corazón de favorito y stock disponible ("Agotado" si es 0) |
| Detalle de producto | Escala de precios completa, pedido mínimo de la marca, stock disponible y registro sanitario |
| **Cotizador de evento** | Ver la sección "Cotizador" más abajo |
| Favoritos | Sus productos guardados |
| Carrito | Agrupado por marca, con subtotal por marca. Avisa si una marca no llega a su pedido mínimo o si no hay stock suficiente. Botón **"Descargar cotización (PDF)"** |
| Confirmar pedido | Quién recibe (nombre y celular con prefijo de país), dirección completa (calle y número, dpto./oficina, distrito de Lima o Callao, código postal y referencia), fecha deseada de entrega (desde mañana) y nota. Datos del evento opcionales: nombre, tipo, fecha, invitados. Se autocompleta con el perfil y el último pedido |
| Mis pedidos | Lista con su estado. Botón **"Repetir pedido"** |
| Detalle del pedido | Línea de tiempo: Recibido → En preparación → En camino → Entregado |

El comprador **nunca** ve datos de contacto de las marcas. Si tiene dudas, habla con Surtiba.

### Marca (una cuenta por marca)
Cómo entra una marca (decidido el 14-oct-2026): en **Crear cuenta** elige **"Quiero vender"** y llena los datos de su marca (nombre comercial, razón social, RUC, dirección de recojo). Queda como **solicitud en revisión** (no vende ni compra) hasta que el admin la **aprueba** y fija su % de comisión y su pedido mínimo. Recién ahí es marca y ve su panel. Si el admin la rechaza, ve el motivo.

| Pantalla | Qué tiene |
|---|---|
| Inicio / **Mis números** | Cajas vendidas del mes, ventas del mes (S/), comisión por pagar, órdenes pendientes |
| Órdenes | Solo sus subpedidos: código, productos, cajas, total y fecha de recojo. **Sin datos del comprador** |
| Detalle de la orden | Botones **"Listo para recojo"** y **"No puedo atenderla"** (con motivo obligatorio) |
| Mis productos | Crear y editar productos, fotos y **escala de precios** |
| Stock | Actualizar las cajas disponibles de cada producto, de forma rápida (una tabla editable) |

### Admin (equipo Surtiba)
| Pantalla | Qué tiene |
|---|---|
| Inicio | Cajas vendidas del mes (métrica principal), pedidos del mes, compradores activos, comisión del mes |
| Marcas | Revisar solicitudes de "Quiero vender" (aprobar con % de comisión y pedido mínimo, o rechazar con motivo). Editar marcas: comisión, pedido mínimo, contacto, activar/desactivar. Puede editar sus productos |
| Pedidos | Todos los pedidos, con filtros por estado y marca. Ve los datos del comprador |
| Logística | **Recojos**: subpedidos listos, agrupados por marca, con botón "Recogido". **Entregas**: pedidos con todo recogido, con botones "En camino" y "Entregado" |
| Pagos | Marcar un pedido como pagado y con qué método: transferencia, Yape, Plin o efectivo. Sin pasarela |

## Reglas de negocio

### Visibilidad de precios
- Sin sesión: solo el precio "desde" (el precio por caja del primer tramo).
- En estos documentos, "precio desde" = precio del primer tramo. **En pantalla nunca se usa la palabra "desde"**: se muestra "S/ 300 por caja" y debajo "Precios por volumen al ingresar".
- Con sesión de comprador: la escala completa.
- Esto se controla en la base de datos (una vista o función que solo devuelve el primer tramo), no solo ocultándolo en pantalla.
- RLS filtra filas, no columnas. Para ocultar columnas (stock al visitante, contactos y dirección de las marcas) se usan **vistas**.

### Escala de precios
- Cada producto tiene uno o más tramos: `desde_cajas`, `hasta_cajas` (vacío = sin tope) y `precio_caja`.
- El precio se elige según las cajas **de ese producto** en el pedido.
  - Ejemplo: de 1 a 4 cajas, S/ 300; de 5 a 9, S/ 285; 10 o más, S/ 270. Si pide 6, paga S/ 285 cada una.
- Los tramos no se superponen ni dejan huecos, y el primero empieza en 1. Validarlo al guardar.
- Si la marca cambia precios, los pedidos ya hechos no cambian (el precio se copia en el ítem).

### Stock
- La marca declara cuántas cajas tiene de cada producto.
- Se puede pedir más de lo disponible: **lo que falta se convierte en un pedido por encargo** aparte (ver "Pedidos por encargo y pago").
- **Al pagar la compra directa, el stock se descuenta** (se reserva) en la misma transacción. Un encargo no reserva stock: la marca lo produce. Excepción: en **"todo junto"** se aparta lo que hay en stock.
- Si un subpedido se rechaza o se cancela, vuelve al stock exactamente lo que se había apartado.
- Si dos compradores piden la última caja al mismo tiempo, solo uno se la lleva en compra directa; al otro esa caja le queda por encargo.

### Pedidos por encargo y pago (fase 7, decidido el 14-oct-2026)
- **Compra directa (hay stock):** al confirmar, el cliente **paga en el carrito** (pago simulado: Yape, Plin, transferencia o tarjeta) y se reserva el stock. No hay aprobación de la marca: Surtiba coordina el recojo. La marca igual marca "Listo para recojo" cuando lo tiene empacado.
- **Pedido por encargo (pide más que el stock):** lo que falta va en un **pedido aparte** con su propio código, en estado **"por confirmar"**. Todos los productos aceptan encargo.
  - Cada marca **acepta** (indicando la fecha en que lo tendrá listo) o **rechaza** con motivo.
  - Cuando todas respondieron y alguna aceptó, el pedido pasa a **"confirmado · por pagar"** y el cliente ve el aviso *"Tu pedido está confirmado y en producción. Págalo para continuar"* (más un número en "Mis pedidos").
  - Al pagar, sigue el flujo normal. La marca no puede marcarlo "Listo para recojo" antes del pago. Si todas rechazan, se cancela.
- **El comprador elige** (decidido el 14-oct-2026), solo si falta stock y algo sí hay:
  - **"Lo que hay ahora + el resto por encargo"** (lo de arriba): dos pedidos, pagos y entregas por separado.
  - **"Todo junto cuando esté completo"**: **un solo pedido por encargo** con todo el carrito. Se aparta lo que hay en stock; **cada marca del pedido confirma** su parte con fecha (o la rechaza y lo apartado vuelve a su stock). Cuando todas respondieron, el cliente **paga todo en un solo pago** y llega junto.
- Ambos pedidos usan el precio del tramo según el **total** de cajas pedidas del producto. El pedido mínimo se cuenta sobre el total.
- **Saldo:** si se agrega un reemplazo a un pedido ya pagado, el cliente ve "Falta pagar S/ X". Si una marca no atiende algo ya pagado, queda "saldo a favor" que Surtiba devuelve por fuera de la app.

### Pedido mínimo
> **Pausado el 19-oct-2026 (Mathias):** con mínimos altos el cotizador pierde sentido (sugiere 5 cajas y la marca pide 10). Todas las marcas quedaron en 1 caja y no se muestra ni se pide en ninguna pantalla (`PEDIDO_MINIMO_ACTIVO = false` en `lib/catalogo.ts`). Las reglas de abajo quedan para cuando se reactive.

- Cada marca tiene un pedido mínimo en cajas (la suma de sus productos en el pedido).
- Si no se llega, el carrito avisa ("Pedido mínimo: 5 cajas. Te faltan 2.") y no deja enviar hasta corregirlo o quitar esa marca.

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

Asistente en 4 pasos:
1. **Evento:** tipo (llena los valores típicos), nombre y fecha (opcionales), invitados, **cuántos no toman alcohol** (sugerido: 20 %), hora de inicio, duración, lugar (interior / aire libre o verano) y **¿Cómo es tu público?** (toma poco / normal / toma bastante, cada uno con sus tragos por hora; lo sugiere el tipo de evento).
2. **Momentos**, uno tras otro: **bienvenida** (con su trago o los de la barra), **cena con vino**, **brindis** (espumante) y **fiesta**, que ocupa las horas que quedan.
3. **Barra:** el comprador elige los tragos y marca cada uno como **principal (3), secundario (2) u ocasional (1)**; no se usan porcentajes. Además elige **"¿Pedimos un poco extra por si acaso?"**: lo justo, +10 % o +20 % (el sugerido lo fija el admin), con cuántos tragos de más significa.
4. **Resultado:** tragos por momento, costo total y por invitado, el producto de Surtiba de cada trago (recomendado o elegido), las cajas por producto (editables), el aviso de pedido mínimo ("Marca Demo Pisco pide mínimo 5 cajas. Tu evento necesita 2.", con *Subir a X* o *Cambiar de producto*) y la **lista de lo que Surtiba no vende**: hielo, agua y gaseosas, mezcladores, limones y jarabe.

Cálculo (solo cuentan los que toman; factor = público × horario, de día se toma menos):
- bienvenida = toman × tragos por hora × horas × factor
- cena = toman × copas por hora × horas × factor
- brindis = toman × copas de brindis
- fiesta = toman × factor × tragos por hora (la 1.ª hora más fuerte solo si la fiesta es lo primero)
- todo × (1 + margen). Cajas = ml ÷ (ml de la botella × botellas por caja), hacia arriba.

Todos los valores (`parametros_cotizador`, tipos de evento y tragos) **los edita el admin**. Los iniciales son **supuestos por validar con caterings** y la pantalla lo dice: "Estimación referencial. Ajusta las cantidades antes de pedir."

Se guarda (COT-0001) con "Descargar PDF"; en **Mis cotizaciones** el comprador la vuelve a abrir en el cotizador o baja el PDF. "Agregar todo al carrito" reemplaza las cajas de esos productos en el carrito.

Para el brindis existe la categoría **Espumante** (decidida el 14-oct-2026).

### Cotización en PDF
- Se genera desde el carrito: logo, fecha, código (COT-0001), productos por marca, cajas, precio por caja y totales.
- **Cada cotización se guarda** en una tabla simple (comprador, fecha, ítems y total) para medir cuántas terminan en pedido.
- También se descarga desde el cotizador (con el evento, sus momentos y la lista de insumos). Solo compradores con sesión.
- "Terminó en pedido": cuando el comprador envía un pedido, su última cotización sin pedido de los últimos 30 días queda vinculada a ese pedido.
- Pie: "Precios válidos sujetos a stock al momento de pedir." No promete fechas de entrega.

### Avisos
- MVP: el admin ve las novedades en su panel. Correos automáticos solo si sobra tiempo. Nada de WhatsApp API.

## Para después (pedido por Mathias el 14-oct-2026, todavía no construir)
- **Validación de marcas con documentos:** al pedir "Quiero vender", subir su catálogo y certificados (DIGESA, registro sanitario, etc.).
- **Aprobación de productos:** cada producto que suba una marca queda "en revisión" hasta que el admin lo acepte; recién ahí aparece en el catálogo.
- ~~**Pago al comprar**~~ → ya construido en la fase 7 (ver "Pedidos por encargo y pago").
- **Pedido mínimo y comisión (ya aplicado):** el pedido mínimo lo decide cada marca (al registrarse y en su panel); la comisión es fija de 5 % por ahora.

## Fuera del MVP (no construir; si parece necesario, preguntar)
- Pasarela de pago (Culqi, Mercado Pago, Izipay): será el próximo año
- Facturación electrónica
- Optimización de rutas o GPS de reparto
- Chat (y en ningún caso entre comprador y marca)
- WhatsApp API
- App móvil nativa (pero la web tiene que verse bien en el celular)
- Distribuidores y mayoristas como compradores

## Decisiones pendientes (no inventarlas; preguntar a Mathias)
- ¿Los precios incluyen IGV?
- % de comisión definitivo (el experimento mostró que 12% es alto). **Por ahora es fija de 5 %** para todas las marcas (14-oct-2026).
- Costo de envío: ¿quién lo paga y cuánto? Por ahora, campo en 0.
- ¿Quién emite la factura al comprador, Surtiba o la marca? (tema SUNAT: se define después, no afecta el prototipo)
- Zonas y horarios de entrega
- Valores iniciales del cotizador
