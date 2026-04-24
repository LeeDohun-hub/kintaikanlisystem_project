/** お気に入りの掲示板（API category と一致） */
export const BOARD_FAVORITE_BOARDS = [
  { id: "NOTICE", label: "お知らせ", description: "管理者が社内向けにお知らせを投稿" },
  { id: "FREE", label: "自由掲示板", description: "自由なトピック" },
  { id: "QNA", label: "Q&A", description: "質問・相談" },
  { id: "EVENTS", label: "慶弔掲示板", description: "慶弔・お祝い・お見舞いなど" },
];

export const DEFAULT_BOARD_CATEGORY = "FREE";

export function boardLabel(categoryId) {
  return BOARD_FAVORITE_BOARDS.find((b) => b.id === categoryId)?.label ?? categoryId;
}
