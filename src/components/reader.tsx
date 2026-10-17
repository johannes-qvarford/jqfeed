"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { TouchEvent as ReactTouchEvent } from "react";
import type { NormalizedEntry } from "../lib/types";

const SWIPE_DISTANCE_PX = 70;
const SWIPE_MAX_DURATION_MS = 500;

type TouchOrigin = { x: number; y: number; at: number };

function formatDate(value: string | null): string {
  if (!value) return "Date unavailable";
  return `${new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(new Date(value))} UTC`;
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.isContentEditable ||
    ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)
  );
}

export function Reader({ entries }: { entries: NormalizedEntry[] }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const touchOrigin = useRef<TouchOrigin | null>(null);
  const currentEntry = entries[currentIndex];

  const goTo = useCallback(
    (index: number) => {
      if (index < 0 || index >= entries.length || index === currentIndex) return;
      setCurrentIndex(index);
      if (typeof window !== "undefined") {
        window.history.pushState(null, "", `#${entries[index].id}`);
      }
    },
    [currentIndex, entries],
  );

  const goOlder = useCallback(() => goTo(currentIndex + 1), [currentIndex, goTo]);
  const goNewer = useCallback(() => goTo(currentIndex - 1), [currentIndex, goTo]);

  useEffect(() => {
    const syncFromLocation = () => {
      const entryId = window.location.hash.slice(1);
      if (!entryId) {
        setCurrentIndex(0);
        return;
      }
      const index = entries.findIndex((entry) => entry.id === entryId);
      if (index >= 0) setCurrentIndex(index);
    };

    syncFromLocation();
    window.addEventListener("popstate", syncFromLocation);
    window.addEventListener("hashchange", syncFromLocation);
    return () => {
      window.removeEventListener("popstate", syncFromLocation);
      window.removeEventListener("hashchange", syncFromLocation);
    };
  }, [entries]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (isTypingTarget(event.target)) return;
      if (event.key === "ArrowUp" && currentIndex < entries.length - 1) {
        event.preventDefault();
        goOlder();
      } else if (event.key === "ArrowDown" && currentIndex > 0) {
        event.preventDefault();
        goNewer();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [currentIndex, entries.length, goNewer, goOlder]);

  const onTouchStart = (event: ReactTouchEvent<HTMLElement>) => {
    const touch = event.touches[0];
    if (!touch) return;
    touchOrigin.current = { x: touch.clientX, y: touch.clientY, at: Date.now() };
  };

  const onTouchEnd = (event: ReactTouchEvent<HTMLElement>) => {
    const start = touchOrigin.current;
    const touch = event.changedTouches[0];
    touchOrigin.current = null;
    if (!start || !touch) return;

    const deltaX = touch.clientX - start.x;
    const deltaY = touch.clientY - start.y;
    const elapsed = Date.now() - start.at;
    if (
      Math.abs(deltaY) < SWIPE_DISTANCE_PX ||
      Math.abs(deltaX) > Math.abs(deltaY) * 0.8 ||
      elapsed > SWIPE_MAX_DURATION_MS
    ) {
      return;
    }

    if (deltaY < 0) goOlder();
    else goNewer();
  };

  const onTouchCancel = () => {
    touchOrigin.current = null;
  };

  if (!currentEntry) {
    return (
      <main className="reader-shell" aria-label="Feed reader">
        <header className="reader-header">
          <span className="brand">jqfeed</span>
          <span>RSS · Atom</span>
        </header>
        <section className="empty-state" role="status">
          <div className="empty-mark" aria-hidden="true">j</div>
          <h1>A little room to read.</h1>
          <p>
            No entries yet. Add your feeds and their transformers in <code>src/lib/feeds.ts</code>.
          </p>
        </section>
        <footer className="reader-footer">
          <span className="position-label">0 entries</span>
        </footer>
      </main>
    );
  }

  return (
    <main
      className="reader-shell"
      aria-label="Feed reader"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      onTouchCancel={onTouchCancel}
    >
      <header className="reader-header">
        <span className="brand">jqfeed</span>
        <span>RSS · Atom</span>
      </header>

      <div className="reader-main">
        <article className="entry-card" key={currentEntry.id} aria-live="polite">
          <div className="entry-byline">
            <span className="feed-name">{currentEntry.feedName}</span>
            <span className="byline-dot" aria-hidden="true" />
            <time dateTime={currentEntry.publishedAt ?? undefined}>
              {formatDate(currentEntry.publishedAt)}
            </time>
          </div>
          <h1 className="entry-title">{currentEntry.title}</h1>
          <a className="source-link" href={currentEntry.url} target="_blank" rel="noreferrer">
            Read at source <span aria-hidden="true">↗</span>
          </a>
          <div className="article-panel">
            <div
              className="article-content"
              dangerouslySetInnerHTML={{ __html: currentEntry.contentHtml }}
            />
          </div>
        </article>
      </div>

      <footer className="reader-footer">
        <span className="position-label" aria-live="polite">
          {currentIndex + 1} of {entries.length}
        </span>
        <nav className="reader-controls" aria-label="Entry navigation">
          <button
            className="nav-button"
            type="button"
            aria-label="Newer entry"
            aria-keyshortcuts="ArrowDown"
            disabled={currentIndex === 0}
            onClick={goNewer}
          >
            <span aria-hidden="true">↓</span> Newer
          </button>
          <button
            className="nav-button"
            type="button"
            aria-label="Older entry"
            aria-keyshortcuts="ArrowUp"
            disabled={currentIndex === entries.length - 1}
            onClick={goOlder}
          >
            Older <span aria-hidden="true">↑</span>
          </button>
        </nav>
      </footer>
    </main>
  );
}
