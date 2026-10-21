# Surtiba — contexto para Claude Code

Lee este archivo completo al iniciar cada sesión. Los detalles están en `docs/`:
- `docs/producto.md` — qué hace la app por rol, reglas de negocio y qué NO entra
- `docs/modelo-datos.md` — tablas, relaciones, estados y quién ve qué
- `docs/marca.md` — colores, tipografía y tono de la interfaz
- `docs/seguridad.md` — cómo está protegida la app, riesgos aceptados y pendientes (leer antes de tocar RLS, funciones o Auth)

## Qué es Surtiba

Marketplace B2B **gestionado** que conecta **marcas peruanas de licores y cócteles** (vendedores) con **caterings, organizadores de eventos, wedding planners y bares/restaurantes** (compradores) que compran por cajas.

- **Surtiba gestiona todo:** el comprador le compra a Surtiba. **La marca y el comprador no se comunican.**
- La marca solo mantiene su catálogo y su stock, y deja lista su orden para que Surtiba la recoja.
- **Surtiba recoge en cada marca y entrega el pedido completo al comprador.**
- El comprador no paga comisión. La marca paga un % de comisión solo sobre lo vendido y entregado. Sus primeros 3 pedidos entregados no pagan comisión.
- Hoy: licores y cócteles en Lima. Visión: todo el abastecimiento HORECA.

## Usuarios

| Rol | Qué hace |
|---|---|
| **comprador** | Cotiza su evento, arma un pedido con productos de varias marcas, descarga la cotización en PDF, lo envía y sigue la entrega |
| **marca** | Una cuenta por marca. Mantiene precios, productos y stock. Ve las órdenes de Surtiba (sin datos del comprador) y las deja listas para recojo. Ve sus números |
| **admin** | Equipo Surtiba: crea marcas, gestiona pedidos, recojos y entregas, marca pagos y ve las métricas |

## El ciclo central del MVP (tiene que funcionar a fines de noviembre de 2026)

1. **La marca se registra con "Quiero vender" y el admin la aprueba** (fija comisión y pedido mínimo). Después, la marca mantiene sus precios, productos y stock.
2. **Comprador cotiza o navega**, arma un pedido de varias marcas en una sola compra y puede descargar la cotización en PDF.
3. **Al enviar**, el sistema aplica la escala de precios, revisa el pedido mínimo y divide el pedido en **subpedidos (uno por marca)**. Lo que tiene stock es **compra directa**: se paga en ese momento (pago simulado) y **reserva el stock**. Lo que supera el stock va a un **pedido por encargo** que la marca acepta (con fecha) antes de que el cliente lo pague.
4. **Cada marca ve solo su subpedido**, sin datos del comprador, y lo marca como **listo para recojo**.
5. **Admin recoge, entrega y cierra el pedido.** Al entregarse se calcula la comisión de cada marca.

**Es un prototipo funcional para el curso: no habrá ventas, compras ni envíos reales.** Debe demostrar cómo funcionaría todo el flujo, con datos ficticios. No hay pasarela de pago: el pago en el carrito es **simulado** (el admin también puede marcar "pagado" a mano) y los estados de recojo y entrega se simulan desde el panel del admin.

## Stack (decidido, no cambiar sin preguntar)

- **Next.js** (App Router) + **TypeScript**: un solo proyecto para las pantallas y la lógica del servidor
- **Tailwind CSS**: estilos, con los tokens de `docs/marca.md`
- **Supabase**: base de datos PostgreSQL, login (Auth) y fotos (Storage). Librería `@supabase/ssr`
- **Vercel** (plan Hobby, gratis): hosting de la app. Es de los creadores de Next.js. Supabase NO se aloja en Vercel
- **GitHub**: el repositorio. Vercel despliega solo cada vez que se sube un cambio a `main`

Variables de entorno (nunca en el código ni en el repo; van en `.env.local` y en Vercel → Settings → Environment Variables):
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` (Supabase también la llama "publishable key")
- `SUPABASE_SERVICE_ROLE_KEY`: solo se usa en el servidor, jamás en el navegador

Límites del plan gratis:
- El plan Hobby de Vercel es para uso personal y no comercial. Sirve mientras Surtiba sea un prototipo del curso; si algún día vende de verdad, hay que pasar a un plan pagado.
- Supabase gratis se pausa tras 7 días sin actividad (los datos no se pierden). Antes de una demo, hay que reactivarlo desde el panel.
- En Vercel no se guardan archivos en el servidor. Las fotos van a Supabase Storage.

## Seguridad (reglas fijas)

- **RLS activado en TODAS las tablas**, sin excepción. Tabla nueva = políticas nuevas en el mismo paso.
- **Todo cálculo de dinero, stock y comisión se hace en el servidor** (rutas del servidor o funciones de PostgreSQL). El navegador solo manda `producto_id` y `cajas`; nunca precios.
- **Las operaciones que tocan varias tablas van en una transacción** (crear pedido + reservar stock).
- **La marca nunca ve datos del comprador** (nombre, empresa, teléfono, dirección).
- **Sin sesión no se ven todos los precios:** se ve solo el precio "desde" (el del primer tramo).
- Después de crear o cambiar políticas RLS, **probarlas con usuarios de cada rol** y mostrarle a Mathias la prueba.

## Cómo trabajar con Mathias (MUY IMPORTANTE)

Mathias es estudiante de UTEC y está aprendiendo. No es desarrollador experto.

1. **Plan antes de código.** Antes de cada fase, propón un plan corto y espera su aprobación.
2. **Pasos pequeños.** Una funcionalidad a la vez. Al terminar cada paso, la app tiene que funcionar. Haz un commit con un mensaje claro en español.
3. **Explica lo que hiciste** al terminar cada paso, en lenguaje simple:
   - qué archivos creaste o cambiaste y para qué sirve cada uno (una línea por archivo)
   - cómo probarlo él mismo (qué abrir, dónde hacer clic, qué debería ver)
   - **una pregunta corta para comprobar que entendió**
4. **Respuestas cortas.** Las explicaciones largas lo pierden. Usa tablas o listas cuando ayuden.
5. **Si vas a agregar algo que no pidió, pregunta antes.** La decisión final es suya.
6. **Si algo puede salir mal** (un costo, un dato que se borra, una clave expuesta), avísale antes de hacerlo.

## Reglas fijas de negocio y contenido

- Toda la interfaz en **español de Perú**, tuteando. Montos en soles: `S/ 1,234.50`.
- **Nunca inventes datos reales:** ni marcas, ni clientes, ni testimonios, ni cifras de uso. Los datos de prueba llevan nombres claramente ficticios ("Marca Demo Pisco", "Catering Demo").
- El dinero se guarda en **céntimos (números enteros)**, nunca con decimales.
- Si una decisión de negocio no está en `docs/`, **pregunta**; no la inventes. Las decisiones pendientes están al final de `docs/producto.md`.

## Fases

| Fase | Qué | Lista cuando… |
|---|---|---|
| 0 | Proyecto base: Next.js + Tailwind + conexión a Supabase | La página de inicio carga en local y lee un dato de Supabase |
| 1 | Base de datos: tablas, relaciones, RLS y datos demo | Las tablas existen con datos demo y las reglas se probaron con cada rol |
| 2 | Login, roles y catálogo (precio "desde" sin sesión, escala completa con sesión) + **primer despliegue en Vercel** | Un visitante ve el precio "desde"; un comprador con sesión ve la escala; la app ya funciona en su URL pública |
| 3 | Carrito multimarca, envío del pedido con reserva de stock, favoritos, repetir pedido y seguimiento | Un pedido de 2 marcas crea 2 subpedidos con los precios correctos y descuenta stock |
| 4 | Panel de la marca: órdenes, listo para recojo, stock, precios y productos, sus números | La marca gestiona lo suyo y no ve nada del comprador ni de otras marcas |
| 5 | Panel del admin: marcas, pedidos, recojos y entregas, pagos manuales, métricas | Un pedido se puede llevar de "recibido" a "entregado" y la comisión se calcula |
| 6 | Cotizador de evento + cotización en PDF | Con invitados y horas, sugiere cajas, las pasa al carrito y descarga el PDF |
| 7 | Pedidos por encargo (aprobado el 13-oct-2026, va después de la fase 5) | Si piden más que el stock, la parte que falta queda "por encargo" y la marca la acepta o rechaza; lo que sí hay en stock sigue siendo compra directa |
| 8 | Pulido visual: animaciones, transiciones y avisos | La app se siente fluida sin romper docs/marca.md |

Si el tiempo no alcanza, la fase 6 es la que más se puede simplificar. Antes de recortarla, pregúntale a Mathias.

## Comandos

- `npm run dev`: correr en local (http://localhost:3000)
- `npm run build`: comprobar que compila antes de subir
- `npm run lint`: revisar errores
