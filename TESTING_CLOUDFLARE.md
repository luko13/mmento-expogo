# 🧪 Guía de Testing - Cloudflare Integration

Esta guía te ayudará a verificar que la integración con Cloudflare funciona correctamente.

## ✅ Pre-requisitos

Antes de empezar el testing:

1. ✅ Todas las variables de entorno configuradas en `.env`
2. ✅ Dependencias instaladas: `npm install`
3. ✅ App compilada: `npm start`

## 🎯 Test 1: Verificar Configuración

### Objetivo
Verificar que todos los servicios de Cloudflare están correctamente configurados.

### Pasos

1. Abre la app en tu dispositivo/emulador
2. Abre la consola de desarrollo
3. Busca mensajes de inicialización:
   ```
   ✅ Cloudflare R2 client initialized
   ```

### Resultado Esperado
- No debe haber warnings de "⚠️ Cloudflare credentials not configured"
- Los servicios deben inicializarse correctamente

---

## 🎬 Test 2: Subir Video (Cloudflare Stream)

### Objetivo
Verificar que los videos se suben correctamente a Cloudflare Stream.

### Pasos

1. Ve a **Add Magic** en la app
2. Selecciona **"Add effect video"**
3. Graba o selecciona un video corto (10-30 segundos)
4. Observa la consola durante la subida

### Resultado Esperado

**En consola:**
```
🚀 Iniciando subida de archivo: video.mp4
☁️ Usando Cloudflare para almacenamiento
📊 Tamaño original: X.XX MB
ℹ️ Cloudflare Stream habilitado - compresión local omitida
🎬 Subiendo video a Cloudflare Stream...
📤 Subiendo video a Cloudflare Stream: file://...
✅ Sesión de upload creada: https://...
✅ Video subido exitosamente
🎬 Video ID: abc123def456...
✅ Archivo subido a Cloudflare: https://customer-xxx.cloudflarestream.com/.../manifest/video.m3u8
```

**En la app:**
- El video debe aparecer en el preview
- El thumbnail debe cargarse automáticamente
- No debe mostrar errores

### Verificación Adicional

1. Ve al dashboard de Cloudflare Stream:
   - https://dash.cloudflare.com/ → Stream
2. Verifica que el video aparece en la lista
3. Reproduce el video desde el dashboard

---

## 🖼️ Test 3: Subir Fotos (Cloudflare Images)

### Objetivo
Verificar que las fotos se suben correctamente a Cloudflare Images.

### Pasos

1. En **Add Magic**, selecciona **"Add photos"**
2. Sube 2-3 fotos
3. Observa la consola durante la subida

### Resultado Esperado

**En consola:**
```
🚀 Iniciando subida de archivo: photo.jpg
☁️ Usando Cloudflare para almacenamiento
📊 Tamaño original: X.XX MB
🗜️ Comprimiendo imagen antes de subir...
✅ Compresión completada:
   - Tamaño original: X.XX MB
   - Tamaño comprimido: Y.YY MB
🖼️ Subiendo imagen a Cloudflare Images...
📤 Subiendo imagen a Cloudflare Images: ...
✅ Imagen subida exitosamente. ID: abc123...
✅ Archivo subido a Cloudflare: https://imagedelivery.net/.../public
```

**En la app:**
- Las fotos deben aparecer en el grid
- Deben cargarse rápidamente
- Los thumbnails deben verse bien

### Verificación Adicional

1. Ve al dashboard de Cloudflare Images:
   - https://dash.cloudflare.com/ → Images
2. Verifica que las fotos aparecen en la lista
3. Prueba las diferentes variants:
   - URL con `/thumbnail`
   - URL con `/medium`
   - URL con `/large`

---

## 💾 Test 4: Guardar Trick Completo

### Objetivo
Verificar que un trick con videos y fotos se guarda correctamente.

### Pasos

1. Completa todos los campos del trick:
   - Título
   - Descripción
   - Video de efecto
   - Video de secreto (opcional)
   - Varias fotos
2. Haz clic en **Save**
3. Espera a que se guarde

### Resultado Esperado

**En consola:**
```
[Todos los logs de subida de archivos]
✅ Trick guardado exitosamente
```

**En la app:**
- El trick debe aparecer en tu biblioteca
- Al abrirlo, los videos y fotos deben cargarse correctamente

### Verificación en Base de Datos

1. Ve a Supabase → Table Editor → `magic_tricks`
2. Busca tu trick recién creado
3. Verifica que las URLs son de Cloudflare:
   - `effect_video_url`: debe contener `cloudflarestream.com`
   - `secret_video_url`: debe contener `cloudflarestream.com` (si lo subiste)

4. Ve a la tabla `trick_photos`
5. Verifica que las fotos tienen URLs de Cloudflare:
   - `photo_url`: debe contener `imagedelivery.net`

---

## 🗑️ Test 5: Eliminar Archivos

### Objetivo
Verificar que los archivos se eliminan correctamente de Cloudflare.

### Pasos

1. Crea un trick de prueba con video y fotos
2. Elimina el trick
3. Observa la consola

### Resultado Esperado

**En consola:**
```
🗑️ Eliminando de Cloudflare...
🗑️ Eliminando video de Cloudflare Stream: abc123...
✅ Video eliminado exitosamente
🗑️ Eliminando imagen de Cloudflare Images: def456...
✅ Imagen eliminada exitosamente
```

### Verificación en Dashboard

1. Ve al dashboard de Cloudflare
2. Verifica que los archivos ya no aparecen
3. Intenta acceder a las URLs antiguas (deben dar error 404)

---

## 🎥 Test 6: Reproducción de Video

### Objetivo
Verificar que los videos se reproducen correctamente.

### Pasos

1. Abre un trick con video
2. Reproduce el video de efecto
3. Reproduce el video de secreto (si existe)
4. Prueba en diferentes calidades de conexión:
   - WiFi rápido
   - 4G
   - 3G (si es posible)

### Resultado Esperado

- El video debe empezar a reproducirse rápidamente
- No debe haber buffering excesivo
- La calidad debe ajustarse automáticamente a la conexión
- El thumbnail debe mostrarse antes de reproducir

---

## 📱 Test 7: Performance

### Objetivo
Verificar que el rendimiento es bueno.

### Métricas a Observar

1. **Tiempo de carga de thumbnails**: < 1 segundo
2. **Tiempo para empezar reproducción de video**: < 2 segundos
3. **Tiempo de carga de fotos**: < 1 segundo
4. **Tiempo total de subida**:
   - Video 10MB: ~30-60 segundos
   - Foto 3MB: ~5-10 segundos

### Comparación con Supabase

Si tienes tricks antiguos con archivos en Supabase:
- Compara el tiempo de carga
- Compara la calidad de reproducción
- Cloudflare debería ser igual o más rápido

---

## 🌍 Test 8: Variants de Imágenes

### Objetivo
Verificar que las transformaciones de imágenes funcionan.

### Pasos

1. Sube una foto grande (3000x4000px)
2. Abre la consola del navegador web (si usas web) o logs de la app
3. Verifica las URLs generadas

### Resultado Esperado

Deben generarse 3 variants:
```
thumbnail: https://imagedelivery.net/{hash}/{id}/thumbnail
medium: https://imagedelivery.net/{hash}/{id}/medium
large: https://imagedelivery.net/{hash}/{id}/large
```

### Verificación Manual

Abre cada URL en el navegador:
- `/thumbnail`: imagen pequeña (~200x200)
- `/medium`: imagen mediana (~800x800)
- `/large`: imagen grande (~1920x1920)

---

## 🔄 Test 9: Compatibilidad con Archivos Antiguos

### Objetivo
Verificar que los tricks con archivos en Supabase siguen funcionando.

### Pasos

1. Abre un trick antiguo (con archivos en Supabase)
2. Verifica que el video se reproduce
3. Verifica que las fotos se ven

### Resultado Esperado

- Los archivos de Supabase deben seguir funcionando
- No debe haber errores
- La app debe detectar automáticamente el origen

**En consola:**
```
📦 Usando Supabase Storage (legacy)
```

---

## 🧪 Test 10: Rollback

### Objetivo
Verificar que puedes volver a Supabase si es necesario.

### Pasos

1. Edita `services/fileUploadService.ts`:
   ```typescript
   const USE_CLOUDFLARE = false; // Cambiar a false
   ```

2. Reinicia la app: `npm start --reset-cache`

3. Sube un nuevo archivo

### Resultado Esperado

**En consola:**
```
📦 Usando Supabase Storage (legacy)
```

El archivo debe subirse a Supabase, no a Cloudflare.

### Revertir
```typescript
const USE_CLOUDFLARE = true; // Volver a true
```

---

## 📊 Checklist Completo de Testing

Marca cada test a medida que lo completas:

- [ ] Test 1: Verificar Configuración
- [ ] Test 2: Subir Video (Cloudflare Stream)
- [ ] Test 3: Subir Fotos (Cloudflare Images)
- [ ] Test 4: Guardar Trick Completo
- [ ] Test 5: Eliminar Archivos
- [ ] Test 6: Reproducción de Video
- [ ] Test 7: Performance
- [ ] Test 8: Variants de Imágenes
- [ ] Test 9: Compatibilidad con Archivos Antiguos
- [ ] Test 10: Rollback

---

## 🆘 Errores Comunes y Soluciones

### Error: "Cloudflare Stream no está configurado correctamente"

**Causa**: Variables de entorno faltantes o incorrectas

**Solución**:
```bash
# Verifica que existen en .env:
echo $CLOUDFLARE_ACCOUNT_ID
echo $CLOUDFLARE_STREAM_API_TOKEN
echo $CLOUDFLARE_STREAM_CUSTOMER_SUBDOMAIN

# Reinicia la app
npm start --reset-cache
```

### Error: "Error creando sesión de upload"

**Causa**: Token de API inválido o sin permisos

**Solución**:
1. Ve a https://dash.cloudflare.com/profile/api-tokens
2. Verifica que el token tiene permisos de `Stream:Edit`
3. Si es necesario, crea un nuevo token
4. Actualiza `.env` con el nuevo token

### Error: "Error subiendo imagen"

**Causa**: Account Hash incorrecto o token inválido

**Solución**:
1. Ve a https://dash.cloudflare.com/ → Images → Overview
2. Copia el Account Hash visible ahí
3. Actualiza `CLOUDFLARE_IMAGES_ACCOUNT_HASH` en `.env`

### Video no se reproduce

**Causa**: URL incorrecta o video aún procesándose

**Solución**:
1. Ve al dashboard de Stream
2. Verifica el estado del video (debe ser "ready")
3. Si está "inprogress", espera unos minutos
4. Prueba la URL directamente en el navegador

### Fotos no se cargan

**Causa**: URL incorrecta o CORS bloqueado

**Solución**:
1. Abre la URL de la foto directamente
2. Verifica que no da error 404
3. Verifica en el dashboard de Images que existe
4. Si usas dominio custom, verifica configuración de CORS

---

## 📞 Reporte de Bugs

Si encuentras un bug durante el testing:

1. **Copia los logs completos de la consola**
2. **Describe los pasos para reproducir**
3. **Captura de pantalla del error (si aplica)**
4. **URLs de archivos involucrados**
5. **Estado esperado vs estado actual**

---

**Última actualización**: 2025-10-15
