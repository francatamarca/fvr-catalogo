# Actualizar el catálogo desde Chrome

Francisco acepta pedir la actualización cuando enciende la PC. No es necesario prometer ejecución con la computadora apagada.

## Lectura

La disponibilidad cambió durante el 12/11. La publicación de las 01:27 ya no coincidía con la de las 11:35. Siempre hacer una lectura nueva; no reimportar un respaldo del mismo día como si fuera una revisión nueva.

Para conservar español y disponibilidad: leer los listados de la vista Paraguay `/es/` y tomar sus títulos, códigos y botones. Un botón deshabilitado o con etiqueta “no disponible” significa no disponible incluso sin cartel “Agotado”. La búsqueda también puede conservar una respuesta vieja hasta recargarla.

Selector de tarjetas verificado: `main div[aria-label^="Tarjeta de"]`. No omitir `div`: un botón de compra deshabilitado de una tarjeta de memoria también puede empezar con “Tarjeta de”. Comprobar la presencia de `h3`, código y control de compra.

Ordenar por “Nuevo”, leer 100 por página, esperar el texto de rango nuevo y reobservar antes de leer tarjetas. Guardar después de cada página. Los contadores del proveedor pueden quedar una unidad atrás de las tarjetas de la última página: registrar esa diferencia y comprobar que “Página siguiente” esté deshabilitada. Registrar y deduplicar códigos repetidos del proveedor; ante disponibilidad contradictoria detener la importación y comprobar el producto.

Conservar el archivo USD anterior con su hora real. Para nuevas referencias sin costo USD, usar la búsqueda pública de Brasil por código y guardar el precio USD observado. No convertir guaraníes ni asignar precios ficticios. `conciliar-stock-ui.mjs` combina stock y nombres ES con los USD observados; `importar-captura-ui.mjs` y `publish.mjs` aplican las reglas FVR y saneado. La página distingue la fecha de revisión de stock de la fecha de precios de referencia.

- Usar la pestaña normal abierta de Madrid Center con las herramientas de navegador disponibles. No lanzar perfiles automatizados para continuar desafíos anti-bots: ese método fue rechazado por la revisión automática.
- En la vista Brasil se muestran los USD de exportación. La vista Paraguay muestra guaraníes con IVA: no convertir ese precio a USD para alimentar el catálogo.
- Abrir `/categorias`, recorrer sus 21 categorías excepto Comestíveis, seleccionar 100 por página y usar los controles de paginación visibles.
- Activar botones con teclado Enter evita que el movimiento del contenido durante la carga termine abriendo una tarjeta.
- Leer sólo las tarjetas de la vista activa; la página mantiene otra copia oculta para móvil. Extraer código, nombre, marca, USD actual, USD anterior si se muestra tachado, imágenes y disponibilidad. Los agotados muestran Esgotado y no ofrecen Agregar.
- Guardar por lotes. Los scripts largos pueden agotar el tiempo de una llamada; trabajar con tres páginas por llamada y conservar un respaldo local fuera de este repositorio.
- Validar cantidad y códigos únicos de cada categoría contra el total visible. Un mismo código puede aparecer en más de una categoría; sus precios y disponibilidad deben coincidir.

Formato de captura: `capturado` ISO de la última lectura, `source`, `categoriesExpected` (21 nombres), `reports` con `{category,total,count}`, `next:null` al terminar y `rows` con `{codigo,titulo,marca,categoria,usd,oldUSD,available,href,imgs}`. Es un archivo privado con costos.

## Importar y publicar

1. Conservar una copia del `data/catalogo.json` anterior fuera del repositorio.
2. Ejecutar `node importar-captura-ui.mjs ruta/captura.json`. Para repetir una importación contra el mismo respaldo: `node importar-captura-ui.mjs ruta/captura.json ruta/respaldo-anterior.json`.
3. Ejecutar `node publish.mjs`. Verificar que no haya costos, stock interno ni datos AR privados en el gzip público.
4. Revisar códigos nuevos y retirados, clasificación de notebooks/tablets/celulares/PS5, exclusión de motos eléctricas y datos de peso pendientes.
5. Actualizar campañas desde los assets visibles de la portada. Revisar las imágenes para evitar precios de costo impresos o productos excluidos. Los botones deben buscar dentro de FVR.
6. Compilar y ejecutar verificaciones de catálogo, carrito y snapshot. Publicar sólo archivos explícitos; no agregar capturas privadas, respaldos ni imágenes de trabajo del usuario.
7. Esperar READY en Vercel y comprobar la página real, su fecha, cantidad y fichas. La fecha pública es la fecha de lectura del proveedor, no la hora de la compilación.

Las tarifas de envío guardadas en `data/envios.json` tienen su propia fecha. Una lectura de productos no representa una nueva cotización del transportista.

## Reglas FVR y tarifas nacionales (12/11/2026)

- Para cambiar únicamente reglas comerciales, respaldar el catálogo privado y ejecutar `node recalcular-precios.mjs ruta/captura-conciliada.json`. Conserva las fechas originales de proveedor y stock. Después ejecutar `node publish.mjs` y los verificadores.
- iPhone 18: USD del proveedor +150 total; iPhone 17 mantiene +80 total. Microondas: recargo adicional +20 después del porcentaje. Los demás importes fijos permanecen iguales.
- Para renovar Vía Cargo, leer el formulario oficial en Chrome normal. Referencia: Puerto Iguazú → San Salvador de Jujuy, un bulto, declarado ARS100.000 y pago en destino. Registrar los 14 pesos (1/2/3/5/7/10/12/15/20/25/30/40/50/60), medidas y texto visible con hora real. No ejecutar el cotizador legado con un navegador automatizado en esta sesión.
- Con la captura completa y una cotización pública USDT actual: `node importar-envios-verificados.mjs captura-via-cargo.json cotizacion-usdt.json`. El importador verifica condiciones, los 14 tramos, evidencia y antigüedad máxima de 24 horas. Domicilio / USDT +5; sólo a falta de domicilio, agencia / USDT +10; redondeo hacia arriba.
- El formulario usa decimales con punto: `65999.99` son ARS65.999,99. No quitar ese punto ni interpretar una tarifa con centavos como un valor centinela de millones.
- Corrección de compactos: que volumen/5000 supere al peso real no basta para bloquear. Vía Cargo verificó Garmin3kg35×25×20cm a ARS30.000; batería0,9kg25×13×8cm a ARS30.000; ambos en caja35×25×28cm3,9kg a ARS30.000. La caja50×40×25cm5kg (50.000cm³) da ARS33.000, igual al tramo10kg. Para volumen dominante se calcula automáticamente mientras la suma de volúmenes generales no supere50.000cm³; por encima se cotiza por medidas. El divisor5.000 es una estimación dentro de este rango, no una fórmula oficial universal: caja50×50×50cm5kg dio ARS89.999,99. Un bulto >50kg sigue a confirmar y total>60kg a cotizar.
- Capturar peso y dimensiones de las fichas es una fase distinta de leer listados de stock. Sin ambos datos, el importador conserva `null`; no asignar pesos por el nombre o la foto. La UI indica el dato faltante. `incorporar-medidas-verificadas.mjs captura.json` incorpora medidas cuando peso/volumen coinciden con el respaldo; se preservan en posteriores importaciones. Ejecutar también `verificar-envios-compactos.mjs`.
- Ejecutar `node verificar-recargos-envios.mjs ruta/catalogo-anterior.json` y `node verificar-publicacion.mjs ruta/captura-conciliada.json`, compilar, publicar y verificar el dominio real. Los precios guardados del pedido se actualizan con la nueva publicación.

## Beneficio por envío incluido liviano (regla posterior del 12/11)

Un producto con tarifa fija cuyo peso real conocido y peso para envío sean menores a10kg habilita10kg bonificados para agregar generales, aunque éstos no lleguen a500USD. Se suma el peso de sus unidades al de los generales; hasta10kg total gratis y, sobre10kg, diferencia entre el tramo total y el tramo10kg. Fijos de10kg o más conservan su envío incluido y no habilitan este beneficio. Sin peso conocido, no asumir que califica.

Si los generales ya alcanzan500USD, se conserva su beneficio anterior y su peso se calcula aparte de los productos con logística fija. Así la regla nueva nunca quita una bonificación ya obtenida. El mayorista1000USD sigue contando únicamente generales. Los límites de volumen, peso y datos faltantes permanecen. Probar con `node verificar-envio-incluido-combinado.mjs`.
