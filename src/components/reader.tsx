"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type {
  MouseEvent as ReactMouseEvent,
  TouchEvent as ReactTouchEvent,
} from "react";
import type { NormalizedEntry } from "../lib/types";

const SWIPE_DISTANCE_PX = 70;
const SWIPE_MAX_DURATION_MS = 500;
const SWIPE_INTENT_DISTANCE_PX = 4;
const SWIPE_MAX_OFFSET_PX = 48;

type SwipeDirection = "newer" | "older";
type TouchOrigin = { x: number; y: number; at: number };
type SwipePreview = {
  direction: SwipeDirection;
  offset: number;
  progress: number;
};

type EntryNavigationProps = {
  label: string;
  className: string;
  currentIndex: number;
  entryCount: number;
  onNewer: () => void;
  onOlder: () => void;
};

function EntryNavigation({
  label,
  className,
  currentIndex,
  entryCount,
  onNewer,
  onOlder,
}: EntryNavigationProps) {
  return (
    <nav className={className} aria-label={label}>
      <button
        className="nav-button"
        type="button"
        aria-label="Newer entry"
        aria-keyshortcuts="ArrowRight"
        disabled={currentIndex === 0}
        onClick={onNewer}
      >
        Newer <span aria-hidden="true">→</span>
      </button>
      <button
        className="nav-button"
        type="button"
        aria-label="Older entry"
        aria-keyshortcuts="ArrowLeft"
        disabled={currentIndex === entryCount - 1}
        onClick={onOlder}
      >
        <span aria-hidden="true">←</span> Older
      </button>
    </nav>
  );
}

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
  const [swipePreview, setSwipePreview] = useState<SwipePreview | null>(null);
  const touchOrigin = useRef<TouchOrigin | null>(null);
  const suppressClickUntil = useRef(0);
  const currentEntry = entries[currentIndex];
  const previousEntryId = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const currentEntryId = currentEntry?.id ?? null;
    if (
      previousEntryId.current !== undefined &&
      previousEntryId.current !== currentEntryId
    ) {
      window.scrollTo(0, 0);
    }
    previousEntryId.current = currentEntryId;
  }, [currentEntry?.id]);

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

  const onTouchStart = (event: ReactTouchEvent<HTMLElement>) => {
    suppressClickUntil.current = 0;
    setSwipePreview(null);
    if (event.touches.length !== 1) {
      touchOrigin.current = null;
      return;
    }

    const touch = event.touches[0];
    if (!touch) return;
    touchOrigin.current = {
      x: touch.clientX,
      y: touch.clientY,
      at: Date.now(),
    };
  };

  const onTouchMove = (event: ReactTouchEvent<HTMLElement>) => {
    const start = touchOrigin.current;
    const touch = event.touches[0];
    if (!start || !touch || event.touches.length !== 1) {
      setSwipePreview(null);
      return;
    }

    const deltaX = touch.clientX - start.x;
    const deltaY = touch.clientY - start.y;
    if (
      Math.abs(deltaX) < SWIPE_INTENT_DISTANCE_PX ||
      Math.abs(deltaX) <= Math.abs(deltaY)
    ) {
      setSwipePreview(null);
      return;
    }

    const direction: SwipeDirection = deltaX < 0 ? "older" : "newer";
    const canNavigate = direction === "older"
      ? currentIndex < entries.length - 1
      : currentIndex > 0;
    if (!canNavigate) {
      setSwipePreview(null);
      return;
    }

    const progress = Math.min(Math.abs(deltaX) / SWIPE_DISTANCE_PX, 1);
    const offset = Math.sign(deltaX) * Math.min(
      Math.abs(deltaX) * 0.45,
      SWIPE_MAX_OFFSET_PX,
    );
    setSwipePreview({ direction, offset, progress });
  };

  const onTouchEnd = (event: ReactTouchEvent<HTMLElement>) => {
    const start = touchOrigin.current;
    const touch = event.changedTouches[0];
    touchOrigin.current = null;
    setSwipePreview(null);
    if (!start || !touch) return;

    const deltaX = touch.clientX - start.x;
    const deltaY = touch.clientY - start.y;
    const elapsed = Date.now() - start.at;
    if (
      Math.abs(deltaX) < SWIPE_DISTANCE_PX ||
      Math.abs(deltaX) <= Math.abs(deltaY) ||
      elapsed > SWIPE_MAX_DURATION_MS
    ) {
      return;
    }

    if (deltaX < 0 && currentIndex < entries.length - 1) {
      suppressClickUntil.current = Date.now() + SWIPE_MAX_DURATION_MS;
      goOlder();
    } else if (deltaX > 0 && currentIndex > 0) {
      suppressClickUntil.current = Date.now() + SWIPE_MAX_DURATION_MS;
      goNewer();
    }
  };

  const onTouchCancel = () => {
    touchOrigin.current = null;
    setSwipePreview(null);
  };

  const onClickCapture = (event: ReactMouseEvent<HTMLElement>) => {
    if (event.detail === 0 || Date.now() > suppressClickUntil.current) return;
    suppressClickUntil.current = 0;
    event.preventDefault();
    event.stopPropagation();
  };

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
        if (event.key === "ArrowLeft" && currentIndex < entries.length - 1) {
        event.preventDefault();
        goOlder();
        } else if (event.key === "ArrowRight" && currentIndex > 0) {
        event.preventDefault();
        goNewer();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [currentIndex, entries.length, goNewer, goOlder]);

  if (!currentEntry) {
    return (
      <main
        className="reader-shell"
        aria-label="Feed reader"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onTouchCancel={onTouchCancel}
        onClickCapture={onClickCapture}
      >
        <header className="reader-header">
          <div className="header-brand">
            <span className="brand">jqfeed</span>
            <span className="reader-meta">RSS · Atom</span>
          </div>
          <span className="position-label position-label-top" aria-hidden="true">
            0 entries
          </span>
        </header>
        <section className="empty-state" role="status">
          <div className="empty-mark" aria-hidden="true">j</div>
          <h1>A little room to read.</h1>
          <p>
            No entries yet. Add your feeds and their transformers in <code>src/lib/feeds.ts</code>.
          </p>
        </section>
        <footer className="reader-footer">
          <span className="position-label" aria-live="polite">0 entries</span>
        </footer>
      </main>
    );
  }

  return (
    <main
      className="reader-shell"
      aria-label="Feed reader"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onTouchCancel={onTouchCancel}
      onClickCapture={onClickCapture}
    >
      <header className="reader-header">
        <div className="header-brand">
          <span className="brand">jqfeed</span>
          <span className="reader-meta">RSS · Atom</span>
        </div>
        <div className="reader-header-actions">
          <span className="position-label position-label-top" aria-hidden="true">
            {currentIndex + 1} of {entries.length}
          </span>
          <EntryNavigation
            label="Top entry navigation"
            className="reader-controls reader-controls-top"
            currentIndex={currentIndex}
            entryCount={entries.length}
            onNewer={goNewer}
            onOlder={goOlder}
          />
        </div>
      </header>

      <div className="reader-main">
        {swipePreview && (
          <div
            className={`swipe-cue swipe-cue-${swipePreview.direction}`}
            style={{ opacity: Math.max(0.15, swipePreview.progress) }}
            aria-hidden="true"
          >
            {swipePreview.direction === "older" ? (
              <><span>←</span> Older</>
            ) : (
              <>Newer <span>→</span></>
            )}
          </div>
        )}
        <article
          className={`entry-card${swipePreview ? " is-swiping" : ""}`}
          key={currentEntry.id}
          aria-live="polite"
          style={{ transform: `translate3d(${swipePreview?.offset ?? 0}px, 0, 0)` }}
        >
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
        <EntryNavigation
          label="Bottom entry navigation"
          className="reader-controls"
          currentIndex={currentIndex}
          entryCount={entries.length}
          onNewer={goNewer}
          onOlder={goOlder}
        />
      </footer>
    </main>
  );
}
