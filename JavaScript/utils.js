// Utilidades nativas compartidas por la lógica de reportes y de cuentas.
// Atajos para buscar uno o varios elementos del HTML por selector.
export const $ = (selector, root) => (root || document).querySelector(selector);
export const $$ = (selector, root) => Array.from((root || document).querySelectorAll(selector));

// Lee una lista guardada; si no existe o está dañada, devuelve el valor alternativo.
export function read(key, fallback) {
  try {
    const value = JSON.parse(localStorage.getItem(key));
    return Array.isArray(value) ? value : fallback;
  } catch (error) {
    return fallback;
  }
}

// Lee un objeto guardado para conservar ediciones administrativas a los JSON de ejemplo.
export function readObject(key) {
  try {
    const value = JSON.parse(localStorage.getItem(key));
    return value && typeof value === "object" && !Array.isArray(value) ? value : {};
  } catch (error) {
    return {};
  }
}

// Convierte una lista a texto JSON y la guarda en el almacenamiento del navegador.
export function write(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

// Lee el archivo elegido por la persona y lo convierte a un formato que puede guardarse.
export function readImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("No se pudo leer la imagen seleccionada."));
    reader.readAsDataURL(file);
  });
}

// Protege el HTML cuando se insertan títulos, ubicaciones o descripciones escritos por usuarios.
export function escapeHtml(value) {
  return String(value || "").replace(/[&<>"']/g, character => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[character]);
}

// Prepara texto para que la búsqueda no dependa de mayúsculas ni tildes.
export function normalizeText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es")
    .trim();
}

// Crea una huella de contraseña con la función criptográfica incluida en el navegador.
export async function hashPassword(password) {
  const bytes = new TextEncoder().encode(password);
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(hash), byte => byte.toString(16).padStart(2, "0")).join("");
}

