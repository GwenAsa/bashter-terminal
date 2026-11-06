import { beforeEach, describe, expect, it } from "vitest";
import { useTabs } from "./tabs";

const reset = () => {
  const id = crypto.randomUUID();
  useTabs.setState({ tabs: [{ id, title: "shell" }], activeId: id, empty: false });
  return id;
};

describe("tabs store", () => {
  let firstId: string;
  beforeEach(() => {
    firstId = reset();
  });

  it("adds a tab and activates it", () => {
    const id = useTabs.getState().addTab();
    expect(useTabs.getState().tabs).toHaveLength(2);
    expect(useTabs.getState().activeId).toBe(id);
  });

  it("closing the active tab focuses the left neighbour", () => {
    const second = useTabs.getState().addTab();
    useTabs.getState().closeTab(second);
    expect(useTabs.getState().activeId).toBe(firstId);
  });

  it("closing the last tab flags the store as empty", () => {
    useTabs.getState().closeTab(firstId);
    expect(useTabs.getState().empty).toBe(true);
  });

  it("cycles with wrap-around", () => {
    const second = useTabs.getState().addTab();
    useTabs.getState().cycle(1);
    expect(useTabs.getState().activeId).toBe(firstId);
    useTabs.getState().cycle(-1);
    expect(useTabs.getState().activeId).toBe(second);
  });

  it("ignores blank titles", () => {
    useTabs.getState().setTitle(firstId, "   ");
    expect(useTabs.getState().tabs[0].title).toBe("shell");
  });
});
