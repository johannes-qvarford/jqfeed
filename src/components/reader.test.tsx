import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Reader } from "./reader";
import type { NormalizedEntry } from "../lib/types";

const entries: NormalizedEntry[] = [
  {
    id: "newest",
    feedId: "news",
    feedName: "Daily Notes",
    title: "Newest story",
    url: "https://example.com/newest",
    publishedAt: "2026-10-17T08:00:00.000Z",
    contentHtml: "<p>Newest body</p>",
  },
  {
    id: "older",
    feedId: "news",
    feedName: "Daily Notes",
    title: "Older story",
    url: "https://example.com/older",
    publishedAt: "2026-10-16T08:00:00.000Z",
    contentHtml: "<p>Older body</p>",
  },
];

beforeEach(() => {
  vi.spyOn(window, "scrollTo").mockImplementation(() => {});
});

afterEach(() => {
  cleanup();
  window.history.replaceState(null, "", "/");
  vi.useRealTimers();
  vi.restoreAllMocks();
});

function touch(x: number, y: number) {
  return [{ identifier: 1, target: window.document.body, clientX: x, clientY: y }];
}

describe("Reader", () => {
  it("shows the current position at the top and footer and scrolls on article changes", () => {
    const { container } = render(<Reader entries={entries} />);
    const topPosition = container.querySelector(".reader-header .position-label");
    const footerPosition = container.querySelector(".reader-footer .position-label");

    expect(topPosition).toHaveTextContent("1 of 2");
    expect(footerPosition).toHaveTextContent("1 of 2");
    expect(window.scrollTo).not.toHaveBeenCalled();

    fireEvent.click(
      within(screen.getByRole("navigation", { name: "Top entry navigation" }))
        .getByRole("button", { name: "Older entry" }),
    );
    expect(screen.getByRole("heading", { name: "Older story" })).toBeInTheDocument();
    expect(topPosition).toHaveTextContent("2 of 2");
    expect(footerPosition).toHaveTextContent("2 of 2");
    expect(window.scrollTo).toHaveBeenCalledWith(0, 0);

    window.history.replaceState(null, "", "/#newest");
    fireEvent(window, new PopStateEvent("popstate"));
    expect(screen.getByRole("heading", { name: "Newest story" })).toBeInTheDocument();
    expect(topPosition).toHaveTextContent("1 of 2");
    expect(footerPosition).toHaveTextContent("1 of 2");
    expect(window.scrollTo).toHaveBeenCalledTimes(2);

    fireEvent.keyDown(window, { key: "ArrowLeft" });
    expect(screen.getByRole("heading", { name: "Older story" })).toBeInTheDocument();
    expect(window.scrollTo).toHaveBeenCalledTimes(3);
  });

  it("does not scroll for a navigation attempt that cannot change the article", () => {
    render(<Reader entries={entries} />);

    fireEvent.keyDown(window, { key: "ArrowRight" });

    expect(screen.getByRole("heading", { name: "Newest story" })).toBeInTheDocument();
    expect(window.scrollTo).not.toHaveBeenCalled();
  });

  it("uses left and right keyboard shortcuts to match the navigation controls", () => {
    render(<Reader entries={entries} />);
    const topNavigationElement = screen.getByRole("navigation", {
      name: "Top entry navigation",
    });
    const topNavigation = within(topNavigationElement);

    expect(topNavigationElement.closest("header")?.tagName).toBe("HEADER");
    expect(screen.getByRole("heading", { name: "Newest story" })).toBeInTheDocument();
    expect(topNavigation.getByRole("button", { name: "Newer entry" })).toBeDisabled();
    expect(topNavigation.getByRole("button", { name: "Newer entry" })).toHaveAttribute(
      "aria-keyshortcuts",
      "ArrowRight",
    );
    expect(topNavigation.getByRole("button", { name: "Older entry" })).toHaveAttribute(
      "aria-keyshortcuts",
      "ArrowLeft",
    );
    expect(topNavigation.getByRole("button", { name: "Older entry" })).toHaveTextContent("← Older");

    fireEvent.click(topNavigation.getByRole("button", { name: "Older entry" }));
    expect(screen.getByRole("heading", { name: "Older story" })).toBeInTheDocument();
    fireEvent.keyDown(window, { key: "ArrowRight" });
    expect(screen.getByRole("heading", { name: "Newest story" })).toBeInTheDocument();
    fireEvent.keyDown(window, { key: "ArrowLeft" });
    expect(screen.getByRole("heading", { name: "Older story" })).toBeInTheDocument();

    fireEvent.keyDown(window, { key: "ArrowUp" });
    fireEvent.keyDown(window, { key: "ArrowDown" });
    expect(screen.getByRole("heading", { name: "Older story" })).toBeInTheDocument();
  });

  it("shows swipe feedback before the navigation threshold and returns on a short drag", () => {
    const { container } = render(<Reader entries={entries} />);
    const articleContent = screen.getByText("Newest body");
    const reader = screen.getByRole("main", { name: "Feed reader" });

    fireEvent.touchStart(articleContent, { touches: touch(220, 240) });
    fireEvent.touchMove(articleContent, { touches: touch(205, 240) });

    expect(screen.getByRole("heading", { name: "Newest story" })).toBeInTheDocument();
    expect(container.querySelector(".swipe-cue")).toHaveTextContent("Older");
    expect(screen.getByRole("article").style.transform).toBe("translate3d(-6.75px, 0, 0)");

    fireEvent.touchEnd(reader, { changedTouches: touch(205, 240) });
    expect(screen.getByRole("heading", { name: "Newest story" })).toBeInTheDocument();
    expect(container.querySelector(".swipe-cue")).not.toBeInTheDocument();
    expect(screen.getByRole("article").style.transform).toBe("translate3d(0px, 0, 0)");
  });

  it("uses left for older and right for newer from different reader areas", () => {
    render(<Reader entries={entries} />);
    const reader = screen.getByRole("main", { name: "Feed reader" });
    const brand = screen.getByText("jqfeed");
    const articleBody = screen.getByText("Newest body");

    fireEvent.touchStart(articleBody, { touches: touch(220, 240) });
    fireEvent.touchMove(articleBody, { touches: touch(190, 240) });
    fireEvent.touchEnd(reader, { changedTouches: touch(130, 240) });
    expect(screen.getByRole("heading", { name: "Older story" })).toBeInTheDocument();

    fireEvent.touchStart(brand, { touches: touch(80, 30) });
    fireEvent.touchMove(brand, { touches: touch(110, 30) });
    fireEvent.touchEnd(reader, { changedTouches: touch(170, 30) });
    expect(screen.getByRole("heading", { name: "Newest story" })).toBeInTheDocument();

    const positionLabel = document.querySelector(".reader-footer .position-label")!;
    fireEvent.touchStart(positionLabel, { touches: touch(220, 520) });
    fireEvent.touchMove(positionLabel, { touches: touch(190, 520) });
    fireEvent.touchEnd(reader, { changedTouches: touch(130, 520) });
    expect(screen.getByRole("heading", { name: "Older story" })).toBeInTheDocument();
    expect(window.scrollTo).toHaveBeenCalledTimes(3);
  });

  it("leaves vertical movement for page scrolling and ignores slow swipes", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-17T12:00:00Z"));
    render(<Reader entries={entries} />);
    const reader = screen.getByRole("main", { name: "Feed reader" });

    fireEvent.touchStart(reader, { touches: touch(220, 260) });
    fireEvent.touchMove(reader, { touches: touch(218, 160) });
    fireEvent.touchEnd(reader, { changedTouches: touch(218, 160) });
    expect(screen.getByRole("heading", { name: "Newest story" })).toBeInTheDocument();

    fireEvent.touchStart(reader, { touches: touch(220, 260) });
    fireEvent.touchMove(reader, { touches: touch(160, 260) });
    fireEvent.touchEnd(reader, { changedTouches: touch(160, 260) });
    expect(screen.getByRole("heading", { name: "Newest story" })).toBeInTheDocument();

    fireEvent.touchStart(reader, { touches: touch(220, 260) });
    fireEvent.touchMove(reader, { touches: touch(130, 260) });
    vi.advanceTimersByTime(600);
    fireEvent.touchEnd(reader, { changedTouches: touch(120, 260) });
    expect(screen.getByRole("heading", { name: "Newest story" })).toBeInTheDocument();
  });

  it("clears swipe feedback when a touch is canceled", () => {
    const { container } = render(<Reader entries={entries} />);
    const reader = screen.getByRole("main", { name: "Feed reader" });

    fireEvent.touchStart(reader, { touches: touch(220, 260) });
    fireEvent.touchMove(reader, { touches: touch(190, 260) });
    expect(container.querySelector(".swipe-cue")).toBeInTheDocument();

    fireEvent.touchCancel(reader);
    expect(container.querySelector(".swipe-cue")).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Newest story" })).toBeInTheDocument();
  });

  it("respects entry bounds and suppresses the click after a completed swipe", () => {
    render(<Reader entries={entries} />);
    const reader = screen.getByRole("main", { name: "Feed reader" });

    fireEvent.touchStart(reader, { touches: touch(220, 260) });
    fireEvent.touchMove(reader, { touches: touch(130, 260) });
    fireEvent.touchEnd(reader, { changedTouches: touch(120, 260) });
    expect(screen.getByRole("heading", { name: "Older story" })).toBeInTheDocument();

    const clickWasAllowed = fireEvent.click(reader, { detail: 1 });
    expect(clickWasAllowed).toBe(false);

    fireEvent.touchStart(reader, { touches: touch(220, 260) });
    fireEvent.touchMove(reader, { touches: touch(130, 260) });
    fireEvent.touchEnd(reader, { changedTouches: touch(120, 260) });
    expect(screen.getByRole("heading", { name: "Older story" })).toBeInTheDocument();

    fireEvent.touchStart(reader, { touches: touch(120, 260) });
    fireEvent.touchMove(reader, { touches: touch(210, 260) });
    fireEvent.touchEnd(reader, { changedTouches: touch(220, 260) });
    expect(screen.getByRole("heading", { name: "Newest story" })).toBeInTheDocument();

    fireEvent.touchStart(reader, { touches: touch(120, 260) });
    fireEvent.touchMove(reader, { touches: touch(210, 260) });
    fireEvent.touchEnd(reader, { changedTouches: touch(220, 260) });
    expect(screen.getByRole("heading", { name: "Newest story" })).toBeInTheDocument();
  });

  it("renders an empty state when there are no configured feeds", () => {
    const { container } = render(<Reader entries={[]} />);
    expect(screen.getByRole("status")).toHaveTextContent("No entries yet");
    expect(screen.getByText("src/lib/feeds.ts")).toBeInTheDocument();
    expect(container.querySelector(".reader-header .position-label")).toHaveTextContent(
      "0 entries",
    );
    expect(container.querySelector(".reader-footer .position-label")).toHaveTextContent(
      "0 entries",
    );
  });
});
