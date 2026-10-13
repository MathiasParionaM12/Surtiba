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
| Confirmar pedido | Datos del evento (opcionales): nombre, tipo, fecha, invitados. Además: fecha deseada de entrega, dirección y nota |
| Mis pedidos | Lista con su estado. Botón **"Repetir pedido"** |
| Detalle del pedido | Línea de tiempo: Recibido → En preparación → En camino → Entregado |

El comprador **nunca** ve datos de contacto de las marcas. Si tiene dudas, habla con Surtiba.

### Marca (una cuenta por marca; la crea el admin)
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
| Marcas | Crear marca y su cuenta, % de comisión, pedido mínimo, activar/desactivar. Puede editar sus productos |
| Pedidos | Todos los pedidos, con filtros por estado y marca. Ve los datos del comprador |
| Logística | **Recojos**: subpedidos listos, agrupados por marca, con botón "Recogido". **Entregas**: pedidos con todo recogido, con botones "En camino" y "Entregado" |
| Pagos | Marcar un pedido como pagado y con qué método (transferencia, Yape, etc.). Sin pasarela |

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
- No se puede pedir más de lo disponible.
- **Al enviar el pedido, el stock se descuenta** (se reserva) en la misma transacción.
- Si un subpedido se rechaza o se cancela, el stock vuelve.
- Si dos compradores piden la última caja al mismo tiempo, solo uno lo logra y el otro ve un mensaje claro.

### Pedido mínimo
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

### Cotizador de evento
1. El comprador ingresa: tipo de evento, número de invitados y duración en horas.
2. Elige qué bebidas quiere (productos del catálogo) y qué parte del consumo va a cada una (ej.: 60% pisco, 40% ron).
3. La app calcula:
   - tragos totales = invitados × tragos por persona según las horas
   - botellas = tragos × ml por trago ÷ ml de la botella
   - cajas = botellas ÷ unidades por caja, **redondeado hacia arriba**
4. Muestra el resultado con el precio de la escala, y un botón "Agregar al carrito".
5. Los parámetros (tragos por persona en la primera hora, tragos por hora siguiente, ml por trago) **los configura el admin**. Los valores iniciales son **supuestos por validar con caterings** y la pantalla lo dice: "Estimación referencial. Ajusta las cantidades antes de pedir."

### Cotización en PDF
- Se genera desde el carrito: logo, fecha, código (COT-0001), productos por marca, cajas, precio por caja y totales.
- **Cada cotización se guarda** en una tabla simple (comprador, fecha, ítems y total) para medir cuántas terminan en pedido.
- Pie: "Precios válidos sujetos a stock al momento de pedir." No promete fechas de entrega.

### Avisos
- MVP: el admin ve las novedades en su panel. Correos automáticos solo si sobra tiempo. Nada de WhatsApp API.

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
- % de comisión definitivo (el experimento mostró que 12% es alto)
- Costo de envío: ¿quién lo paga y cuánto? Por ahora, campo en 0.
- ¿Quién emite la factura al comprador, Surtiba o la marca? (tema SUNAT: se define después, no afecta el prototipo)
- Zonas y horarios de entrega
- Valores iniciales del cotizador
