/**
 * Script de Migración: Supabase Storage → Cloudflare
 *
 * Este script migra todos los archivos (videos y fotos) de Supabase Storage
 * a Cloudflare (Stream para videos, Images para fotos)
 *
 * IMPORTANTE: Ejecutar este script SOLO después de verificar que:
 * 1. Todas las credenciales de Cloudflare están configuradas en .env
 * 2. Has hecho backup de la base de datos
 * 3. Has probado la subida a Cloudflare con archivos de prueba
 *
 * USO:
 * - Para modo dry-run (solo simular): npm run migrate:dryrun
 * - Para migración real: npm run migrate:cloudflare
 */

import { supabase } from '../lib/supabase';
import CloudflareStreamService from '../services/cloudflare/CloudflareStreamService';
import CloudflareImagesService from '../services/cloudflare/CloudflareImagesService';
import CloudflareR2Service from '../services/cloudflare/CloudflareR2Service';

// Configuración
const DRY_RUN = process.argv.includes('--dry-run');
const DELETE_FROM_SUPABASE = process.argv.includes('--delete-supabase');
const BATCH_SIZE = 10; // Procesar archivos en lotes

interface MigrationResult {
  total: number;
  migrated: number;
  failed: number;
  skipped: number;
  errors: Array<{ file: string; error: string }>;
}

interface TrickToMigrate {
  id: string;
  user_id: string;
  effect_video_url?: string;
  secret_video_url?: string;
  photos: Array<{ id: string; photo_url: string }>;
}

/**
 * Obtiene todos los tricks con archivos que necesitan migración
 */
async function getTricksToMigrate(): Promise<TrickToMigrate[]> {
  console.log('📊 Obteniendo tricks de la base de datos...');

  const { data: tricks, error } = await supabase
    .from('magic_tricks')
    .select(`
      id,
      user_id,
      effect_video_url,
      secret_video_url
    `);

  if (error) {
    throw new Error(`Error obteniendo tricks: ${error.message}`);
  }

  // Obtener fotos de cada trick
  const tricksWithPhotos: TrickToMigrate[] = [];

  for (const trick of tricks || []) {
    const { data: photos } = await supabase
      .from('trick_photos')
      .select('id, photo_url')
      .eq('trick_id', trick.id);

    tricksWithPhotos.push({
      ...trick,
      photos: photos || [],
    });
  }

  console.log(`✅ Encontrados ${tricksWithPhotos.length} tricks`);
  return tricksWithPhotos;
}

/**
 * Migra un video de Supabase a Cloudflare Stream
 */
async function migrateVideo(
  videoUrl: string,
  userId: string,
  trickId: string,
  videoType: 'effect' | 'secret'
): Promise<{ success: boolean; newUrl?: string; error?: string }> {
  try {
    console.log(`  📹 Migrando video ${videoType}: ${videoUrl}`);

    if (DRY_RUN) {
      console.log(`  ✅ [DRY RUN] Video migrado (simulado)`);
      return { success: true, newUrl: 'https://customer-xxx.cloudflarestream.com/simulated' };
    }

    // Verificar que sea URL de Supabase
    if (!videoUrl || !videoUrl.includes('supabase')) {
      console.log(`  ⏭️ Video no es de Supabase, omitiendo`);
      return { success: false, error: 'Not a Supabase URL' };
    }

    // Descargar video de Supabase
    console.log(`  ⬇️ Descargando video...`);
    const response = await fetch(videoUrl);
    if (!response.ok) {
      throw new Error(`Error descargando: ${response.status}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const blob = new Blob([arrayBuffer], { type: 'video/mp4' });

    // Crear archivo temporal
    const tempFile = new File([blob], `${trickId}_${videoType}.mp4`, { type: 'video/mp4' });

    // Subir a Cloudflare Stream
    console.log(`  ⬆️ Subiendo a Cloudflare Stream...`);

    // NOTA: Esto necesita adaptación para Node.js
    // En React Native usaríamos FileSystem, aquí necesitamos una solución diferente
    // Por ahora, usamos el método de URL directa si Cloudflare lo soporta

    // Alternativa: Usar TUS upload con buffer
    // Esta implementación asume que tienes acceso al filesystem local

    console.log(`  ⚠️ Migración de videos requiere ejecución en entorno con acceso a filesystem`);

    return {
      success: false,
      error: 'Video migration requires filesystem access - run from React Native app',
    };

  } catch (error) {
    console.error(`  ❌ Error migrando video:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Migra una foto de Supabase a Cloudflare Images
 */
async function migratePhoto(
  photoUrl: string,
  userId: string,
  trickId: string,
  photoId: string
): Promise<{ success: boolean; newUrl?: string; error?: string }> {
  try {
    console.log(`  🖼️ Migrando foto: ${photoUrl}`);

    if (DRY_RUN) {
      console.log(`  ✅ [DRY RUN] Foto migrada (simulado)`);
      return { success: true, newUrl: 'https://imagedelivery.net/simulated/id/public' };
    }

    // Verificar que sea URL de Supabase
    if (!photoUrl || !photoUrl.includes('supabase')) {
      console.log(`  ⏭️ Foto no es de Supabase, omitiendo`);
      return { success: false, error: 'Not a Supabase URL' };
    }

    // Usar el método uploadFromUrl de Cloudflare Images
    console.log(`  ⬆️ Subiendo a Cloudflare Images...`);

    const result = await CloudflareImagesService.uploadFromUrl(photoUrl, {
      id: `${userId}_${trickId}_${photoId}`,
      metadata: {
        userId,
        trickId,
        photoId,
        migratedFrom: 'supabase',
      },
    });

    if (!result.success) {
      throw new Error(result.error || 'Upload failed');
    }

    console.log(`  ✅ Foto migrada: ${result.imageId}`);

    return {
      success: true,
      newUrl: result.url,
    };

  } catch (error) {
    console.error(`  ❌ Error migrando foto:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Actualiza las URLs en la base de datos
 */
async function updateDatabaseUrls(
  trickId: string,
  updates: {
    effect_video_url?: string;
    secret_video_url?: string;
  }
): Promise<boolean> {
  try {
    if (DRY_RUN) {
      console.log(`  💾 [DRY RUN] Actualizando BD para trick ${trickId}`);
      return true;
    }

    const { error } = await supabase
      .from('magic_tricks')
      .update(updates)
      .eq('id', trickId);

    if (error) {
      throw error;
    }

    return true;
  } catch (error) {
    console.error(`  ❌ Error actualizando BD:`, error);
    return false;
  }
}

async function updatePhotoUrl(photoId: string, newUrl: string): Promise<boolean> {
  try {
    if (DRY_RUN) {
      console.log(`  💾 [DRY RUN] Actualizando foto ${photoId}`);
      return true;
    }

    const { error } = await supabase
      .from('trick_photos')
      .update({ photo_url: newUrl })
      .eq('id', photoId);

    if (error) {
      throw error;
    }

    return true;
  } catch (error) {
    console.error(`  ❌ Error actualizando foto:`, error);
    return false;
  }
}

/**
 * Elimina archivos de Supabase Storage
 */
async function deleteFromSupabaseStorage(fileUrl: string): Promise<boolean> {
  try {
    if (!DELETE_FROM_SUPABASE) {
      console.log(`  ⏭️ Omitiendo eliminación de Supabase (usa --delete-supabase para habilitar)`);
      return true;
    }

    if (DRY_RUN) {
      console.log(`  🗑️ [DRY RUN] Eliminando de Supabase`);
      return true;
    }

    // Extraer la ruta del archivo
    const bucketName = 'magic_trick_media';
    const urlParts = fileUrl.split(`${bucketName}/`);
    if (urlParts.length < 2) {
      return false;
    }

    const filePath = urlParts[1].split('?')[0];

    const { error } = await supabase.storage
      .from(bucketName)
      .remove([filePath]);

    if (error) {
      throw error;
    }

    console.log(`  🗑️ Eliminado de Supabase: ${filePath}`);
    return true;

  } catch (error) {
    console.error(`  ❌ Error eliminando de Supabase:`, error);
    return false;
  }
}

/**
 * Migra un trick completo
 */
async function migrateTrick(trick: TrickToMigrate): Promise<MigrationResult> {
  console.log(`\n🎭 Migrando trick: ${trick.id}`);

  const result: MigrationResult = {
    total: 0,
    migrated: 0,
    failed: 0,
    skipped: 0,
    errors: [],
  };

  const dbUpdates: any = {};

  // Migrar effect video
  if (trick.effect_video_url) {
    result.total++;
    const videoResult = await migrateVideo(
      trick.effect_video_url,
      trick.user_id,
      trick.id,
      'effect'
    );

    if (videoResult.success && videoResult.newUrl) {
      dbUpdates.effect_video_url = videoResult.newUrl;
      result.migrated++;
      await deleteFromSupabaseStorage(trick.effect_video_url);
    } else if (videoResult.error === 'Not a Supabase URL') {
      result.skipped++;
    } else {
      result.failed++;
      result.errors.push({ file: trick.effect_video_url, error: videoResult.error || 'Unknown' });
    }
  }

  // Migrar secret video
  if (trick.secret_video_url) {
    result.total++;
    const videoResult = await migrateVideo(
      trick.secret_video_url,
      trick.user_id,
      trick.id,
      'secret'
    );

    if (videoResult.success && videoResult.newUrl) {
      dbUpdates.secret_video_url = videoResult.newUrl;
      result.migrated++;
      await deleteFromSupabaseStorage(trick.secret_video_url);
    } else if (videoResult.error === 'Not a Supabase URL') {
      result.skipped++;
    } else {
      result.failed++;
      result.errors.push({ file: trick.secret_video_url, error: videoResult.error || 'Unknown' });
    }
  }

  // Actualizar URLs de videos en BD
  if (Object.keys(dbUpdates).length > 0) {
    await updateDatabaseUrls(trick.id, dbUpdates);
  }

  // Migrar fotos
  for (const photo of trick.photos) {
    result.total++;

    const photoResult = await migratePhoto(
      photo.photo_url,
      trick.user_id,
      trick.id,
      photo.id
    );

    if (photoResult.success && photoResult.newUrl) {
      await updatePhotoUrl(photo.id, photoResult.newUrl);
      result.migrated++;
      await deleteFromSupabaseStorage(photo.photo_url);
    } else if (photoResult.error === 'Not a Supabase URL') {
      result.skipped++;
    } else {
      result.failed++;
      result.errors.push({ file: photo.photo_url, error: photoResult.error || 'Unknown' });
    }
  }

  return result;
}

/**
 * Función principal de migración
 */
async function runMigration() {
  console.log('\n🚀 INICIANDO MIGRACIÓN A CLOUDFLARE\n');

  if (DRY_RUN) {
    console.log('⚠️ MODO DRY RUN - No se realizarán cambios reales\n');
  }

  if (DELETE_FROM_SUPABASE) {
    console.log('🗑️ Eliminación de Supabase habilitada\n');
  }

  // Verificar configuración de Cloudflare
  const config = {
    stream: CloudflareStreamService.isConfigured(),
    images: CloudflareImagesService.isConfigured(),
    r2: CloudflareR2Service.isConfigured(),
  };

  console.log('📋 Estado de configuración de Cloudflare:');
  console.log(`   Stream: ${config.stream ? '✅' : '❌'}`);
  console.log(`   Images: ${config.images ? '✅' : '❌'}`);
  console.log(`   R2: ${config.r2 ? '✅' : '❌'}\n`);

  if (!config.stream || !config.images) {
    throw new Error('Cloudflare no está completamente configurado');
  }

  // Obtener tricks
  const tricks = await getTricksToMigrate();

  // Resultado total
  const totalResult: MigrationResult = {
    total: 0,
    migrated: 0,
    failed: 0,
    skipped: 0,
    errors: [],
  };

  // Procesar en lotes
  for (let i = 0; i < tricks.length; i += BATCH_SIZE) {
    const batch = tricks.slice(i, i + BATCH_SIZE);
    console.log(`\n📦 Procesando lote ${Math.floor(i / BATCH_SIZE) + 1} (${batch.length} tricks)`);

    for (const trick of batch) {
      const result = await migrateTrick(trick);

      totalResult.total += result.total;
      totalResult.migrated += result.migrated;
      totalResult.failed += result.failed;
      totalResult.skipped += result.skipped;
      totalResult.errors.push(...result.errors);
    }

    // Pequeña pausa entre lotes
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  // Resumen final
  console.log('\n\n═══════════════════════════════════════════');
  console.log('📊 RESUMEN DE MIGRACIÓN');
  console.log('═══════════════════════════════════════════');
  console.log(`Total de archivos: ${totalResult.total}`);
  console.log(`✅ Migrados: ${totalResult.migrated}`);
  console.log(`⏭️ Omitidos: ${totalResult.skipped}`);
  console.log(`❌ Fallidos: ${totalResult.failed}`);

  if (totalResult.errors.length > 0) {
    console.log(`\n⚠️ ERRORES (${totalResult.errors.length}):`);
    totalResult.errors.forEach((error, index) => {
      console.log(`${index + 1}. ${error.file}: ${error.error}`);
    });
  }

  console.log('\n✅ Migración completada\n');
}

// Ejecutar migración
if (require.main === module) {
  runMigration()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('\n❌ Error en la migración:', error);
      process.exit(1);
    });
}

export { runMigration };
