# FVR Catálogo

Web-catálogo que espeja el catálogo de Madrid Center (Ciudad del Este, PY) con precios FVR automáticos, en USDT con cotización en vivo. Sin datos de contacto (para revendedores).

## Arquitectura
- **Web:** Next.js en Vercel. Lee el catálogo público (saneado) desde GitHub y lo revalida cada 30 min.
- **Sync (PC):** `sync.mjs` usa el Chrome real vía puppeteer-core para pasar Cloudflare, aplica el motor de precios (`pricing.mjs` + `config.mjs`) y escribe `data/catalogo.json`.
- **Publicación:** `publish.mjs` genera `data/catalogo.public.json.gz` **sin el precio de costo** (lo único que se sube a GitHub).

## Actualización diaria
Programar `actualizar-catalogo.bat` en el Programador de tareas de Windows (1×/día). Hace: sync → publish → git push. La web se actualiza sola.

Manual:
```
node sync.mjs --full   # trae todo Madrid Center (menos comestibles)
node publish.mjs        # genera la versión pública saneada
git add data/catalogo.public.json.gz && git commit -m "update" && git push
```

## Reglas de precio (ajustables en config.mjs / pricing.mjs)
- General: +35% + flete por peso (18/25/30 USD; >15kg a consultar). Envío gratis ≥ US$400.
- Notebooks/Tablets (fijo por unidad, envío incluido): <500→+110, 500-1000→+130, 1000-2000→+150, >2000→+200.
- Celulares: +50 (Apple o >600 → +70).
- Piso por categoría oculta productos que no le ganan a Argentina (notebooks <150, tablets <180, celus <60).
- Reacondicionados: se muestran etiquetados.

## Seguridad
`data/catalogo.json` (con costo) está en `.gitignore` y NUNCA se sube. Solo se publica la versión saneada.
