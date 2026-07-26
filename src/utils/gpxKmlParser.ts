export interface ParsedPlace {
  title: string;
  description?: string;
  latitude: number;
  longitude: number;
  category?: string;
}

export function parseGeoJSON(content: string): ParsedPlace[] {
  try {
    const geojson = JSON.parse(content);
    const results: ParsedPlace[] = [];

    const features = geojson.type === "FeatureCollection" ? geojson.features : [geojson];

    for (const feature of features) {
      if (feature.geometry?.type === "Point") {
        const [lon, lat] = feature.geometry.coordinates;
        if (typeof lat === "number" && typeof lon === "number") {
          results.push({
            title: feature.properties?.name || feature.properties?.title || "Ponto Importado",
            description: feature.properties?.description || feature.properties?.note || "",
            latitude: lat,
            longitude: lon,
            category: feature.properties?.category || "sightseeing",
          });
        }
      }
    }
    return results;
  } catch (error) {
    console.error("Erro ao analisar GeoJSON:", error);
    return [];
  }
}

export function parseGPX(content: string): ParsedPlace[] {
  try {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(content, "text/xml");
    const results: ParsedPlace[] = [];

    const waypoints = xmlDoc.getElementsByTagName("wpt");
    for (let i = 0; i < waypoints.length; i++) {
      const wpt = waypoints[i];
      const lat = parseFloat(wpt.getAttribute("lat") || "");
      const lon = parseFloat(wpt.getAttribute("lon") || "");
      const name = wpt.getElementsByTagName("name")[0]?.textContent || `Ponto ${i + 1}`;
      const desc = wpt.getElementsByTagName("desc")[0]?.textContent || "";

      if (!isNaN(lat) && !isNaN(lon)) {
        results.push({
          title: name,
          description: desc,
          latitude: lat,
          longitude: lon,
        });
      }
    }
    return results;
  } catch (error) {
    console.error("Erro ao analisar GPX:", error);
    return [];
  }
}

export function parseKML(content: string): ParsedPlace[] {
  try {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(content, "text/xml");
    const results: ParsedPlace[] = [];

    const placemarks = xmlDoc.getElementsByTagName("Placemark");
    for (let i = 0; i < placemarks.length; i++) {
      const pm = placemarks[i];
      const name = pm.getElementsByTagName("name")[0]?.textContent || `Local ${i + 1}`;
      const desc = pm.getElementsByTagName("description")[0]?.textContent || "";
      const coordinates = pm.getElementsByTagName("coordinates")[0]?.textContent?.trim() || "";

      if (coordinates) {
        const parts = coordinates.split(",");
        if (parts.length >= 2) {
          const lon = parseFloat(parts[0]);
          const lat = parseFloat(parts[1]);
          if (!isNaN(lat) && !isNaN(lon)) {
            results.push({
              title: name,
              description: desc.replace(/<[^>]*>?/gm, "").trim(), // Limpa tags HTML simples
              latitude: lat,
              longitude: lon,
            });
          }
        }
      }
    }
    return results;
  } catch (error) {
    console.error("Erro ao analisar KML:", error);
    return [];
  }
}
