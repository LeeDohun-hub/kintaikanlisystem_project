const STORAGE_KEY = "kintai_board_starred_post_ids";

function readIds() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.map(Number).filter((n) => Number.isFinite(n)) : [];
  } catch {
    return [];
  }
}

function writeIds(ids) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...new Set(ids)]));
}

export function getStarredPostIdSet() {
  return new Set(readIds());
}

export function isPostStarred(postId) {
  return getStarredPostIdSet().has(Number(postId));
}

/** @returns {boolean} new starred state */
export function togglePostStar(postId) {
  const id = Number(postId);
  const set = getStarredPostIdSet();
  if (set.has(id)) {
    set.delete(id);
    writeIds([...set]);
    return false;
  }
  set.add(id);
  writeIds([...set]);
  return true;
}
