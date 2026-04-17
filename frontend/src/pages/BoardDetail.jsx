import React, { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../api/api";
import { useAuth } from "../context/AuthContext";

function formatDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export default function BoardDetail() {
  const { postId } = useParams();
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

  const load = useCallback(() => {
    setLoading(true);
    setError("");
    api
      .get(`/board/${postId}`)
      .then((r) => {
        setPost(r.data);
        setEditForm({ title: r.data.title, content: r.data.content });
      })
      .catch(() => setError("投稿の読み込みに失敗しました。"))
      .finally(() => setLoading(false));
  }, [postId]);

  useEffect(() => {
    load();
  }, [load]);

  const canEdit = post && (user?.id === post.authorId || user?.role === "ADMIN");

  const onDeletePost = async () => {
    if (!window.confirm("この投稿を削除しますか？この操作は取り消せません。")) return;
    try {
      await api.delete(`/board/${postId}`);
      navigate("/board");
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
      await api.put(`/board/${postId}`, {
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
      await api.post(`/board/${postId}/comments`, { content: commentText.trim() });
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
      await api.delete(`/board/${postId}/comments/${commentId}`);
      load();
    } catch (err) {
      setError(err.response?.data?.error || "コメントの削除に失敗しました。");
    }
  };

  if (loading) {
    return (
      <div className="page-container">
        <p>読み込み中…</p>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="page-container">
        <div className="error-msg">{error || "投稿が見つかりません。"}</div>
        <button type="button" className="secondary" style={{ marginTop: 12 }} onClick={() => navigate("/board")}>
          ← 掲示板に戻る
        </button>
      </div>
    );
  }

  return (
    <div className="page-container">
      <button
        type="button"
        className="secondary"
        style={{ marginBottom: 16, padding: "6px 16px" }}
        onClick={() => navigate("/board")}
      >
        ← 掲示板に戻る
      </button>

      {error && <div className="error-msg">{error}</div>}

      <div className="card">
        {/* 投稿本文 */}
        <div>
          {editMode ? (
            <form onSubmit={onEditSubmit}>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <input
                  value={editForm.title}
                  onChange={(e) => setEditForm((p) => ({ ...p, title: e.target.value }))}
                  placeholder="タイトル"
                  required
                  maxLength={200}
                  style={{ width: "100%", boxSizing: "border-box", fontSize: 16, fontWeight: 600 }}
                />
                <textarea
                  value={editForm.content}
                  onChange={(e) => setEditForm((p) => ({ ...p, content: e.target.value }))}
                  required
                  rows={8}
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    padding: "10px 12px",
                    fontSize: 14,
                    border: "1px solid #ccc",
                    borderRadius: 4,
                    resize: "vertical",
                    fontFamily: "inherit",
                  }}
                />
                <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                  <button type="submit" className="primary" disabled={editSubmitting}>
                    {editSubmitting ? "更新中…" : "更新する"}
                  </button>
                  <button type="button" className="secondary" onClick={() => { setEditMode(false); setError(""); }}>
                    キャンセル
                  </button>
                </div>
              </div>
            </form>
          ) : (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 12 }}>
                <h2 style={{ margin: 0, fontSize: 22, lineHeight: 1.4, wordBreak: "break-word" }}>{post.title}</h2>
                {canEdit && (
                  <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                    <button
                      type="button"
                      className="secondary"
                      style={{ padding: "4px 14px", fontSize: 13 }}
                      onClick={() => { setEditMode(true); setError(""); }}
                    >
                      編集
                    </button>
                    <button
                      type="button"
                      className="secondary"
                      style={{ padding: "4px 14px", fontSize: 13, color: "#e53e3e", borderColor: "#e53e3e" }}
                      onClick={onDeletePost}
                    >
                      削除
                    </button>
                  </div>
                )}
              </div>
              <div style={{ fontSize: 13, color: "#888", marginBottom: 16 }}>
                <span style={{ fontWeight: 600, color: "#555" }}>{post.authorName}</span>
                {" · "}
                <span>{formatDate(post.createdAt)}</span>
                {post.updatedAt !== post.createdAt && (
                  <span style={{ marginLeft: 8, color: "#aaa" }}>（編集済み {formatDate(post.updatedAt)}）</span>
                )}
              </div>
              <div
                style={{
                  whiteSpace: "pre-wrap",
                  lineHeight: 1.7,
                  fontSize: 15,
                  wordBreak: "break-word",
                  borderTop: "1px solid #f0f0f0",
                  paddingTop: 16,
                }}
              >
                {post.content}
              </div>
            </>
          )}
        </div>

        {/* コメント */}
        <div
          style={{
            borderTop: "1px solid #eee",
            marginTop: 24,
            paddingTop: 20,
          }}
        >
          <h3 style={{ marginTop: 0, marginBottom: 12, fontSize: "1.05rem", color: "#2c3e50" }}>
            コメント {post.comments.length > 0 ? `（${post.comments.length}件）` : ""}
          </h3>

          {post.comments.length === 0 ? (
            <p style={{ color: "#aaa", margin: "0 0 16px", fontSize: 14 }}>まだコメントがありません。</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
              {post.comments.map((c) => {
                const canDeleteComment =
                  user?.id === c.authorId || user?.role === "ADMIN";
                return (
                  <div
                    key={c.commentId}
                    style={{
                      background: "#f8f9fa",
                      borderRadius: 6,
                      padding: "10px 12px",
                      borderLeft: "3px solid #e0e0e0",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                      <span style={{ fontSize: 13, color: "#555" }}>
                        <strong>{c.authorName}</strong>
                        {" · "}
                        {formatDate(c.createdAt)}
                      </span>
                      {canDeleteComment && (
                        <button
                          type="button"
                          className="secondary"
                          style={{ padding: "2px 10px", fontSize: 12, color: "#e53e3e", borderColor: "#e53e3e" }}
                          onClick={() => onDeleteComment(c.commentId)}
                        >
                          削除
                        </button>
                      )}
                    </div>
                    <div style={{ whiteSpace: "pre-wrap", fontSize: 14, lineHeight: 1.6, wordBreak: "break-word" }}>
                      {c.content}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <form onSubmit={onCommentSubmit} style={{ borderTop: "1px solid #eee", paddingTop: 16 }}>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#444", marginBottom: 8 }}>
              コメントを追加
            </label>
            <textarea
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="コメントを入力..."
              rows={3}
              style={{
                width: "100%",
                boxSizing: "border-box",
                padding: "10px 12px",
                fontSize: 14,
                border: "1px solid #ccc",
                borderRadius: 4,
                resize: "vertical",
                fontFamily: "inherit",
                marginBottom: 10,
              }}
            />
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button type="submit" className="primary" disabled={commentSubmitting || !commentText.trim()}>
                {commentSubmitting ? "送信中…" : "コメントする"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
