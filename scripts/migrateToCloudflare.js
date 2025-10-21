/**
 * Script de Migración: Supabase Storage → Cloudflare
 *
 * NOTA: Este script migra solo FOTOS de Supabase a Cloudflare Images
 * Los videos requieren una implementación más compleja que se recomienda
 * hacer desde la app React Native.
 *
 * USO:
 * - Para modo dry-run: npm run migrate:dryrun
 * - Para migración real: npm run migrate:cloudflare
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fetch = require('node-fetch');

// Configuración
const DRY_RUN = process.argv.includes('--dry-run');
const DELETE_FROM_SUPABASE = process.argv.includes('--delete-supabase');
const BATCH_SIZE = 10;

// Verificar variables de entorno
const requiredEnvVars = [
  'EXPO_PUBLIC_SUPABASE_URL',
  'EXPO_PUBLIC_SUPABASE_ANON_KEY',
  'CLOUDFLARE_ACCOUNT_ID',
  'CLOUDFLARE_IMAGES_API_TOKEN',
  'CLOUDFLARE_IMAGES_ACCOUNT_HASH',
];

console.log('\n🔍 Verificando configuración...\n');

const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
if (missingVars.length > 0) {
  console.error('❌ Faltan las siguientes variables de entorno:');
  missingVars.forEach(varName => console.error(`   - ${varName}`));
  console.error('\nPor favor, configúralas en tu archivo .env\n');
  process.exit(1);
}

// Inicializar Supabase
const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
);

// Configuración de Cloudflare
const CLOUDFLARE_CONFIG = {
  accountId: process.env.CLOUDFLARE_ACCOUNT_ID,
  apiToken: process.env.CLOUDFLARE_IMAGES_API_TOKEN,
  accountHash: process.env.CLOUDFLARE_IMAGES_ACCOUNT_HASH,
  deliveryUrl: process.env.CLOUDFLARE_IMAGES_DELIVERY_URL || 'https://imagedelivery.net',
};

/**
 * Obtiene todos los tricks con fotos
 */
async function getTricksToMigrate() {
  console.log('📊 Obteniendo tricks de la base de datos...');

  const { data: tricks, error } = await supabase
    .from('magic_tricks')
    .select('id, user_id');

  if (error) {
    throw new Error(`Error obteniendo tricks: ${error.message}`);
  }

  // Obtener fotos de cada trick
  const tricksWithPhotos = [];

  for (const trick of tricks || []) {
    const { data: photos } = await supabase
      .from('trick_photos')
      .select('id, photo_url')
      .eq('trick_id', trick.id);

    if (photos && photos.length > 0) {
      tricksWithPhotos.push({
        ...trick,
        photos: photos,
      });
    }
  }

  console.log(`✅ Encontrados ${tricksWithPhotos.length} tricks con fotos`);

  const totalPhotos = tricksWithPhotos.reduce((sum, trick) => sum + trick.photos.length, 0);
  console.log(`📸 Total de fotos a migrar: ${totalPhotos}\n`);

  return tricksWithPhotos;
}

/**
 * Sube una foto a Cloudflare Images desde URL
 */
async function uploadToCloudflareImages(photoUrl, customId, metadata = {}) {
  const url = `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_CONFIG.accountId}/images/v1`;

  const formData = new URLSearchParams();
  formData.append('url', photoUrl);
  formData.append('id', customId);
  formData.append('metadata', JSON.stringify(metadata));

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${CLOUDFLARE_CONFIG.apiToken}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: formData,
  });

  const result = await response.json();

  if (!result.success) {
    throw new Error(result.errors?.[0]?.message || 'Upload failed');
  }

  return {
    success: true,
    imageId: result.result.id,
    url: `${CLOUDFLARE_CONFIG.deliveryUrl}/${CLOUDFLARE_CONFIG.accountHash}/${result.result.id}/public`,
    variants: result.result.variants,
  };
}

/**
 * Migra una foto
 */
async function migratePhoto(photoUrl, userId, trickId, photoId) {
  try {
    console.log(`  🖼️  Migrando foto: ${photoUrl.substring(0, 60)}...`);

    if (DRY_RUN) {
      console.log(`  ✅ [DRY RUN] Foto migrada (simulado)`);
      return { success: true, newUrl: 'https://imagedelivery.net/simulated/id/public' };
    }

    // Verificar que sea URL de Supabase
    if (!photoUrl || !photoUrl.includes('supabase')) {
      console.log(`  ⏭️  Foto no es de Supabase, omitiendo`);
      return { success: false, error: 'Not a Supabase URL' };
    }

    // Subir a Cloudflare Images
    console.log(`  ⬆️  Subiendo a Cloudflare Images...`);

    const customId = `${userId}_${trickId}_${photoId}`.replace(/-/g, '_');

    const result = await uploadToCloudflareImages(photoUrl, customId, {
      userId,
      trickId,
      photoId,
      migratedFrom: 'supabase',
      migratedAt: new Date().toISOString(),
    });

    console.log(`  ✅ Foto migrada: ${result.imageId}`);

    return {
      success: true,
      newUrl: result.url,
    };

  } catch (error) {
    console.error(`  ❌ Error migrando foto:`, error.message);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Actualiza la URL de la foto en la base de datos
 */
async function updatePhotoUrl(photoId, newUrl) {
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
    console.error(`  ❌ Error actualizando foto:`, error.message);
    return false;
  }
}

/**
 * Elimina archivo de Supabase Storage
 */
async function deleteFromSupabaseStorage(fileUrl) {
  try {
    if (!DELETE_FROM_SUPABASE) {
      return true;
    }

    if (DRY_RUN) {
      console.log(`  🗑️  [DRY RUN] Eliminando de Supabase`);
      return true;
    }

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

    console.log(`  🗑️  Eliminado de Supabase: ${filePath}`);
    return true;

  } catch (error) {
    console.error(`  ❌ Error eliminando de Supabase:`, error.message);
    return false;
  }
}

/**
 * Migra un trick completo
 */
async function migrateTrick(trick) {
  console.log(`\n🎭 Migrando trick: ${trick.id}`);

  const result = {
    total: 0,
    migrated: 0,
    failed: 0,
    skipped: 0,
    errors: [],
  };

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
 * Función principal
 */
async function runMigration() {
  console.log('\n🚀 INICIANDO MIGRACIÓN A CLOUDFLARE\n');
  console.log('═══════════════════════════════════════════\n');

  if (DRY_RUN) {
    console.log('⚠️  MODO DRY RUN - No se realizarán cambios reales\n');
  }

  if (DELETE_FROM_SUPABASE) {
    console.log('🗑️  Eliminación de Supabase habilitada\n');
  }

  console.log('📋 Configuración de Cloudflare:');
  console.log(`   Account ID: ${CLOUDFLARE_CONFIG.accountId ? '✅' : '❌'}`);
  console.log(`   API Token: ${CLOUDFLARE_CONFIG.apiToken ? '✅' : '❌'}`);
  console.log(`   Account Hash: ${CLOUDFLARE_CONFIG.accountHash ? '✅' : '❌'}\n`);

  // Obtener tricks
  const tricks = await getTricksToMigrate();

  if (tricks.length === 0) {
    console.log('\n✅ No hay fotos para migrar\n');
    return;
  }

  // Resultado total
  const totalResult = {
    total: 0,
    migrated: 0,
    failed: 0,
    skipped: 0,
    errors: [],
  };

  // Procesar en lotes
  for (let i = 0; i < tricks.length; i += BATCH_SIZE) {
    const batch = tricks.slice(i, i + BATCH_SIZE);
    console.log(`\n📦 Procesando lote ${Math.floor(i / BATCH_SIZE) + 1} de ${Math.ceil(tricks.length / BATCH_SIZE)} (${batch.length} tricks)`);

    for (const trick of batch) {
      const result = await migrateTrick(trick);

      totalResult.total += result.total;
      totalResult.migrated += result.migrated;
      totalResult.failed += result.failed;
      totalResult.skipped += result.skipped;
      totalResult.errors.push(...result.errors);
    }

    // Pausa entre lotes
    if (i + BATCH_SIZE < tricks.length) {
      console.log('\n⏸️  Pausa de 2 segundos...');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  // Resumen final
  console.log('\n\n═══════════════════════════════════════════');
  console.log('📊 RESUMEN DE MIGRACIÓN');
  console.log('═══════════════════════════════════════════');
  console.log(`Total de fotos: ${totalResult.total}`);
  console.log(`✅ Migradas: ${totalResult.migrated}`);
  console.log(`⏭️  Omitidas: ${totalResult.skipped}`);
  console.log(`❌ Fallidas: ${totalResult.failed}`);

  if (totalResult.errors.length > 0) {
    console.log(`\n⚠️  ERRORES (${totalResult.errors.length}):`);
    totalResult.errors.forEach((error, index) => {
      console.log(`${index + 1}. ${error.file.substring(0, 60)}...: ${error.error}`);
    });
  }

  console.log('\n✅ Migración completada\n');
}

// Ejecutar
runMigration()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('\n❌ Error en la migración:', error.message);
    console.error(error.stack);
    process.exit(1);
  });
