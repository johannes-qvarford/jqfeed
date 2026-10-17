import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
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

afterEach(() => {
  cleanup();
  window.history.replaceState(null, "", "/");
});

function touch(x: number, y: number) {
  return [{ identifier: 1, target: window.document.body, clientX: x, clientY: y }];
}

describe("Reader", () => {
  it("starts at the latest entry and navigates with buttons and keyboard arrows", () => {
    render(<Reader entries={entries} />);
    const topNavigation = within(
      screen.getByRole("navigation", { name: "Top entry navigation" }),
    );

    expect(screen.getByRole("heading", { name: "Newest story" })).toBeInTheDocument();
    expect(topNavigation.getByRole("button", { name: "Newer entry" })).toBeDisabled();
    fireEvent.click(topNavigation.getByRole("button", { name: "Older entry" }));
    expect(screen.getByRole("heading", { name: "Older story" })).toBeInTheDocument();
    fireEvent.keyDown(window, { key: "ArrowDown" });
    expect(screen.getByRole("heading", { name: "Newest story" })).toBeInTheDocument();
  });

  it("uses a quick upward swipe for older and a downward swipe for newer", () => {
    render(<Reader entries={entries} />);
    const reader = screen.getByRole("main", { name: "Feed reader" });

    fireEvent.touchStart(reader, { touches: touch(120, 260) });
    fireEvent.touchEnd(reader, { changedTouches: touch(118, 170) });
    expect(screen.getByRole("heading", { name: "Older story" })).toBeInTheDocument();

    fireEvent.touchStart(reader, { touches: touch(118, 170) });
    fireEvent.touchEnd(reader, { changedTouches: touch(120, 260) });
    expect(screen.getByRole("heading", { name: "Newest story" })).toBeInTheDocument();
  });

  it("leaves slow vertical movement for scrolling and respects navigation bounds", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-17T12:00:00Z"));
    render(<Reader entries={entries} />);
    const bottomNavigation = within(
      screen.getByRole("navigation", { name: "Bottom entry navigation" }),
    );
    const reader = screen.getByRole("main", { name: "Feed reader" });

    fireEvent.touchStart(reader, { touches: touch(120, 260) });
    vi.advanceTimersByTime(600);
    fireEvent.touchEnd(reader, { changedTouches: touch(120, 160) });
    expect(screen.getByRole("heading", { name: "Newest story" })).toBeInTheDocument();

    fireEvent.click(bottomNavigation.getByRole("button", { name: "Older entry" }));
    expect(bottomNavigation.getByRole("button", { name: "Older entry" })).toBeDisabled();
    fireEvent.keyDown(window, { key: "ArrowUp" });
    expect(screen.getByRole("heading", { name: "Older story" })).toBeInTheDocument();
    vi.useRealTimers();
  });

  it("renders an empty state when there are no configured feeds", () => {
    render(<Reader entries={[]} />);
    expect(screen.getByRole("status")).toHaveTextContent("No entries yet");
    expect(screen.getByText("src/lib/feeds.ts")).toBeInTheDocument();
  });
});
