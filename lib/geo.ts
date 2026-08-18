/**
 * Validacion de coordenadas geograficas para nagomu.
 *
 * Modulo puro: no conoce Prisma ni la base. Se prueba sin infraestructura. La coordenada
 * ubica infraestructura afectada, obras o puntos de entrega — nunca a una persona
 * (Principio IV de la constitucion).
 *
 * La coordenada es opcional y ATOMICA: o vienen latitud y longitud las dos, o ninguna.
 * Una sola coordenada es un punto a medio digitar, no una ubicacion.
 */

export type Coordenada = { latitud: number; longitud: number };

/**
 * Interpreta un par de campos de formulario.
 *
 * - Ambos vacios  -> `null`        (el item simplemente no tendra coordenada)
 * - Ambos validos -> `Coordenada`
 * - Cualquier otro caso -> `"invalido"` (uno solo, no numerico, o fuera de rango)
 *
 * No convierte una entrada mala en cero en silencio: (0, 0) es una coordenada real
 * en el golfo de Guinea, no un "sin dato".
 */
export function parsearCoordenada(
  latBruta: string,
  lonBruta: string,
): Coordenada | null | "invalido" {
  const lat = latBruta.trim();
  const lon = lonBruta.trim();

  if (lat === "" && lon === "") return null;
  if (lat === "" || lon === "") return "invalido";

  const latitud = Number(lat);
  const longitud = Number(lon);

  if (!esNumeroFinito(latitud) || !esNumeroFinito(longitud)) return "invalido";
  if (latitud < -90 || latitud > 90) return "invalido";
  if (longitud < -180 || longitud > 180) return "invalido";

  return { latitud, longitud };
}

function esNumeroFinito(valor: number): boolean {
  return Number.isFinite(valor);
}
