# Actualizar el catálogo desde Chrome

Francisco acepta pedir la actualización cuando enciende la PC. No es necesario prometer ejecución con la computadora apagada.

## Lectura

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
