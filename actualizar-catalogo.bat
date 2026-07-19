@echo off
REM ==== Actualización diaria del catálogo FVR ====
REM Programar en el Programador de tareas de Windows (1 vez al día).
REM Sincroniza Madrid Center -> genera precios FVR -> publica versión saneada -> sube a GitHub.
REM La web (Vercel) la refleja sola en ~30 min.

cd /d "C:\Users\frann\Documents\FVR CLAUDE\fvr-catalogo"

echo [1/4] Sincronizando catalogo desde Madrid Center...
node sync.mjs --full
if errorlevel 1 goto :error

echo [2/4] Generando version publica (sin costo)...
node publish.mjs
if errorlevel 1 goto :error

echo [3/4] Subiendo a GitHub...
git add data/catalogo.public.json.gz
git commit -m "actualizacion diaria del catalogo"
git push origin main

echo [4/4] Listo. La web se actualiza sola en ~30 min.
goto :fin

:error
echo ERROR durante la actualizacion. Revisar arriba.
exit /b 1

:fin
