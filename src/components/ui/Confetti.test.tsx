import { render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Confetti } from "./Confetti";

describe("Confetti", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("does not render or animate when reduced motion is requested", () => {
    const matchMedia = vi.fn().mockReturnValue({
      matches: true,
      media: "(prefers-reduced-motion: reduce)",
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    });
    Object.defineProperty(window, "matchMedia", { configurable: true, value: matchMedia });
    const requestFrame = vi.spyOn(window, "requestAnimationFrame");

    const { container } = render(<Confetti active />);

    expect(container.querySelector("canvas")).not.toBeInTheDocument();
    expect(requestFrame).not.toHaveBeenCalled();
  });
});
