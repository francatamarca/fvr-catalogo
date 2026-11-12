# FVR Catálogo

Web-catálogo que espeja el catálogo público de Madrid Center (Ciudad del Este, PY), con precios FVR en USDT y cotización en vivo. Incluye consulta directa por WhatsApp de FVR.

## Arquitectura
- **Web:** Next.js en Vercel. Lee el catálogo público (saneado) desde GitHub y lo revalida cada 30 min.
- **Sync (nube):** GitHub Actions está programado para ejecutar `sync.mjs --full` todos los días a las 14:00 de Argentina. El 30/07/2026 se confirmó una sincronización completa con 10.194 productos desde la PC. El proveedor respondió HTTP 403 a las consultas HTTP estándar de este entorno, y no hay ejecuciones registradas del flujo de GitHub en esta configuración. Hasta que Madrid Center habilite una vía oficial de automatización (por ejemplo, credenciales de API o permiso de acceso para el runner), cada intento se detendrá y conservará la última publicación; no se resolverán ni eludirán sus controles anti-bots.
- **Publicación:** `publish.mjs` genera `data/catalogo.public.json.gz` **sin el precio de costo** (lo único que se sube a GitHub).
- **Despliegue:** el cambio del archivo público activa el despliegue conectado de Vercel. La tarea valida la lectura completa y rechaza catálogos vacíos, incompletos o duplicados antes de reemplazar la versión publicada.
- **Estado:** cada ejecución queda visible en la pestaña Actions del repositorio; los fallos no actualizan el catálogo y el sitio conserva la fecha de la última actualización correcta.

## Actualización diaria
La programación vive en `.github/workflows/catalogo-diario.yml` y está configurada para las 14:00 con la zona `America/Argentina/Buenos_Aires`; GitHub puede demorarla o dejarla en cola durante períodos de alta carga. El cron no garantiza una publicación correcta mientras la API rechace al runner. También se puede iniciar manualmente desde Actions → “Actualizar catálogo FVR” → “Run workflow”. El repositorio es público, por lo que GitHub documenta que no factura minutos de Actions en runners hospedados.

Manual:
```
node sync.mjs --full   # trae todo el catálogo disponible por API (menos comestibles)
node publish.mjs        # valida y genera la versión pública saneada
```

## Reglas de precio (ajustables en config.mjs / pricing.mjs)
- General: +35%; +25% para productos de más de US$1000 y menos de 10 kg. El envío nacional se calcula por peso con la tabla vigente de `data/envios.json`.
- Notebooks/Tablets (fijo por unidad, envío incluido): <500→+110, 500-1000→+130, 1000-2000→+150, >2000→+200.
- Celulares: +50 (Apple o >600 → +70).
- En pedidos desde US$500: hasta 10 kg de envío bonificado. En pedidos desde US$1000, los artículos generales pasan de +35% a +25% (sin descuento doble en productos que ya tienen margen +25%).
- Piso por categoría oculta productos que no le ganan a Argentina (notebooks <150, tablets <180, celus <60).
- Reacondicionados: se muestran etiquetados.

## Seguridad
`data/catalogo.json` (con costo) está en `.gitignore` y NUNCA se sube. Solo se publica la versión saneada.
