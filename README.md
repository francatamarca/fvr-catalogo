# FVR Catálogo

Catálogo de Madrid Center con reglas de precio FVR, pedidos por WhatsApp y cotización USDT/ARS. La publicación contiene sólo precios de venta FVR.

## Actualización manual que funciona con la PC encendida

El 12/11/2026 se leyó el catálogo desde los listados públicos visibles de Chrome: **13.355 filas de 21 categorías, equivalentes a 13.003 códigos únicos**. La lectura distingue disponibles y agotados y valida cada total de categoría. Ver [ACTUALIZACION-MANUAL.md](ACTUALIZACION-MANUAL.md).

1. Leer los listados públicos completos en el navegador y guardar la captura fuera del repositorio.
2. Ejecutar `node importar-captura-ui.mjs ruta/captura.json` y `node publish.mjs`.
3. Guardar en Git únicamente el archivo saneado `data/catalogo.public.json.gz`, las campañas públicas y los cambios de código necesarios.
4. Publicar en Vercel y comprobar fecha, cantidad, novedades, búsqueda, ficha y pedido en el dominio de producción.

La fecha que muestra la web corresponde a la lectura del proveedor; volver a importar no cambia artificialmente esa fecha. Los pesos y las dimensiones conocidos se conservan por SKU. Los productos generales que no tienen datos de peso se muestran con **envío a confirmar**; no se supone que pesen 1 kg ni se promete envío gratis sobre ese supuesto.

## API

La web renovada utiliza `/bff/main/api/v4/productos/buscar`; `sync.mjs` fue migrado de v3 a v4. Las consultas HTTP estándar actuales reciben 403 con un desafío de Cloudflare. Eso no demuestra que sea necesaria una clave oficial nueva. No se ejecutan técnicas de evasión ni se resuelven desafíos automáticamente. El flujo de GitHub queda disponible para ejecución manual; se retiró la programación diaria que no podía completar la descarga.

## Publicación consistente

La portada y las fichas leen el snapshot saneado **incluido en su propio despliegue**. Ya no dependen de que una caché de GitHub Raw se actualice. `next.config.mjs` incluye el snapshot en las funciones de las fichas. `CATALOGO_URL` sólo habilita una fuente remota si se configura expresamente.

Los pedidos guardados se revisan contra los precios y la disponibilidad de la publicación vigente: se conservan cantidades, se actualizan precios y se retiran SKU que ya no están publicados.

## Campañas y diseño

`data/campanas.json` registra las campañas visibles del proveedor y sus fuentes. Las imágenes se guardan en `public/campanas/`. El carrusel y los accesos conducen a búsquedas dentro de FVR. No se usan campañas que exhiban costos del proveedor ni productos excluidos, como motos eléctricas.

## Reglas de precio

- General: +35%; +25% para productos de más de US$1000 con peso conocido inferior a 10 kg.
- Notebooks y tablets: logística fija de +110, +130, +150 o +200 según el costo del producto.
- Celulares: +50; Apple o costo mayor a US$600: +70.
- Consolas PS5: logística fija de +110.
- Compra mínima US$250. Envío bonificado desde US$500 sujeto al peso; margen por mayor desde US$1000 en artículos generales.
- Se mantienen pisos de precio, etiquetas de reacondicionado, exclusiones especiales y límite de peso conocido de 60 kg.

## Datos privados

`data/catalogo.json`, las capturas del proveedor y sus respaldos contienen costos y nunca se suben. `publish.mjs` rechaza campos internos en la versión pública y escribe el gzip de forma atómica.
