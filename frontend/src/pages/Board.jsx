import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/api";
import BackToMenuLink from "../components/BackToMenuLink";
import { useAuth } from "../context/AuthContext";

function formatDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

const EMPTY_FORM = { title: "", content: "" };

export default function Board() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setError("");
    api
      .get("/board")
      .then((r) => setPosts(r.data || []))
      .catch(() => setError("掲示板の読み込みに失敗しました。"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

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
        title: form.title.trim(),
        content: form.content.trim(),
      });
      setForm({ ...EMPTY_FORM });
      setShowForm(false);
      navigate(`/board/${res.data.postId}`);
    } catch (err) {
      setError(err.response?.data?.error || "投稿に失敗しました。");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="page-container">
      <h2 className="page-title">掲示板</h2>
      {error && <div className="error-msg">{error}</div>}

      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: showForm ? 16 : 0 }}>
          <h3 style={{ margin: 0 }}>新規投稿</h3>
          <button
            type="button"
            className={showForm ? "secondary" : "primary"}
            onClick={() => {
              setShowForm((v) => !v);
              setForm({ ...EMPTY_FORM });
              setError("");
            }}
          >
            {showForm ? "キャンセル" : "新規投稿"}
          </button>
        </div>

        {showForm && (
          <form onSubmit={onSubmit}>
            <div className="form-row" style={{ flexDirection: "column", gap: 10 }}>
              <input
                name="title"
                value={form.title}
                onChange={onChange}
                placeholder="タイトル（200文字以内）"
                required
                maxLength={200}
                style={{ width: "100%", boxSizing: "border-box" }}
              />
              <textarea
                name="content"
                value={form.content}
                onChange={onChange}
                placeholder="本文を入力してください..."
                required
                rows={6}
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
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <button type="submit" className="primary" disabled={submitting}>
                  {submitting ? "投稿中…" : "投稿する"}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>

      <div className="card" style={{ overflowX: "auto" }}>
        <h3 style={{ marginTop: 0 }}>投稿一覧</h3>
        {loading ? (
          <p>読み込み中…</p>
        ) : posts.length === 0 ? (
          <p style={{ color: "#888", margin: 0 }}>まだ投稿がありません。</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>タイトル</th>
                <th>投稿者</th>
                <th>投稿日時</th>
                <th style={{ textAlign: "center" }}>コメント</th>
              </tr>
            </thead>
            <tbody>
              {posts.map((p) => (
                <tr
                  key={p.postId}
                  onClick={() => navigate(`/board/${p.postId}`)}
                  style={{ cursor: "pointer" }}
                  title="クリックして詳細を表示"
                >
                  <td>
                    <span style={{ fontWeight: 500, color: "#1a56db" }}>{p.title}</span>
                  </td>
                  <td>{p.authorName}</td>
                  <td style={{ whiteSpace: "nowrap" }}>{formatDate(p.createdAt)}</td>
                  <td style={{ textAlign: "center" }}>
                    {p.commentCount > 0 ? (
                      <span
                        style={{
                          background: "#e8f0fe",
                          color: "#1a56db",
                          borderRadius: 12,
                          padding: "2px 10px",
                          fontSize: 13,
                          fontWeight: 600,
                        }}
                      >
                        {p.commentCount}
                      </span>
                    ) : (
                      <span style={{ color: "#aaa", fontSize: 13 }}>—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <BackToMenuLink />
    </div>
  );
}
