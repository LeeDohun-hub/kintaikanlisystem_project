import React, { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import api from "../api/api";
import { useAuth } from "../context/AuthContext";
import { boardLabel, DEFAULT_BOARD_CATEGORY } from "../constants/boardCategories";
import { isPostStarred, togglePostStar } from "../utils/boardStars";
import "./Board.css";

function formatDateTime(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function formatDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}`;
}

function nameInitial(name) {
  return name ? name.charAt(0).toUpperCase() : "?";
}

export default function BoardDetail() {
  const { postId } = useParams();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState({ title: "", content: "" });
  const [editSubmitting, setEditSubmitting] = useState(false);

  const [commentText, setCommentText] = useState("");
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [starred, setStarred] = useState(false);

  const backCategory = searchParams.get("category") || DEFAULT_BOARD_CATEGORY;

  const load = useCallback(() => {
    setLoading(true);
    setError("");
    api
      .get(`/board/posts/${postId}`)
      .then((r) => {
        setPost(r.data);
        setEditForm({ title: r.data.title, content: r.data.content });
        setStarred(isPostStarred(r.data.postId));
      })
      .catch(() => setError("投稿の読み込みに失敗しました。"))
      .finally(() => setLoading(false));
  }, [postId]);

  useEffect(() => {
    load();
  }, [load]);

  const canEdit = post && (user?.id === post.authorId || user?.role === "ADMIN");
  const isAdmin = user?.role === "ADMIN";

  const goBoardList = () => {
    const cat = post?.category || backCategory;
    navigate(`/board?category=${encodeURIComponent(cat)}`);
  };

  const onToggleStar = () => {
    if (!post) return;
    togglePostStar(post.postId);
    setStarred(isPostStarred(post.postId));
  };

  const onTogglePin = async () => {
    if (!post || !isAdmin) return;
    setError("");
    try {
      await api.patch(`/board/posts/${postId}/pin`, { pinned: !post.pinned });
      load();
    } catch (err) {
      setError(err.response?.data?.error || "ピン留めの更新に失敗しました。");
    }
  };

  const onDeletePost = async () => {
    if (!window.confirm("この投稿を削除しますか？この操作は取り消せません。")) return;
    try {
      await api.delete(`/board/posts/${postId}`);
      navigate(`/board?category=${encodeURIComponent(post?.category || backCategory)}`);
    } catch (err) {
      setError(err.response?.data?.error || "削除に失敗しました。");
    }
  };

  const onEditSubmit = async (e) => {
    e.preventDefault();
    if (!editForm.title.trim() || !editForm.content.trim()) {
      setError("タイトルと本文を入力してください。");
      return;
    }
    setError("");
    setEditSubmitting(true);
    try {
      await api.put(`/board/posts/${postId}`, {
        title: editForm.title.trim(),
        content: editForm.content.trim(),
      });
      setEditMode(false);
      load();
    } catch (err) {
      setError(err.response?.data?.error || "更新に失敗しました。");
    } finally {
      setEditSubmitting(false);
    }
  };

  const onCommentSubmit = async (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    setError("");
    setCommentSubmitting(true);
    try {
      await api.post(`/board/posts/${postId}/comments`, { content: commentText.trim() });
      setCommentText("");
      load();
    } catch (err) {
      setError(err.response?.data?.error || "コメントの送信に失敗しました。");
    } finally {
      setCommentSubmitting(false);
    }
  };

  const onDeleteComment = async (commentId) => {
    if (!window.confirm("このコメントを削除しますか？")) return;
    try {
      await api.delete(`/board/posts/${postId}/comments/${commentId}`);
      load();
    } catch (err) {
      setError(err.response?.data?.error || "コメントの削除に失敗しました。");
    }
  };

  if (loading) {
    return (
      <div className="page-container">
        <div className="board-state-msg" style={{ paddingTop: 48 }}>読み込み中…</div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="page-container">
        <div className="error-msg">{error || "投稿が見つかりません。"}</div>
        <button
          type="button"
          className="secondary"
          style={{ marginTop: 12 }}
          onClick={() => navigate(`/board?category=${encodeURIComponent(backCategory)}`)}
        >
          ← 掲示板に戻る
        </button>
      </div>
    );
  }

  return (
    <div className="page-container bd-page">
      {/* ── Breadcrumb ── */}
      <div className="bd-breadcrumb">
        <button type="button" className="bd-back-btn" onClick={goBoardList}>
          ← 掲示板
        </button>
        <span className="bd-breadcrumb-sep">/</span>
        <span className="bd-breadcrumb-cat">{boardLabel(post.category)}</span>
      </div>

      {error && <div className="error-msg">{error}</div>}

      {/* ── Post card ── */}
      <div className="bd-post-card">
        {editMode ? (
          /* Edit form */
          <form onSubmit={onEditSubmit} className="bd-edit-form">
            <div className="bd-edit-form-head">編集中</div>
            <input
              value={editForm.title}
              onChange={(e) => setEditForm((p) => ({ ...p, title: e.target.value }))}
              placeholder="タイトル"
              required
              maxLength={200}
              className="bd-edit-title-input"
            />
            <textarea
              value={editForm.content}
              onChange={(e) => setEditForm((p) => ({ ...p, content: e.target.value }))}
              required
              rows={10}
              className="bd-edit-body-input"
            />
            <div className="bd-edit-actions">
              <button
                type="button"
                className="secondary"
                onClick={() => { setEditMode(false); setError(""); }}
              >
                キャンセル
              </button>
              <button type="submit" className="primary" disabled={editSubmitting}>
                {editSubmitting ? "更新中…" : "更新する"}
              </button>
            </div>
          </form>
        ) : (
          <>
            {/* Post header */}
            <div className="bd-post-header">
              <div className="bd-post-badges">
                {post.pinned && <span className="bd-badge-pin">📌 ピン留め</span>}
                <span className="bd-badge-cat">{boardLabel(post.category)}</span>
              </div>
              <h1 className="bd-post-title">{post.title}</h1>
              <div className="bd-post-meta-row">
                <div className="bd-post-meta">
                  <span className="bd-meta-avatar">{nameInitial(post.authorName)}</span>
                  <span className="bd-meta-author">{post.authorName}</span>
                  <span className="bd-meta-sep">·</span>
                  <span className="bd-meta-date">{formatDateTime(post.createdAt)}</span>
                  {post.updatedAt !== post.createdAt && (
                    <span className="bd-meta-edited">（編集済み {formatDate(post.updatedAt)}）</span>
                  )}
                </div>
                <div className="bd-post-actions">
                  <button
                    type="button"
                    className={`bd-action-btn${starred ? " is-starred" : ""}`}
                    onClick={onToggleStar}
                    aria-pressed={starred}
                  >
                    {starred ? "★ お気に入り済" : "☆ お気に入り"}
                  </button>
                  {isAdmin && (
                    <button type="button" className="bd-action-btn" onClick={onTogglePin}>
                      {post.pinned ? "ピン解除" : "📌 ピン留め"}
                    </button>
                  )}
                  {canEdit && (
                    <>
                      <button
                        type="button"
                        className="bd-action-btn"
                        onClick={() => { setEditMode(true); setError(""); }}
                      >
                        編集
                      </button>
                      <button
                        type="button"
                        className="bd-action-btn bd-action-danger"
                        onClick={onDeletePost}
                      >
                        削除
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Post body */}
            <div className="bd-post-body">{post.content}</div>
          </>
        )}
      </div>

      {/* ── Comments ── */}
      <div className="bd-comments-section">
        <h3 className="bd-comments-heading">
          コメント
          {post.comments.length > 0 && (
            <span className="bd-comments-count">{post.comments.length}</span>
          )}
        </h3>

        {post.comments.length === 0 ? (
          <p className="bd-no-comments">まだコメントがありません。</p>
        ) : (
          <div className="bd-comments-list">
            {post.comments.map((c) => {
              const canDeleteComment = user?.id === c.authorId || user?.role === "ADMIN";
              return (
                <div key={c.commentId} className="bd-comment-item">
                  <div className="bd-comment-header">
                    <span className="bd-meta-avatar">{nameInitial(c.authorName)}</span>
                    <div className="bd-comment-meta">
                      <strong className="bd-comment-author">{c.authorName}</strong>
                      <span className="bd-comment-date">{formatDateTime(c.createdAt)}</span>
                    </div>
                    {canDeleteComment && (
                      <button
                        type="button"
                        className="bd-comment-delete-btn"
                        onClick={() => onDeleteComment(c.commentId)}
                      >
                        削除
                      </button>
                    )}
                  </div>
                  <div className="bd-comment-body">{c.content}</div>
                </div>
              );
            })}
          </div>
        )}

        {/* Comment form */}
        <form onSubmit={onCommentSubmit} className="bd-comment-form">
          <div className="bd-comment-form-label">コメントを追加</div>
          <textarea
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            placeholder="コメントを入力..."
            rows={3}
            className="bd-comment-textarea"
          />
          <div className="bd-comment-form-actions">
            <button
              type="submit"
              className="primary"
              disabled={commentSubmitting || !commentText.trim()}
            >
              {commentSubmitting ? "送信中…" : "コメントする"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
