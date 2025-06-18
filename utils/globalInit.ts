// 1. POLYFILLS - Deben ser los primeros imports
import "react-native-get-random-values";
import { Buffer } from "buffer";

// 2. CONFIGURACIÓN DE VARIABLES GLOBALES
// Buffer es necesario para muchas operaciones criptográficas
global.Buffer = Buffer;

// 3. ASEGURAR QUE CRYPTO ESTÉ DISPONIBLE GLOBALMENTE
// Algunos entornos de React Native no exponen crypto automáticamente
if (typeof global.crypto === "undefined") {
  // Intentar obtener crypto del polyfill
  const cryptoPolyfill = require("react-native-get-random-values");
  if (cryptoPolyfill && cryptoPolyfill.crypto) {
    global.crypto = cryptoPolyfill.crypto;
  } else if (cryptoPolyfill && cryptoPolyfill.getRandomValues) {
    // Crear un objeto crypto mínimo si solo tenemos getRandomValues
    global.crypto = {
      getRandomValues: cryptoPolyfill.getRandomValues,
    } as any;
  }
}

/**
 * Verifica que el objeto crypto global esté correctamente configurado
 * y funcionando. Esta verificación es crítica para el funcionamiento
 * de las librerías criptográficas.
 *
 * @returns {boolean} true si crypto está funcionando correctamente
 */
const testCrypto = (): boolean => {
  try {
    // Verificar que crypto existe
    if (typeof global.crypto === "undefined") {
      console.error("❌ global.crypto no está definido");
      return false;
    }

    // Verificar que getRandomValues existe
    if (typeof global.crypto.getRandomValues !== "function") {
      console.error("❌ global.crypto.getRandomValues no es una función");
      return false;
    }

    // Probar que genera bytes aleatorios correctamente
    const testArray = new Uint8Array(16);
    global.crypto.getRandomValues(testArray);

    // Verificar que no todos los bytes sean cero (indicaría un mal PRNG)
    const hasNonZero = testArray.some((byte) => byte !== 0);
    if (!hasNonZero) {
      console.error("❌ getRandomValues está generando solo ceros");
      return false;
    }

    console.log("✅ Global crypto configurado correctamente");
    return true;
  } catch (error) {
    console.error("❌ Error verificando global crypto:", error);
    return false;
  }
};

/**
 * Configura TweetNaCl para usar nuestro generador de números aleatorios seguro.
 * TweetNaCl por defecto no tiene un PRNG en React Native, por lo que debemos
 * proporcionarle uno.
 *
 * @returns {Promise<boolean>} true si la configuración fue exitosa
 */
const configureNacl = async (): Promise<boolean> => {
  try {
    // Importar TweetNaCl dinámicamente
    const nacl = await import("tweetnacl");

    // Verificar si randomBytes ya está configurado y funcionando
    if (nacl.randomBytes && typeof nacl.randomBytes === "function") {
      try {
        const test = nacl.randomBytes(16);
        if (test && test.length === 16 && test.some((b) => b !== 0)) {
          console.log("✅ nacl.randomBytes ya estaba configurado");
          return true;
        }
      } catch (e) {
        console.warn("⚠️ nacl.randomBytes existe pero no funciona:", e);
      }
    }

    // Configurar randomBytes para usar nuestro crypto global
    nacl.randomBytes = (n: number): Uint8Array => {
      const bytes = new Uint8Array(n);
      global.crypto.getRandomValues(bytes);
      return bytes;
    };

    // Si setPRNG existe, también configurarlo (por compatibilidad)
    if ((nacl as any).setPRNG && typeof (nacl as any).setPRNG === "function") {
      (nacl as any).setPRNG((x: Uint8Array, n: number) => {
        global.crypto.getRandomValues(x);
      });
    }

    // Verificar que la configuración funcione
    const testBytes = nacl.randomBytes(16);
    if (!testBytes || testBytes.length !== 16) {
      throw new Error("nacl.randomBytes no está generando bytes correctamente");
    }

    // Verificar que genera bytes aleatorios (no todos ceros)
    if (testBytes.every((b) => b === 0)) {
      throw new Error("nacl.randomBytes está generando solo ceros");
    }

    console.log("✅ TweetNaCl configurado correctamente");
    return true;
  } catch (error) {
    console.error("❌ Error configurando TweetNaCl:", error);
    return false;
  }
};

/**
 * Función principal de inicialización que debe ser llamada
 * al inicio de la aplicación. Configura todos los polyfills
 * y verifica que estén funcionando correctamente.
 *
 * @returns {Promise<boolean>} true si toda la inicialización fue exitosa
 */
export const initializeGlobals = async (): Promise<boolean> => {
  console.log("🚀 Inicializando globals y polyfills...");

  // Paso 1: Verificar crypto global
  const cryptoOk = testCrypto();
  if (!cryptoOk) {
    console.error("❌ Falló la configuración de crypto global");
    return false;
  }

  // Paso 2: Configurar TweetNaCl
  const naclOk = await configureNacl();
  if (!naclOk) {
    console.error("❌ Falló la configuración de TweetNaCl");
    return false;
  }

  // Paso 3: Verificaciones adicionales opcionales
  try {
    // Verificar Buffer
    if (typeof global.Buffer === "undefined") {
      console.error("❌ global.Buffer no está definido");
      return false;
    }

    // Test básico de Buffer
    const testBuffer = Buffer.from("test", "utf8");
    if (testBuffer.toString("utf8") !== "test") {
      console.error("❌ Buffer no funciona correctamente");
      return false;
    }

    console.log("✅ Buffer configurado correctamente");
  } catch (error) {
    console.error("❌ Error verificando Buffer:", error);
    return false;
  }

  console.log("✅ Todos los globals inicializados correctamente");
  return true;
};

/**
 * Ejecutar verificación inicial inmediatamente al cargar el módulo
 * Esto ayuda a detectar problemas temprano en el ciclo de vida de la app
 */
(() => {
  const cryptoOk = testCrypto();
  if (!cryptoOk) {
    console.error(
      "⚠️ ADVERTENCIA: Crypto no está disponible al cargar globalInit.ts"
    );
  }
})();
