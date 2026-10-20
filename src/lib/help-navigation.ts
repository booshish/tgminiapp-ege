import type { ViewportPosition } from "./viewport-position";

export type HelpOrigin = { hash: string; position: ViewportPosition };
type StoragePort = Pick<Storage, "getItem" | "setItem" | "removeItem">;
type DocumentPort = Pick<Document, "getElementById">;
type StoredContainer = { locator: string; left: number; top: number };
export type StoredHelpOrigin = {
  version: 1;
  hash: string;
  position: { left: number; top: number; containers: StoredContainer[] };
};

export const helpOriginStorageKey = "tochka-help-origin-v1";
const maximumPosition = 10_000_000;

function object(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function validHash(value: unknown): value is string {
  if (typeof value !== "string" || value.length > 4096 || /[\u0000-\u001f\u007f]/.test(value)) return false;
  if (value === "") return true; // The initial home route has no fragment.
  return /^#\/(?:home|catalog|theory|trainer|progress|profile|premium)(?:\?[^#]*)?$/.test(value)
    || /^#\/tasks\/\d{1,6}(?:\?[^#]*)?$/.test(value);
}

function coordinate(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value)
    && value >= 0 && value <= maximumPosition;
}

function locator(value: unknown): value is string {
  return typeof value === "string"
    && /^(?:id:[a-zA-Z][a-zA-Z0-9:_-]{0,100}|ancestor:(?:[0-9]|[12][0-9]|3[01]))$/.test(value);
}

/** Validate storage as data. Locators are IDs/depths, never arbitrary selectors or code. */
export function parseHelpOrigin(raw: string | null): StoredHelpOrigin | null {
  if (!raw || raw.length > 20_000) return null;
  try {
    const value = object(JSON.parse(raw));
    const position = object(value?.position);
    if (!value || value.version !== 1 || !validHash(value.hash) || !position
      || !coordinate(position.left) || !coordinate(position.top)
      || !Array.isArray(position.containers) || position.containers.length > 32) return null;
    const containers: StoredContainer[] = [];
    const seen = new Set<string>();
    for (const entry of position.containers) {
      const item = object(entry);
      if (!item || !locator(item.locator) || !coordinate(item.left)
        || !coordinate(item.top) || seen.has(item.locator)) continue;
      seen.add(item.locator);
      containers.push({ locator: item.locator, left: item.left, top: item.top });
    }
    return { version: 1, hash: value.hash, position: {
      left: position.left, top: position.top, containers,
    } };
  } catch {
    return null;
  }
}

/** DOM references from captureViewportPosition are replaced with stable, bounded locators. */
export function encodeHelpOrigin(origin: HelpOrigin): string | null {
  if (!validHash(origin.hash) || !origin.position || !Array.isArray(origin.position.containers)
    || origin.position.containers.length > 32) return null;
  const { left, top } = origin.position;
  if (!Number.isFinite(left) || !Number.isFinite(top)) return null;
  const clamp = (value: number) => Math.min(maximumPosition, Math.max(0, value));
  const containers: StoredContainer[] = [];
  for (const [depth, item] of origin.position.containers.entries()) {
    if (!item.element || !Number.isFinite(item.left) || !Number.isFinite(item.top)) continue;
    const id = item.element.id;
    const elementLocator = typeof id === "string" && /^[a-zA-Z][a-zA-Z0-9:_-]{0,100}$/.test(id)
      ? `id:${id}`
      : `ancestor:${depth}`;
    containers.push({ locator: elementLocator, left: clamp(item.left), top: clamp(item.top) });
  }
  return JSON.stringify({ version: 1, hash: origin.hash,
    position: { left: clamp(left), top: clamp(top), containers } });
}

function storageOrDefault(storage?: StoragePort): StoragePort | null {
  return storage ?? (typeof window === "undefined" ? null : window.sessionStorage);
}

/** Preserve origin across a reload of Help, without changing history or the current screen. */
export function saveHelpOrigin(origin: HelpOrigin, storage?: StoragePort): boolean {
  try {
    const raw = encodeHelpOrigin(origin);
    const target = storageOrDefault(storage);
    if (!raw || !target) return false;
    target.setItem(helpOriginStorageKey, raw);
    return true;
  } catch {
    return false;
  }
}

export function loadHelpOrigin(storage?: StoragePort, dom?: DocumentPort): HelpOrigin | null {
  try {
    const target = storageOrDefault(storage);
    if (!target) return null;
    const stored = parseHelpOrigin(target.getItem(helpOriginStorageKey));
    if (!stored) return null;
    const currentDocument = dom ?? (typeof document === "undefined" ? null : document);
    const containers: ViewportPosition["containers"] = [];
    for (const entry of stored.position.containers) {
      let element: HTMLElement | null = null;
      if (entry.locator.startsWith("id:")) {
        element = currentDocument?.getElementById(entry.locator.slice(3)) ?? null;
      } else {
        element = currentDocument?.getElementById("main-content") ?? null;
        for (let depth = Number(entry.locator.slice(9)); depth > 0 && element; depth--)
          element = element.parentElement;
      }
      if (element?.isConnected) containers.push({ element, left: entry.left, top: entry.top });
    }
    return { hash: stored.hash, position: {
      left: stored.position.left, top: stored.position.top, containers,
    } };
  } catch {
    return null;
  }
}

/** Call after leaving Help so a future direct visit cannot reuse an unrelated origin. */
export function clearHelpOrigin(storage?: StoragePort): boolean {
  try {
    const target = storageOrDefault(storage);
    if (!target) return false;
    target.removeItem(helpOriginStorageKey);
    return true;
  } catch {
    return false;
  }
}
