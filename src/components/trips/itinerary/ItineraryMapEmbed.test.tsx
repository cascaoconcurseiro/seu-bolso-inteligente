import "@testing-library/jest-dom";
import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ItineraryMapEmbed } from "./ItineraryMapEmbed";

describe("ItineraryMapEmbed", () => {
  it("registra os listeners de conectividade uma vez e os remove ao desmontar", () => {
    const addSpy = vi.spyOn(window, "addEventListener");
    const removeSpy = vi.spyOn(window, "removeEventListener");
    const props = {
      stops: [],
      destination: "Lisboa",
      geocoded: null,
      mode: "day" as const,
      onModeChange: vi.fn(),
      totalKmEstimate: 0,
      totalMinEstimate: 0,
    };

    const { rerender, unmount } = render(<ItineraryMapEmbed {...props} />);
    rerender(<ItineraryMapEmbed {...props} destination="Porto" />);

    expect(addSpy.mock.calls.filter(([type]) => type === "online")).toHaveLength(1);
    expect(addSpy.mock.calls.filter(([type]) => type === "offline")).toHaveLength(1);

    const onlineHandler = addSpy.mock.calls.find(([type]) => type === "online")?.[1];
    const offlineHandler = addSpy.mock.calls.find(([type]) => type === "offline")?.[1];
    unmount();

    expect(removeSpy).toHaveBeenCalledWith("online", onlineHandler);
    expect(removeSpy).toHaveBeenCalledWith("offline", offlineHandler);
  });
});
