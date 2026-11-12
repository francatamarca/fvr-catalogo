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
