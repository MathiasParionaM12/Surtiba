# Seguridad de Surtiba

Estado al 21-oct-2026, después de la auditoría de seguridad. Veredicto: sin huecos críticos. Lo de abajo es endurecimiento.

## Lo que protege la app

| Capa | Qué hace |
|---|---|
| RLS | Activado en todas las tablas. Cada rol ve solo lo suyo. La marca nunca ve datos del comprador |
| Escrituras | Pedidos, subpedidos, ítems, cotizaciones y solicitudes no tienen INSERT/UPDATE/DELETE directo. Se escriben solo con funciones `SECURITY DEFINER` que validan rol y propiedad adentro (`SET search_path TO ''`) |
| Rol | Lo asigna siempre el servidor (trigger `privado.crear_perfil()`). A `marca` solo con `aprobar_solicitud` (admin); a `admin` solo a mano en la base |
| Candado del rol | Trigger `perfiles_proteger_rol` (`supabase/sql/23_candado_rol.sql`): aunque algún día se diera un permiso amplio, nadie se cambia el rol ni la marca salvo el admin |
| Permisos por columna | En `perfiles` el usuario solo edita nombre, empresa, RUC, tipo de negocio y WhatsApp. En `productos` el stock no se edita directo |
| Vistas | `catalogo_publico` y `carrito_detalle` con `security_invoker = true` |
| Dinero | Precios, stock y comisiones se calculan en el servidor. El navegador solo manda `producto_id` y `cajas`. Única excepción: en "Tu precio para el cliente" del cotizador, el comprador escribe **sus propios** costos y su % de ganancia; no son precios de Surtiba, no tocan pedidos y el servidor los revisa (enteros en rango) y hace la cuenta |
| Contraseñas | Las maneja Supabase Auth, nunca nuestras tablas. Regla: mínimo 8 caracteres, con letras y números (`lib/acciones-auth.ts` y el panel de Supabase) |
| Registro | Si el correo ya existe, el mensaje es genérico: no confirma qué correos están registrados. El de ingreso dice "Correo o contraseña incorrectos" |
| Cabeceras | `next.config.ts`: X-Frame-Options DENY, nosniff, Referrer-Policy, Permissions-Policy y una CSP en modo solo reporte |
| Claves | Ninguna en el repo. `SUPABASE_SERVICE_ROLE_KEY` no se usa |

## Analítica (21-oct-2026)

- **Vercel Web Analytics** (`@vercel/analytics` en `app/layout.tsx`): visitas y páginas, sin cookies ni datos personales. Se activa en Vercel → proyecto → Analytics.
- **Eventos propios** (tabla `eventos`): vio un producto, agregó al carrito, empezó a pedir. Cualquiera registra con `registrar_evento` (sin poder inventar tipos ni hacerse pasar por otro); solo el admin los lee.
- **Vercel Speed Insights** (`@vercel/speed-insights` 2.0.0, 8-nov-2026): velocidad de carga real, sin cookies. `/sitemap.xml` y `/robots.txt` dejan fuera de Google los paneles, el carrito y los pedidos.
- **Actividad** (9-nov-2026, `49_actividad.sql`, Admin → Actividad): últimas cuentas creadas, último ingreso de cada cuenta (de `auth.users.last_sign_in_at`, sin correos ni IP) y productos vistos por día. Solo el admin (probado con comprador y visitante). La ubicación es solo el distrito que el comprador puso en su perfil; no se pide la ubicación del dispositivo (la Ley 29733 pide aviso y consentimiento). El país y el dispositivo de los visitantes están en Vercel Analytics, sin datos personales.
- **Calificaciones** (8-nov-2026): anónimas. `comprador_id` no tiene permiso de lectura para nadie; probado con comprador, otro comprador, marca, visitante y admin.
- **Microsoft Clarity, GA4 y píxeles**: no se usan (grabaciones y cookies piden aviso y consentimiento, Ley 29733).

## Hallazgo del 5-nov-2026: permisos por columna
Supabase da `INSERT/UPDATE/DELETE` sobre la **tabla entera** a `authenticated` (y a veces a `anon`), y eso **anula** los permisos por columna: `information_schema.column_privileges` lista todas las columnas aunque nadie las haya dado una por una. Lo que de verdad protege es RLS (si no hay regla de escritura, nadie escribe).
- En `productos` sí importaba: la marca podía cambiar `revision` y aprobarse sola. Se arregló con `revoke insert, update, delete` y solo `grant update (stock_cajas, foto_url)` (`39_revision_productos.sql`).
- Revisado el resto: `perfiles` y `avisos` ya estaban bien; carrito, favoritos y escalas_precio no tienen columnas delicadas; las demás solo las escribe el admin.
- **Regla:** al agregar una columna que el usuario no debe tocar en una tabla con regla de escritura, revisar `table_privileges` (no solo `column_privileges`) y probar con el rol.

## Documentos de las marcas y retroalimentación (10-nov-2026)

- **Bucket privado `documentos`** (registros sanitarios y otros, PDF o imagen, 10 MB): cada cuenta sube, ve y borra solo su carpeta (`<su id>/...`); el admin ve todas. Se abren con enlaces firmados que vencen en 1 hora. Los compradores nunca los ven.
- **Tabla `retroalimentacion`**: RLS activado. Cada cuenta inserta solo a su nombre (`perfil_id` lo pone la base) y, si menciona una cotización, tiene que ser suya. Lee solo el autor y el admin. Probado: el comprador inserta la suya, no puede firmar como otro, otro comprador y la marca ven 0, el admin ve todas y el visitante queda bloqueado.

## Riesgos aceptados (decididos)

- **Supuestos del cotizador visibles** (`parametros_cotizador` lo lee cualquiera). El mini-cotizador de la portada y el ejemplo de `/cotizador` calculan en el navegador. Son supuestos de negocio, no datos de clientes, y para cerrarlos habría que mover esos cálculos al servidor. Se revisa si Surtiba deja de ser prototipo.
- **Unas 33 funciones `SECURITY DEFINER` ejecutables por usuarios con sesión** (al 6-nov: las del admin, las de la marca, `marca_insights`, `admin_insights`, `perfil_guardar_foto`, `registrar_reclamo`, `admin_responder_reclamo`, `admin_guardar_envio`, `admin_revisar_producto`, `admin_recoger_marca` y `admin_guardar_entregas`; se borraron `marca_guardar_minimo`, `agregar_reemplazo` y `admin_fijar_recojo`) (aviso del advisor de Supabase). Es el patrón intencional: cada una valida el rol adentro. Ninguna la puede ejecutar un visitante. Las de `privado` que un visitante sí puede ejecutar (`es_admin`, `mi_rol`, `mi_marca_id`, `marca_activa`) las usan las reglas RLS y la vista del catálogo: **no quitarles EXECUTE**.
- **`registrar_reclamo` la puede llamar un visitante** (22-oct-2026): la norma pide que cualquiera pueda reclamar sin cuenta. Frenos: máximo 3 hojas por documento al día y 20 por minuto en total, y largos máximos en cada campo. El visitante no puede leer ninguna hoja (ni la suya: la ve solo en pantalla al registrarla).
- **`registrar_evento` la puede llamar un visitante** (aviso del advisor): es a propósito, para medir el embudo. Solo acepta 3 tipos y la base pone el perfil; lo peor que alguien puede hacer es inflar los conteos del embudo. Si pasa, se agrega un límite por minuto.
- **"Confirm email" apagado** mientras haya testers: el correo gratis de Supabase manda muy pocos correos por hora. Activarlo cuando haya un servidor de correo propio (SMTP).
- **Bucket `productos` público de lectura**: son las fotos del catálogo. La subida limita a cada marca a su carpeta.
- **Bucket `perfiles` privado** (22-oct-2026): fotos de perfil de los compradores, que son un dato personal. Cada uno solo toca su carpeta; el admin las ve; la marca nunca. Se muestran con enlaces firmados de 1 hora y sin la optimización de imágenes de Vercel, para que no queden copias. Probado por rol.
- **Cambiar contraseña** (22-oct-2026) pide la actual: si alguien deja su sesión abierta, otra persona no puede cambiarla.
- **No se guardan tarjetas ni métodos de pago**: el pago es simulado y guardar números de tarjeta exigiría cumplir PCI.

## Pendiente (en el panel de Supabase, lo hace Mathias)

Authentication en https://supabase.com/dashboard:
1. **Sign In / Providers → Email**:
   - *Minimum password length* = 8
   - *Password requirements* = letras y números
2. **Attack Protection → Leaked password protection**: activar. Al 21-oct el advisor la sigue marcando como apagada después de que Mathias revisó el panel: es probable que sea solo del plan de pago. Queda como pendiente aceptado.
3. **Rate Limits**: revisar que estén los valores por defecto, que ya frenan la fuerza bruta.

## Opcional: CAPTCHA (Cloudflare Turnstile, gratis)

Frena bots que prueban contraseñas o crean cuentas en masa. Pasos:
1. Mathias crea una cuenta en Cloudflare y un sitio Turnstile para `surtiba.vercel.app` y `localhost`.
2. La clave pública va en Vercel y en `.env.local` como `NEXT_PUBLIC_TURNSTILE_SITE_KEY`.
3. Se programa el widget en `/ingresar`, `/registro` y `/registro/vender`, y se manda el token con `options.captchaToken`.
4. **Recién después**, la clave secreta va en Supabase → Attack Protection → Captcha. Si se activa antes, nadie puede ingresar.

## Cómo pasar la CSP a obligatoria

Abre la app con la consola del navegador (F12) y recorre las pantallas de cada rol. Si no aparece ningún aviso de "Content Security Policy", en `next.config.ts` cambia `Content-Security-Policy-Report-Only` por `Content-Security-Policy`.
