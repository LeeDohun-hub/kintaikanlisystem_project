import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import api from "../api/api";
import BackToMenuLink from "../components/BackToMenuLink";
import { useAuth } from "../context/AuthContext";
import { BOARD_FAVORITE_BOARDS, DEFAULT_BOARD_CATEGORY, boardLabel } from "../constants/boardCategories";
import { getStarredPostIdSet, isPostStarred, togglePostStar } from "../utils/boardStars";
import "./Board.css";

function formatDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}`;
}

function dayStartMs(isoDate) {
  if (!isoDate) return null;
  const d = new Date(isoDate + "T00:00:00");
  return Number.isNaN(d.getTime()) ? null : d.getTime();
}

function dayEndMs(isoDate) {
  if (!isoDate) return null;
  const d = new Date(isoDate + "T23:59:59.999");
  return Number.isNaN(d.getTime()) ? null : d.getTime();
}

function applyClientFilters(posts, { starredOnly, myOnly, userId, dateFrom, dateTo, sort, searchText }) {
  const fromMs = dayStartMs(dateFrom);
  const toMs = dayEndMs(dateTo);
  const starred = getStarredPostIdSet();

  let list = [...posts];
  if (starredOnly) list = list.filter((p) => starred.has(Number(p.postId)));
  if (myOnly && userId != null) list = list.filter((p) => Number(p.authorId) === Number(userId));
  if (searchText) {
    const q = searchText.toLowerCase();
    list = list.filter((p) => p.title.toLowerCase().includes(q) || p.authorName.toLowerCase().includes(q));
  }
  if (fromMs != null || toMs != null) {
    list = list.filter((p) => {
      const t = new Date(p.createdAt).getTime();
      if (fromMs != null && t < fromMs) return false;
      if (toMs != null && t > toMs) return false;
      return true;
    });
  }

  list.sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    const ta = new Date(a.createdAt).getTime();
    const tb = new Date(b.createdAt).getTime();
    return sort === "old" ? ta - tb : tb - ta;
  });
  return list;
}

const EMPTY_FORM = { title: "", content: "" };

export default function Board() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const category = searchParams.get("category") || DEFAULT_BOARD_CATEGORY;

  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [submitting, setSubmitting] = useState(false);
  const [starTick, setStarTick] = useState(0);

  const [filterStarred, setFilterStarred] = useState(false);
  const [filterMine, setFilterMine] = useState(false);
  const [sortOrder, setSortOrder] = useState("new");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [searchText, setSearchText] = useState("");

  const isAdmin = user?.role === "ADMIN";
  const canPost = category !== "NOTICE" || isAdmin;

  const load = useCallback(() => {
    setLoading(true);
    setError("");
    api
      .get("/board", { params: { category } })
      .then((r) => setPosts(r.data || []))
      .catch(() => setError("掲示板の読み込みに失敗しました。"))
      .finally(() => setLoading(false));
  }, [category]);

  useEffect(() => {
    load();
    setShowForm(false);
    setForm({ ...EMPTY_FORM });
    setSearchText("");
  }, [load]);

  const displayedPosts = useMemo(
    () =>
      applyClientFilters(posts, {
        starredOnly: filterStarred,
        myOnly: filterMine,
        userId: user?.id,
        dateFrom,
        dateTo,
        sort: sortOrder,
        searchText,
      }),
    [posts, filterStarred, filterMine, user?.id, dateFrom, dateTo, sortOrder, searchText, starTick],
  );

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.content.trim()) {
      setError("タイトルと本文を入力してください。");
      return;
    }
    setError("");
    setSubmitting(true);
    try {
      const res = await api.post("/board", {
        category,
        title: form.title.trim(),
        content: form.content.trim(),
      });
      setForm({ ...EMPTY_FORM });
      setShowForm(false);
      navigate(`/board/post/${res.data.postId}?category=${encodeURIComponent(category)}`);
    } catch (err) {
      setError(err.response?.data?.error || "投稿に失敗しました。");
    } finally {
      setSubmitting(false);
    }
  };

  const onToggleStar = (e, postId) => {
    e.stopPropagation();
    togglePostStar(postId);
    setStarTick((t) => t + 1);
  };

  const onTogglePin = async (e, post) => {
    e.stopPropagation();
    if (!isAdmin) return;
    try {
      await api.patch(`/board/posts/${post.postId}/pin`, { pinned: !post.pinned });
      load();
    } catch (err) {
      setError(err.response?.data?.error || "ピン留めの更新に失敗しました。");
    }
  };

  const switchCategory = (cat) => {
    setSearchParams({ category: cat });
    setFilterStarred(false);
    setFilterMine(false);
    setDateFrom("");
    setDateTo("");
    setSortOrder("new");
  };

  return (
    <div className="page-container board-page">
      {/* ── Category tabs ── */}
      <nav className="board-cat-nav">
        {BOARD_FAVORITE_BOARDS.map((b) => (
          <button
            key={b.id}
            type="button"
            className={`board-cat-tab${category === b.id ? " active" : ""}`}
            onClick={() => switchCategory(b.id)}
          >
            {b.label}
          </button>
        ))}
      </nav>

      {/* ── Board header ── */}
      <div className="board-header">
        <div className="board-header-left">
          <h2 className="board-heading">{boardLabel(category)}</h2>
          {category === "NOTICE" && !isAdmin && (
            <span className="board-hint">閲覧のみ · 投稿は管理者</span>
          )}
        </div>
        {canPost && !showForm && (
          <button
            type="button"
            className="primary board-write-btn"
            onClick={() => { setShowForm(true); setError(""); }}
          >
            ✏ 新規投稿
          </button>
        )}
      </div>

      {error && <div className="error-msg">{error}</div>}

      {/* ── Write form panel ── */}
      {showForm && canPost && (
        <div className="board-write-panel">
          <div className="board-write-panel-head">
            <span className="board-write-panel-title">新規投稿 — {boardLabel(category)}</span>
            <button
              type="button"
              className="board-write-close"
              onClick={() => { setShowForm(false); setError(""); }}
              aria-label="閉じる"
            >
              ✕
            </button>
          </div>
          <form onSubmit={onSubmit} className="board-write-form">
            <input
              name="title"
              value={form.title}
              onChange={onChange}
              placeholder="タイトル（200文字以内）"
              required
              maxLength={200}
              className="board-write-title-input"
            />
            <textarea
              name="content"
              value={form.content}
              onChange={onChange}
              placeholder="本文を入力してください..."
              required
              rows={8}
              className="board-write-body-input"
            />
            <div className="board-write-actions">
              <button
                type="button"
                className="secondary"
                onClick={() => { setShowForm(false); setError(""); }}
              >
                キャンセル
              </button>
              <button type="submit" className="primary" disabled={submitting}>
                {submitting ? "投稿中…" : "投稿する"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── Filter / search bar ── */}
      <div className="board-filter-bar">
        <div className="board-search-wrap">
          <svg className="board-search-icon" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M9 3a6 6 0 100 12A6 6 0 009 3zm-8 6a8 8 0 1114.32 4.906l4.387 4.387a1 1 0 01-1.414 1.414l-4.387-4.387A8 8 0 011 9z" clipRule="evenodd" />
          </svg>
          <input
            type="text"
            className="board-search-input"
            placeholder="タイトル・投稿者で検索…"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
        </div>
        <div className="board-filter-chips">
          <button
            type="button"
            className={`board-chip${filterStarred ? " is-on" : ""}`}
            onClick={() => setFilterStarred((v) => !v)}
          >
            ★ お気に入り
          </button>
          <button
            type="button"
            className={`board-chip${filterMine ? " is-on" : ""}`}
            onClick={() => setFilterMine((v) => !v)}
          >
            自分の投稿
          </button>
          <select
            className="board-sort-select"
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
          >
            <option value="new">新しい順</option>
            <option value="old">古い順</option>
          </select>
          <div className="board-date-range">
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="board-date-input"
              title="開始日"
            />
            <span className="board-date-sep">〜</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="board-date-input"
              title="終了日"
            />
            {(dateFrom || dateTo) && (
              <button
                type="button"
                className="board-chip"
                onClick={() => { setDateFrom(""); setDateTo(""); }}
              >
                クリア
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Post list table ── */}
      <div className="board-table-wrap">
        {loading ? (
          <div className="board-state-msg">読み込み中…</div>
        ) : displayedPosts.length === 0 ? (
          <div className="board-state-msg">
            {posts.length === 0 ? "まだ投稿がありません。" : "条件に一致する投稿がありません。"}
          </div>
        ) : (
          <table className="board-table">
            <thead>
              <tr>
                <th className="bcol-no">番号</th>
                <th className="bcol-title">タイトル</th>
                <th className="bcol-author">投稿者</th>
                <th className="bcol-date">日付</th>
                <th className="bcol-star" aria-label="お気に入り" />
                {isAdmin && <th className="bcol-pin">ピン</th>}
              </tr>
            </thead>
            <tbody>
              {displayedPosts.map((p, idx) => (
                <tr
                  key={p.postId}
                  className={p.pinned ? "brow-pinned" : ""}
                  onClick={() =>
                    navigate(`/board/post/${p.postId}?category=${encodeURIComponent(category)}`)
                  }
                >
                  <td className="bcol-no">
                    {p.pinned ? (
                      <span className="board-pin-icon" title="ピン留め">📌</span>
                    ) : (
                      <span className="board-row-no">{displayedPosts.length - idx}</span>
                    )}
                  </td>
                  <td className="bcol-title">
                    <span className="board-title-text">{p.title}</span>
                    {p.commentCount > 0 && (
                      <span className="board-comment-badge">{p.commentCount}</span>
                    )}
                  </td>
                  <td className="bcol-author">{p.authorName}</td>
                  <td className="bcol-date">{formatDate(p.createdAt)}</td>
                  <td
                    className="bcol-star"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      type="button"
                      className={`board-star-btn${isPostStarred(p.postId) ? " is-starred" : ""}`}
                      title={isPostStarred(p.postId) ? "お気に入りを解除" : "お気に入りに追加"}
                      onClick={(e) => onToggleStar(e, p.postId)}
                      aria-pressed={isPostStarred(p.postId)}
                    >
                      {isPostStarred(p.postId) ? "★" : "☆"}
                    </button>
                  </td>
                  {isAdmin && (
                    <td className="bcol-pin" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        className={`board-pin-btn${p.pinned ? " is-pinned" : ""}`}
                        onClick={(e) => onTogglePin(e, p)}
                      >
                        {p.pinned ? "解除" : "ピン"}
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {!loading && posts.length > 0 && (
          <div className="board-table-footer">
            全 {posts.length} 件
            {displayedPosts.length !== posts.length && (
              <> / 表示中 {displayedPosts.length} 件</>
            )}
          </div>
        )}
      </div>

      <BackToMenuLink />
    </div>
  );
}
