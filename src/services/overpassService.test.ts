import { describe, expect, it } from "vitest";
import {
  buildGoogleMapsUrl,
  isSafeGoogleMapsUrl,
  parseGoogleMapsPlaceName,
  parseGoogleMapsUrl,
} from "./overpassService";

describe("Google Maps helpers", () => {
  it("prioriza as coordenadas exatas do lugar em vez do centro da visualização", () => {
    expect(
      parseGoogleMapsUrl(
        "https://www.google.com/maps/place/Museu+do+Louvre/@48.8604,2.3376,15z/data=!3d48.8606111!4d2.337644"
      )
    ).toEqual({ lat: 48.8606111, lon: 2.337644 });
  });

  it("extrai e normaliza o nome presente em uma URL longa do Maps", () => {
    expect(
      parseGoogleMapsPlaceName(
        "https://www.google.com/maps/place/Museu+do+Louvre/@48.8604,2.3376,15z"
      )
    ).toBe("Museu do Louvre");
  });

  it("gera um link HTTPS canônico usando as coordenadas selecionadas", () => {
    expect(buildGoogleMapsUrl(48.8606111, 2.337644)).toBe(
      "https://www.google.com/maps/search/?api=1&query=48.8606111%2C2.337644"
    );
  });

  it("aceita somente links HTTPS de hosts conhecidos do Google Maps", () => {
    expect(isSafeGoogleMapsUrl("https://maps.app.goo.gl/abc123")).toBe(true);
    expect(isSafeGoogleMapsUrl("https://www.google.com/maps/place/Louvre")).toBe(true);
    expect(isSafeGoogleMapsUrl("javascript:alert(1)")).toBe(false);
    expect(isSafeGoogleMapsUrl("https://google.com.evil.example/maps")).toBe(false);
    expect(isSafeGoogleMapsUrl("http://www.google.com/maps/place/Louvre")).toBe(false);
  });
});
