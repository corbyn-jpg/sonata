import { takeTurn } from "./turns";

describe("takeTurn", () => {
  it("pauses the previous player when another starts", () => {
    const a = {};
    const b = {};
    const pauseA = jest.fn();
    takeTurn(a, pauseA);
    takeTurn(b, jest.fn());
    expect(pauseA).toHaveBeenCalledTimes(1);
  });

  it("doesn't pause a player that starts again", () => {
    const a = {};
    const pauseA = jest.fn();
    takeTurn(a, pauseA);
    takeTurn(a, pauseA);
    expect(pauseA).not.toHaveBeenCalled();
  });
});
