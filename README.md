# Surtiba

Marketplace B2B **gestionado** que conecta marcas peruanas de licores y cócteles con caterings, organizadores de eventos, wedding planners y bares que compran **por cajas**. Surtiba gestiona todo: el comprador le compra a Surtiba, Surtiba recoge en cada marca y entrega el pedido completo. La marca y el comprador no se comunican.

> **Prototipo funcional para un curso de UTEC.** No hay ventas, cobros ni envíos reales: el pago es simulado y todos los datos de prueba son ficticios.

**En línea:** https://surtiba.vercel.app

## Qué hace

| Rol | Qué puede hacer |
|---|---|
| Visitante | Ver la portada, el catálogo con el precio por caja del primer tramo y un ejemplo del cotizador |
| Comprador | Cotizar su evento (tragos, cajas e insumos), descargar la cotización en PDF, armar un pedido de varias marcas, pagar (simulado), pedir por encargo lo que no hay en stock y seguir la entrega |
| Marca | Mantener sus productos, precios por volumen y stock. Ver sus órdenes sin datos del comprador, dejarlas listas para recojo y aceptar o rechazar encargos. Ver sus números |
| Admin (Surtiba) | Aprobar marcas, gestionar pedidos, recojos y entregas, marcar pagos, editar los supuestos del cotizador y ver las métricas |

Al enviar un pedido se divide en un subpedido por marca. Lo que tiene stock se paga en ese momento y reserva el stock; lo que falta queda **por encargo** hasta que la marca lo confirme. Al entregarse, se calcula la comisión de cada marca (sus primeros 3 pedidos entregados no pagan).

## Tecnología

- **Next.js 16** (App Router) + **TypeScript**
- **Tailwind CSS 4**, con los colores y fuentes de `docs/marca.md`
- **Supabase**: base de datos PostgreSQL con RLS, login (Auth) y fotos (Storage)
- **Vercel**: hosting. Publica solo cada vez que se sube un cambio a `main`
- Librerías: `@supabase/ssr`, `@react-pdf/renderer` (PDF), `sonner` (avisos), `lucide-react` (íconos)

## Documentación

| Archivo | Qué tiene |
|---|---|
| [`docs/producto.md`](docs/producto.md) | Qué hace la app por rol, reglas de negocio y decisiones pendientes |
| [`docs/modelo-datos.md`](docs/modelo-datos.md) | Tablas, relaciones, estados y quién ve qué |
| [`docs/marca.md`](docs/marca.md) | Colores, tipografía, movimiento y tono |
| [`docs/seguridad.md`](docs/seguridad.md) | Cómo está protegida la app, riesgos aceptados y pendientes |
| [`docs/ruta-de-prueba.md`](docs/ruta-de-prueba.md) | Recorrido paso a paso para probar toda la app |
| [`CLAUDE.md`](CLAUDE.md) | Contexto y reglas de trabajo del proyecto |

## Seguridad, en corto

- RLS en todas las tablas. Las escrituras importantes van solo por funciones del servidor que validan el rol.
- El rol lo asigna siempre el servidor, y un candado en la base impide cambiárselo.
- Precios, stock y comisiones se calculan en el servidor: el navegador solo manda producto y cajas.
- Sin claves en el repo. Sin sesión solo se ve el precio del primer tramo.

Detalle en [`docs/seguridad.md`](docs/seguridad.md).
