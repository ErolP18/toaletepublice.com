"use client";

import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { Search, X } from "lucide-react";
import { fetchPlaces } from "@/lib/geocode";
import {
  localSuggestions,
  mergeSuggestions,
  placeToSuggestion,
  suggestionKindLabels,
  type SearchSuggestion,
} from "@/lib/suggest";
import type { Toilet } from "@/lib/types";

type SearchBoxProps = {
  value: string;
  toilets?: Toilet[];
  placeholder: string;
  ariaLabel: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onPick: (suggestion: SearchSuggestion) => void;
};

export default function SearchBox({
  value,
  toilets = [],
  placeholder,
  ariaLabel,
  onChange,
  onSubmit,
  onPick,
}: SearchBoxProps) {
  const listId = useId();
  const rootRef = useRef<HTMLFormElement>(null);
  const skipFetch = useRef(false);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [remote, setRemote] = useState<SearchSuggestion[]>([]);

  const local = useMemo(() => localSuggestions(value, toilets), [toilets, value]);
  const items = useMemo(() => mergeSuggestions(local, remote), [local, remote]);

  useEffect(() => {
    if (skipFetch.current) {
      skipFetch.current = false;
      setRemote([]);
      return;
    }

    const needle = value.trim();
    if (needle.length < 2) {
      setRemote([]);
      setOpen(false);
      return;
    }

    setOpen(true);
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      void fetchPlaces(needle, controller.signal)
        .then((places) =>
          setRemote(places.map(placeToSuggestion).filter((item) => item !== null)),
        )
        .catch((error: unknown) => {
          if (controller.signal.aborted) return;
          if (error instanceof DOMException && error.name === "AbortError") return;
          setRemote([]);
        });
    }, 280);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [value]);

  useEffect(() => {
    function onPointer(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    window.addEventListener("pointerdown", onPointer);
    return () => window.removeEventListener("pointerdown", onPointer);
  }, []);

  useEffect(() => {
    setActive(0);
  }, [items]);

  function pick(suggestion: SearchSuggestion) {
    skipFetch.current = true;
    setOpen(false);
    setRemote([]);
    onChange(suggestion.query);
    onPick(suggestion);
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      if (open) {
        event.preventDefault();
        event.stopPropagation();
        setOpen(false);
      }
      return;
    }
    if (!open || items.length === 0) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((index) => (index + 1) % items.length);
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((index) => (index - 1 + items.length) % items.length);
      return;
    }
    if (event.key === "Enter" && items[active]) {
      event.preventDefault();
      pick(items[active]);
    }
  }

  const showList = open && items.length > 0;

  return (
    <form
      ref={rootRef}
      className="search search-wrap"
      onSubmit={(event) => {
        event.preventDefault();
        if (open && items[active]) {
          pick(items[active]);
          return;
        }
        setOpen(false);
        onSubmit();
      }}
    >
      <Search size={15} strokeWidth={2.2} />
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onFocus={() => {
          if (value.trim().length >= 2) setOpen(true);
        }}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        aria-label={ariaLabel}
        aria-autocomplete="list"
        aria-expanded={showList}
        aria-controls={listId}
        aria-activedescendant={showList ? `${listId}-${active}` : undefined}
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
      />
      {value ? (
        <button
          type="button"
          onClick={() => {
            skipFetch.current = true;
            setRemote([]);
            setOpen(false);
            onChange("");
          }}
          aria-label="Șterge căutarea"
        >
          <X size={14} />
        </button>
      ) : null}
      {showList ? (
        <ul className="suggest" id={listId} role="listbox">
          {items.map((item, index) => (
            <li key={item.id} role="presentation">
              <button
                type="button"
                id={`${listId}-${index}`}
                role="option"
                aria-selected={index === active}
                className={index === active ? "is-active" : ""}
                onMouseEnter={() => setActive(index)}
                onClick={() => pick(item)}
              >
                <span>
                  <strong>{item.title}</strong>
                  {item.subtitle ? <em>{item.subtitle}</em> : null}
                </span>
                <b>{suggestionKindLabels[item.kind]}</b>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </form>
  );
}
