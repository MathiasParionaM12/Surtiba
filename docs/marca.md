# Marca — cómo se ve y cómo habla la interfaz

Estilo: B2B formal y sobrio (referencias: Provi, Pod). Herramienta de trabajo, no tienda de fiesta.

## Colores (tokens para Tailwind)

| Token | HEX | Uso |
|---|---|---|
| papel | `#F5F3EE` | fondo general |
| blanco | `#FFFFFF` | tarjetas, tablas |
| tinta | `#121212` | texto principal, botón primario |
| gris | `#5C5A55` | texto secundario |
| linea | `#DCD8CF` | bordes y divisores |
| verde | `#14432F` | acento: enlaces, estados positivos, botón secundario |
| resaltador | `#E8FF00` | **máximo un uso por pantalla** (ej. resaltar la métrica principal). **Nunca en botones** |

Etiquetas de estado: pendiente / recibido = gris; listo para recojo / en preparación / recogido / en camino = verde; entregado = tinta; rechazado / cancelado = rojo apagado `#8A2B2B` (solo en la etiqueta, nunca en fondos grandes).

**Nunca** usar azul marino ni imágenes de fiesta o consumo final.

## Tipografía
- **Geist** — todo el texto (`next/font` o paquete `geist`)
- **Geist Mono** — todos los números (precios, cajas, códigos de pedido) y etiquetas pequeñas en mayúsculas

## Componentes
- Tarjetas: borde 1px `linea`, radio 6px, sin sombras fuertes
- Botones: radio 6px; primario fondo `tinta` texto blanco; secundario borde `linea`
- Tablas densas y legibles: es una herramienta de compra por cajas
- Debe funcionar bien en celular (los compradores piden desde el teléfono)

## Movimiento (fase 8)
Poco, corto y útil. Nunca para decorar.
- **Avisos flotantes** (sonner, `components/Avisos.tsx`): los éxitos ("Stock guardado") salen abajo a la derecha y se van solos en 4 s. Los errores se quedan junto al formulario.
- **Cambio de pantalla:** fundido de 220 ms (solo opacidad) y una barra verde fina arriba mientras carga.
- **Carga:** esqueletos grises con un brillo que los recorre.
- **Al pasar el mouse:** las tarjetas suben 2 px con una sombra suave; los botones se achican apenas al presionarlos.
- **Encabezado:** arriba del todo se funde con el papel; al bajar gana fondo blanco, borde y sombra suave. En el menú, una línea verde crece al pasar el mouse y queda debajo de la página actual.
- **Contador:** los números grandes (Resumen de la marca, Inicio del admin, "3 pedidos" de la portada) suben de 0 a su valor la primera vez que aparecen, en 0.6 s (única excepción a los 300 ms).
- **Cinta de categorías** (portada): las categorías con productos se mueven despacio y se detienen con el mouse o el teclado.
- **Sellos que se estampan** (`components/Sello.tsx`): marcan algo que acaba de pasar, como en un documento. Entran un poco más grandes e inclinados y se asientan en 0.26 s; con "reducir movimiento" solo aparecen. Borde de 2 px en tinta, verde o gris, Geist Mono en mayúsculas. Usos en el cotizador: el ✓ de un paso hecho, "Agregado" al sumar un trago (se va solo a los 2 s), "Tuyo" en los tragos propios, "En el carrito" al agregar un producto y, junto al total, "Cotizado · fecha" que pasa a "Guardada · COT-0012" al descargar el PDF. Nunca en resaltador.
- **Sello de estado** (`components/SelloEstado.tsx`): en el encabezado del pedido, de la orden de la marca y del pedido en el admin. Se estampa **solo cuando el estado acaba de cambiar** (o al llegar recién pagado), no cada vez que se abre la página. En las tablas se siguen usando las etiquetas de estado.
- **Recibo**: los totales del pedido del comprador llevan borde de abajo dentado (clase `.recibo`), números en Geist Mono y el sello "Pagado · SUR-0012".
- **Línea de tiempo del pedido**: los tramos hechos se llenan uno tras otro (0.32 s cada uno, 120 ms entre tramos).
- **Carrito**: una barra fina en verde muestra cuánto falta para el siguiente precio por volumen ("2 cajas más y pagas S/ 285 por caja").
- **Selectores** (Principal / Secundario / Ocasional y similares): el fondo blanco se desliza hasta la opción elegida (200 ms).
- **Barra del reparto** de la barra de tragos: un color fijo por trago (tinta, verde, gris y sus tonos); al cambiar un nivel, cada parte cambia de tamaño suave.
- **Enlaces de texto verdes** (clase `.enlace`): una línea crece debajo al pasar el mouse, como en el menú.
- **Flechas (→)** de botones y enlaces: avanzan 2 px al pasar el mouse.
- **Listas de pedidos, órdenes y logística** (clase `.escalonado`): las filas entran una tras otra al cargar (30 ms entre filas, máximo 12).
- **"En el carrito"**: el mismo sello del cotizador al agregar desde una tarjeta o el detalle de un producto.
- **Íconos:** lucide-react, de trazo fino, en verde o gris. Acompañan al texto, no lo reemplazan (salvo en celular, con su texto para lectores de pantalla).
- **Reducir movimiento** (cambiado el 18-oct-2026): muchos Windows lo traen activado sin que la persona lo sepa, y apagar todo dejaba la app sin vida. Por eso solo se apaga lo que se repite o se mueve mucho: el brillo de los esqueletos, la línea del recorrido de la portada, la cinta de categorías y el desplazamiento suave entre pasos del cotizador. Los fundidos cortos, el hover, las cifras y el contador del carrito siguen. Los avisos flotantes aparecen sin deslizarse (lo decide la librería sonner).

## Logo
"surtiba" en minúsculas; el punto de la "i" es un cuadrado en `resaltador`. **Ya hay archivo oficial** (de Mathias, 15-oct-2026):
- **Logo:** `components/marca/logo-surtiba.png` (fondo transparente). En la web lo pone `components/Logo.tsx` (encabezado y pie) y en el PDF `lib/marca/logo-pdf.ts`.
- **Ícono de la página:** la "t" con el cuadrado amarillo, sobre papel: `app/icon.png`, `app/apple-icon.png` y `app/favicon.ico`.
- No dibujarlo con texto ni mover el cuadrado: usar siempre el archivo.

## Tono
- Directo y honesto. Números antes que adjetivos.
- Tuteo. Sin signos de exclamación. Sin emojis.
- Bien: "Pedido mínimo: 5 cajas. Te faltan 2."
- Mal: "¡Ups! Parece que aún no llegas al mínimo 😅"
- Mensajes de error que dicen qué pasó y qué hacer.
- Estados vacíos útiles: "Aún no tienes pedidos. Explora el catálogo para armar el primero."

## Referencias visuales (si existe la carpeta `docs/referencias/`)
- `compradores.html` y `marcas.html` son las landings del experimento. Úsalas **solo como referencia de estilo**: header, botones, tarjetas, espaciados y uso de la tipografía.
- **No copies sus textos ni sus promesas.** La landing era de pre-lanzamiento, y el texto de la app sale de `docs/producto.md`.
- Ignora su formulario y el código que envía datos a Google Sheets: en la app, los datos van a Supabase.
- Si una landing contradice este archivo, manda este archivo.
