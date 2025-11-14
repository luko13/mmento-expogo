# 🚀 Guía de Migración a Cloudflare

Esta guía detalla el proceso completo de migración de Supabase Storage a Cloudflare.

## 📋 Resumen

- **Videos** → Cloudflare Stream
- **Fotos** → Cloudflare Images
- **Archivos genéricos** → Cloudflare R2 (si es necesario)

## ✅ Pre-requisitos

Antes de comenzar, asegúrate de tener:

1. ✅ Todas las credenciales de Cloudflare configuradas en `.env`
2. ✅ Backup completo de la base de datos de Supabase
3. ✅ Backup de archivos existentes en Supabase Storage (opcional)
4. ✅ Verificado que la app funciona correctamente antes de migrar

## 🔧 Configuración

### Variables de entorno requeridas (.env)

```env
# Cloudflare Stream (Videos)
CLOUDFLARE_ACCOUNT_ID=tu_account_id
CLOUDFLARE_STREAM_API_TOKEN=tu_stream_api_token
CLOUDFLARE_STREAM_CUSTOMER_SUBDOMAIN=customer-xxxxx.cloudflarestream.com

# Cloudflare R2 (Almacenamiento)
CLOUDFLARE_R2_ACCESS_KEY_ID=tu_r2_access_key
CLOUDFLARE_R2_SECRET_ACCESS_KEY=tu_r2_secret_key
CLOUDFLARE_R2_ENDPOINT=https://xxxxx.r2.cloudflarestorage.com
CLOUDFLARE_R2_BUCKET_NAME=mmento-media
CLOUDFLARE_R2_PUBLIC_URL=https://pub-xxxxx.r2.dev

# Cloudflare Images (Transformaciones)
CLOUDFLARE_IMAGES_ACCOUNT_HASH=tu_account_hash
CLOUDFLARE_IMAGES_API_TOKEN=tu_images_api_token
CLOUDFLARE_IMAGES_DELIVERY_URL=https://imagedelivery.net
```

## 🎯 Estrategia de Migración

### Fase 1: Pruebas (OBLIGATORIO)

1. **Probar nuevos uploads**:
   - Crea un nuevo trick de prueba
   - Sube un video
   - Sube varias fotos
   - Verifica que las URLs generadas funcionan
   - Verifica que puedes ver el video y las fotos en la app

2. **Verificar configuración**:
   ```bash
   # Ejecutar un dry-run del script de migración
   npm run migrate:dryrun
   ```

### Fase 2: Migración Gradual (RECOMENDADO)

**Opción A: Solo nuevos archivos van a Cloudflare**
- Los archivos existentes permanecen en Supabase
- Todos los nuevos uploads van a Cloudflare
- Migración manual de archivos viejos cuando sea necesario
- **Ventaja**: Cero downtime, reversible fácilmente

**Opción B: Migración completa**
- Migrar todos los archivos existentes
- Eliminar archivos de Supabase Storage
- **Ventaja**: Todo en Cloudflare, costo reducido

### Fase 3: Ejecución (si eliges Opción B)

1. **Backup**:
   ```bash
   # Exportar base de datos
   # Esto lo haces desde el dashboard de Supabase
   ```

2. **Ejecutar migración (dry-run primero)**:
   ```bash
   npm run migrate:dryrun
   ```

3. **Si el dry-run es exitoso, ejecutar migración real**:
   ```bash
   npm run migrate:cloudflare
   ```

4. **Opcional: Eliminar archivos de Supabase después de verificar**:
   ```bash
   npm run migrate:cloudflare --delete-supabase
   ```

## 🔄 Proceso de Migración

### Para cada archivo:

1. **Descargar** de Supabase Storage
2. **Subir** a Cloudflare (Stream/Images/R2 según tipo)
3. **Actualizar** URL en la base de datos
4. **Verificar** que el archivo es accesible
5. **Eliminar** de Supabase (opcional, solo con flag `--delete-supabase`)

## 🎬 Casos de Uso

### Caso 1: Solo usar Cloudflare para nuevos uploads

**Configuración**:
- Mantener `USE_CLOUDFLARE = true` en `fileUploadService.ts`
- No ejecutar script de migración

**Resultado**:
- Archivos viejos → Supabase
- Archivos nuevos → Cloudflare
- Funciona perfectamente, sin downtime

### Caso 2: Migrar todo a Cloudflare

**Pasos**:
1. Probar nuevos uploads (Fase 1)
2. Ejecutar dry-run del script
3. Ejecutar migración real
4. Verificar que todos los archivos funcionan
5. Opcionalmente eliminar de Supabase

### Caso 3: Rollback (volver a Supabase)

Si algo sale mal, puedes revertir:

```typescript
// En services/fileUploadService.ts
const USE_CLOUDFLARE = false; // Cambiar a false
```

Esto hace que todos los nuevos uploads vuelvan a Supabase.

## ⚠️ Consideraciones Importantes

### Videos (Cloudflare Stream)

- ✅ **Compresión automática**: Cloudflare comprime automáticamente
- ✅ **Thumbnails automáticos**: Se generan al subir
- ✅ **Adaptive bitrate**: Calidad ajustada a la conexión del usuario
- ✅ **HLS y DASH**: Múltiples formatos de streaming
- ❌ **Costo**: $5/1,000 minutos almacenados

### Fotos (Cloudflare Images)

- ✅ **Transformaciones on-the-fly**: Redimensiona automáticamente
- ✅ **Múltiples variants**: thumbnail, medium, large
- ✅ **Optimización automática**: WebP, AVIF según navegador
- ✅ **CDN global**: Carga ultra-rápida
- ❌ **Costo**: $5/mes base + $1/5,000 transformaciones

### Base de Datos

**Cambios necesarios**:
- URLs de videos cambiarán de Supabase → Cloudflare Stream
- URLs de fotos cambiarán de Supabase → Cloudflare Images
- Estos cambios se hacen automáticamente con el script de migración

**Compatibilidad**:
- El código soporta ambos tipos de URLs
- Puedes tener algunos archivos en Supabase y otros en Cloudflare
- La detección es automática basada en la URL

## 🧪 Testing

### Checklist de pruebas

- [ ] Subir un video de efecto
- [ ] Subir un video de secreto
- [ ] Subir múltiples fotos
- [ ] Ver un video existente (Supabase)
- [ ] Ver un video nuevo (Cloudflare Stream)
- [ ] Ver una foto existente (Supabase)
- [ ] Ver una foto nueva (Cloudflare Images)
- [ ] Eliminar un trick con videos/fotos de Cloudflare
- [ ] Verificar que los thumbnails se muestran correctamente
- [ ] Verificar reproducción de video en diferentes conexiones

### Cómo probar

1. **Crear un trick de prueba**:
   - Ve a "Add Magic"
   - Sube un video y varias fotos
   - Guarda el trick

2. **Verificar en consola**:
   - Busca mensajes: `☁️ Usando Cloudflare para almacenamiento`
   - Verifica que las URLs contienen `cloudflarestream.com` o `imagedelivery.net`

3. **Verificar en la app**:
   - Abre el trick
   - El video debe reproducirse correctamente
   - Las fotos deben cargarse rápido
   - Los thumbnails deben verse bien

## 📊 Monitoreo

### Cloudflare Dashboard

Después de migrar, revisa:

1. **Stream**:
   - https://dash.cloudflare.com/ → Stream
   - Verifica que los videos aparecen
   - Revisa el uso de almacenamiento

2. **Images**:
   - https://dash.cloudflare.com/ → Images
   - Verifica que las fotos aparecen
   - Revisa estadísticas de transformaciones

3. **R2**:
   - https://dash.cloudflare.com/ → R2
   - Verifica el bucket
   - Revisa el uso de almacenamiento

## 🆘 Troubleshooting

### Error: "Cloudflare Stream no está configurado correctamente"

**Solución**:
- Verifica que todas las variables de entorno están en `.env`
- Reinicia el servidor de desarrollo: `npm start --reset-cache`

### Error al subir video: "Error creando sesión de upload"

**Solución**:
- Verifica que el `CLOUDFLARE_STREAM_API_TOKEN` es válido
- Verifica que el token tiene permisos de `Stream:Edit`

### Error al subir foto: "Error subiendo imagen"

**Solución**:
- Verifica que el `CLOUDFLARE_IMAGES_API_TOKEN` es válido
- Verifica que `CLOUDFLARE_IMAGES_ACCOUNT_HASH` es correcto

### Videos/fotos no se ven en la app

**Solución**:
- Verifica la URL en la consola
- Prueba abrir la URL directamente en el navegador
- Verifica que el archivo existe en el dashboard de Cloudflare

### Script de migración falla

**Solución**:
- Ejecuta primero con `--dry-run` para identificar problemas
- Verifica que tienes conexión a internet estable
- Verifica que las credenciales son correctas
- Revisa los logs de errores al final de la migración

## 💡 Mejores Prácticas

1. **Siempre haz dry-run primero**: `npm run migrate:dryrun`
2. **Haz backup antes de migrar**: Exporta la BD completa
3. **Migra en horarios de bajo uso**: Para minimizar impacto
4. **Verifica cada lote**: El script procesa de 10 en 10, puedes pausar
5. **No elimines de Supabase inmediatamente**: Espera unos días primero
6. **Monitorea costos**: Revisa el dashboard de Cloudflare regularmente

## 📞 Soporte

Si encuentras problemas:

1. Revisa esta guía completa
2. Revisa los logs de la consola
3. Verifica la configuración en `.env`
4. Prueba con un archivo individual primero
5. Contacta al equipo de desarrollo

---

**Última actualización**: 2025-10-15
