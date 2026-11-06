# Prompt maestro: investigación para mejorar el cotizador de eventos de Surtiba

> Cómo usarlo: pégalo completo en Claude (claude.ai) con la **Investigación** activada. Cuando te entregue el informe, pásaselo a Claude Code para evaluar qué cambiar en el cotizador.

---

## Tu rol

Eres un investigador de mercado y operaciones de eventos, con experiencia en catering y bebidas. Vas a estudiar **cómo trabajan de verdad** los profesionales que organizan eventos en **Lima, Perú**, sobre todo en cómo calculan, compran y gestionan las **bebidas alcohólicas**, para mejorar una herramienta que ya existe: el cotizador de eventos de Surtiba.

No quiero un informe genérico. Quiero saber qué hacemos **bien**, qué hacemos **mal** y qué **nos falta**, con cifras y fuentes.

## Qué es Surtiba (contexto)

- Marketplace B2B **gestionado** en Lima: conecta **marcas peruanas de licores y cócteles** (pisco, ron, vino, espumante, cócteles listos, etc.) con **caterings, wedding planners, organizadores de eventos y bares/restaurantes**, que compran **por cajas**.
- El comprador le compra a Surtiba, no a cada marca. Surtiba recoge en cada marca y entrega todo junto.
- Reglas actuales: pedido mínimo de **3 cajas** en total; precios por volumen (más cajas, mejor precio por caja); entregas **martes y jueves** con 2 días de anticipación; envío fijo por zona; lo que no hay en stock se puede pedir **por encargo**.
- Es un prototipo de un curso universitario (UTEC), pero queremos que el cotizador sea útil de verdad para un catering real.

## Cómo funciona hoy el cotizador (lo que tienes que evaluar)

El comprador llena 3 pasos y el cotizador le dice **cuántos tragos, cuántas cajas de cada producto y cuánto cuesta**, y le baja una cotización en PDF.

**Paso 1 · Tu evento**
- Tipo de evento (llena valores típicos), nombre y fecha (opcionales), invitados, **cuántos no toman alcohol**, hora de inicio, duración, interior o aire libre/verano, y **"¿Cómo es tu público?"** (toma poco / normal / toma bastante).
- **Momentos del evento**, uno tras otro: **bienvenida** (cóctel de recepción), **cena con vino**, **brindis** (espumante) y **fiesta** (barra libre con las horas que quedan).

**Paso 2 · Barra**
- El comprador elige los tragos de un recetario de 25 (Pisco sour, Chilcano, Maracuyá sour, Algarrobina, Capitán, Machu Picchu, Cuba libre, Mojito, Daiquiri, Piña colada, Gin tonic, Negroni, Vodka tonic, Vodka con jugo, Cosmopolitan, Margarita, Aperol spritz, Mimosa, Sangría, Tinto de verano, Whisky con soda, Copa de vino, Copa de espumante, Cóctel listo, Pisco tonic) o crea los suyos con sus ingredientes.
- Cada trago se marca como **principal (peso 3), secundario (2) u ocasional (1)**: así se reparte la fiesta entre los tragos.
- **"¿Pedimos un poco extra por si acaso?"**: lo justo, +10 % (sugerido) o +20 %.

**Paso 3 · Resultado**
- Tragos por momento, costo total y por invitado, ingredientes sumados, **cajas por producto** (redondeadas hacia arriba) y **"Lo consigues por tu cuenta"** (hielo, agua, gaseosas y lo que Surtiba no vende).

**Supuestos actuales (los números que más quiero que valides):**

| Supuesto | Valor actual |
|---|---|
| Invitados que no toman alcohol | 20 % |
| Bienvenida | 2 tragos por persona que toma, por hora |
| Fiesta, primera hora | 1.5 tragos por persona por hora |
| Fiesta, horas siguientes | 1 trago por persona por hora |
| Cena | 1 copa de vino por persona por hora |
| Brindis | 1 copa de espumante por persona |
| Público "toma poco" / "normal" / "toma bastante" | ×0.75 / ×1 / ×1.3 |
| Evento de día | ×0.85 |
| Hielo | 0.25 kg por persona por hora (×1.4 con calor o aire libre) |
| Agua y gaseosas para tomar solas | 0.2 L/hora por quien toma alcohol; 0.5 L/hora por quien no toma |
| Margen "por si acaso" | 10 % sugerido |
| Recetas (ejemplos) | Pisco sour 90 ml de pisco · Chilcano 60 ml de pisco · Cuba libre 50 ml de ron · Gin tonic 50 ml de gin · Copa de vino 150 ml · Copa de espumante 125 ml |

**Tipos de evento y valores típicos:**

| Tipo | Horas | Público | Momentos |
|---|---|---|---|
| Boda | 6 | Normal | Bienvenida 1 h, cena 1.5 h, brindis, fiesta |
| Evento corporativo | 4 | Toma poco | Bienvenida 1 h, cena 1 h, fiesta |
| Cumpleaños o fiesta | 5 | Toma bastante | Solo fiesta |
| Cóctel o lanzamiento | 3 | Toma poco | Brindis y fiesta |

## Qué quiero que investigues

### A. Cómo trabaja cada segmento (Lima primero; otros países solo como referencia, marcándolo)
Para **caterings**, **wedding planners**, **organizadores de eventos corporativos** y **bares/restaurantes que hacen eventos**:
1. **Cómo calculan hoy las bebidas** de un evento: reglas prácticas, plantillas, Excel, apps, experiencia del bartender. ¿Calculan por persona, por hora, por botella, por tipo de evento?
2. **Quién compra el licor**: ¿el catering, el planner o el cliente final? ¿Qué es el **descorche** y cómo cambia la compra? ¿Qué tan común es en Lima?
3. **Barra libre vs. por consumo vs. paquetes cerrados** (ej. "paquete de barra por invitado").
4. **Botellas sobrantes**: ¿se devuelven, hay consignación, quién se las queda? ¿Les sirve pedir de más o les duele?
5. **Cómo cotizan al cliente final**: ¿precio por invitado? ¿Qué margen le ponen al licor? ¿Qué incluye (bartender, cristalería, hielo, mezcladores)?
6. **Tiempos**: ¿con cuánta anticipación compran? ¿Cuándo se confirma el número final de invitados? ¿Compran todo de una vez o en partes?
7. **Qué les duele hoy** al conseguir licor (precio, stock, entregas, facturas, crédito, mínimos, devoluciones, falta de cajas completas).

### B. Validar los supuestos del cotizador
Para **cada fila** de la tabla de supuestos, busca valores de referencia (guías de catering, asociaciones de eventos, proveedores de bebidas, bartenders, estudios de consumo). Dime si el nuestro está **bien, alto o bajo**, con la fuente. Pon atención especial a:
- Consumo real por hora en **bodas peruanas** (la "hora loca", el pisco sour de bienvenida, el brindis con espumante).
- Diferencias reales entre **tipos de evento** (corporativo, boda, quinceañero, cumpleaños, lanzamiento) y **horario** (día/noche).
- Si el **20 % que no toma** es realista en Lima.
- Medidas reales de los tragos peruanos (pisco sour, chilcano, algarrobina) en eventos.
- **Hielo y agua**: cuánto se usa de verdad en eventos en Lima, en verano y en invierno.
- **Merma, rotura y "botellas que desaparecen"**: cuánto margen ponen los profesionales.

### C. ¿Qué le falta o le sobra al cotizador?
- ¿Qué datos piden los profesionales que nosotros **no** pedimos? (ej. presupuesto por invitado, si hay descorche, si el cliente pone parte del licor, duración de la barra libre, horario de cierre de la barra, tipo de público por edad).
- ¿Qué preguntamos que **no les importa** o que les cuesta responder?
- ¿El resultado que les damos (tragos, cajas, costo, PDF) es lo que necesitan para cotizarle a su cliente? ¿Qué agregarían (precio por invitado para revender, desglose para el cliente final, lista de compras, cristalería, personal)?
- ¿Cómo debería verse una cotización de bebidas que un catering le **reenviaría** a su cliente?

### D. Referentes
Busca herramientas parecidas (calculadoras de bebidas para eventos, software de catering, marketplaces B2B de bebidas en Latinoamérica o España) y dime qué hacen bien que podamos copiar, y qué hacen mal.

## Reglas
- **Cita la fuente de cada cifra** con su enlace. Si no encuentras fuente, dilo; **no inventes números**.
- Distingue **dato** (con fuente) de **práctica común** (varias fuentes coinciden) y de **opinión tuya**.
- Pon un **nivel de confianza** (alto / medio / bajo) a cada conclusión.
- Prioriza **Perú y Lima**; usa otros países solo como referencia y márcalo.
- No inventes nombres de empresas, testimonios ni casos. Si citas a una empresa real, que sea con su fuente.
- Escribe en **español de Perú**, claro y directo.

## Formato del informe (respétalo: lo voy a procesar después)

1. **Resumen en 10 puntos**: lo más importante que encontraste.
2. **Cómo trabaja cada segmento**: una sección por segmento con los 7 puntos de la parte A.
3. **Tabla de supuestos**: `Supuesto | Valor actual | Valor de referencia | Fuente | Veredicto (bien/alto/bajo) | Confianza | Recomendación`.
4. **Problemas del cotizador**: lista de lo que está mal o confunde, con el porqué.
5. **Mejoras propuestas, priorizadas**: tabla `Mejora | Problema que resuelve | Impacto (alto/medio/bajo) | Esfuerzo estimado (alto/medio/bajo) | Evidencia`.
6. **Datos que deberíamos pedir y datos que deberíamos quitar**.
7. **Preguntas para entrevistar a 5 caterings o planners reales** en Lima, para validar lo que la investigación no pudo confirmar.
8. **Fuentes**: lista con enlaces.
