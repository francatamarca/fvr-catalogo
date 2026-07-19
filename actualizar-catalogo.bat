@echo off
REM ==== Actualizacion diaria del catalogo FVR ====
REM Sincroniza Madrid Center -> compara precios AR -> publica version saneada -> sube a GitHub.
REM La web (catalogo.fvrlogistica.com.ar) la refleja sola en ~30 min.

cd /d "C:\Users\frann\Documents\FVR CLAUDE\fvr-catalogo"
echo ==== %date% %time% ==== >> sync-diario.log

echo [1/5] Sincronizando catalogo desde Madrid Center...
node sync.mjs --full >> sync-diario.log 2>&1
if errorlevel 1 goto :error

echo [2/5] Comparando precios contra Argentina (Naldo/OnCity/Cetrogar)...
node compare-ar.mjs >> sync-diario.log 2>&1
if errorlevel 1 echo (comparacion AR fallo, sigo con el resto) >> sync-diario.log

echo [2b/5] Cotizando envios en Via Cargo (tabla por peso)...
node cotizar-envios.mjs >> sync-diario.log 2>&1
if errorlevel 1 echo (cotizacion Via Cargo fallo, se usa la tabla anterior) >> sync-diario.log

echo [3/5] Generando version publica (sin costo)...
node publish.mjs >> sync-diario.log 2>&1
if errorlevel 1 goto :error

echo [4/5] Subiendo a GitHub...
git add data/catalogo.public.json.gz >> sync-diario.log 2>&1
git commit -m "actualizacion diaria del catalogo" >> sync-diario.log 2>&1
git push origin main >> sync-diario.log 2>&1

echo [5/5] Listo. La web se actualiza sola en ~30 min. >> sync-diario.log
exit /b 0

:error
echo ERROR durante la actualizacion, ver sync-diario.log >> sync-diario.log
exit /b 1
