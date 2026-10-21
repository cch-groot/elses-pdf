import type { PageInfo, Slot } from "./types";

/** Resolves a slot (content, function, `false` or nothing) to renderable content. */
export function resolveSlot(slot: Slot | false | undefined, info: PageInfo) {
  if (slot === false || slot === undefined) return null;
  return typeof slot === "function" ? slot(info) : slot;
}

const ASSET_TIMEOUT_MS = 5000;

/**
 * Resolves when fonts and images inside `root` are loaded, so heights are
 * measured after they have their final size. Never waits longer than 5s.
 */
export async function whenAssetsReady(root: HTMLElement): Promise<void> {
  const doc = root.ownerDocument;
  const tasks: Promise<unknown>[] = [];

  if (doc.fonts?.ready) tasks.push(doc.fonts.ready);

  root.querySelectorAll("img").forEach((img) => {
    if (img.complete) return;
    tasks.push(
      new Promise<void>((resolve) => {
        img.addEventListener("load", () => resolve(), { once: true });
        img.addEventListener("error", () => resolve(), { once: true });
      }),
    );
  });

  if (tasks.length === 0) return;

  await Promise.race([
    Promise.all(tasks),
    new Promise<void>((resolve) => setTimeout(resolve, ASSET_TIMEOUT_MS)),
  ]);
}
