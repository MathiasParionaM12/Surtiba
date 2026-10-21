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
| Dinero | Precios, stock y comisiones se calculan en el servidor. El navegador solo manda `producto_id` y `cajas` |
| Contraseñas | Las maneja Supabase Auth, nunca nuestras tablas. Regla: mínimo 8 caracteres, con letras y números (`lib/acciones-auth.ts` y el panel de Supabase) |
| Registro | Si el correo ya existe, el mensaje es genérico: no confirma qué correos están registrados. El de ingreso dice "Correo o contraseña incorrectos" |
| Cabeceras | `next.config.ts`: X-Frame-Options DENY, nosniff, Referrer-Policy, Permissions-Policy y una CSP en modo solo reporte |
| Claves | Ninguna en el repo. `SUPABASE_SERVICE_ROLE_KEY` no se usa |

## Riesgos aceptados (decididos)

- **Supuestos del cotizador visibles** (`parametros_cotizador` lo lee cualquiera). El mini-cotizador de la portada y el ejemplo de `/cotizador` calculan en el navegador. Son supuestos de negocio, no datos de clientes, y para cerrarlos habría que mover esos cálculos al servidor. Se revisa si Surtiba deja de ser prototipo.
- **22 funciones `SECURITY DEFINER` ejecutables por usuarios con sesión** (aviso del advisor de Supabase). Es el patrón intencional: cada una valida el rol adentro. Ninguna la puede ejecutar un visitante. Las de `privado` que un visitante sí puede ejecutar (`es_admin`, `mi_rol`, `mi_marca_id`, `marca_activa`) las usan las reglas RLS y la vista del catálogo: **no quitarles EXECUTE**.
- **"Confirm email" apagado** mientras haya testers: el correo gratis de Supabase manda muy pocos correos por hora. Activarlo cuando haya un servidor de correo propio (SMTP).
- **Bucket `productos` público de lectura**: son las fotos del catálogo. La subida limita a cada marca a su carpeta.

## Pendiente (en el panel de Supabase, lo hace Mathias)

Authentication en https://supabase.com/dashboard:
1. **Sign In / Providers → Email**:
   - *Minimum password length* = 8
   - *Password requirements* = letras y números
2. **Attack Protection → Leaked password protection**: activar. Si sale bloqueado (puede ser solo de pago), queda anotado aquí.
3. **Rate Limits**: revisar que estén los valores por defecto, que ya frenan la fuerza bruta.

## Opcional: CAPTCHA (Cloudflare Turnstile, gratis)

Frena bots que prueban contraseñas o crean cuentas en masa. Pasos:
1. Mathias crea una cuenta en Cloudflare y un sitio Turnstile para `surtiba.vercel.app` y `localhost`.
2. La clave pública va en Vercel y en `.env.local` como `NEXT_PUBLIC_TURNSTILE_SITE_KEY`.
3. Se programa el widget en `/ingresar`, `/registro` y `/registro/vender`, y se manda el token con `options.captchaToken`.
4. **Recién después**, la clave secreta va en Supabase → Attack Protection → Captcha. Si se activa antes, nadie puede ingresar.

## Cómo pasar la CSP a obligatoria

Abre la app con la consola del navegador (F12) y recorre las pantallas de cada rol. Si no aparece ningún aviso de "Content Security Policy", en `next.config.ts` cambia `Content-Security-Policy-Report-Only` por `Content-Security-Policy`.
