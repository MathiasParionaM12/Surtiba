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

## Logo
"surtiba" en minúsculas, Geist semibold. El punto de la "i" es un cuadrado en `resaltador`. Mientras no haya archivo de logo, hacerlo con texto + un `span` cuadrado.

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
