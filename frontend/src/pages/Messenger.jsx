import React, { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import api from "../api/api";
import { useAuth } from "../context/AuthContext";
import BackToMenuLink from "../components/BackToMenuLink";
import StatusBadge from "../components/StatusBadge";
import EmployeePhotoThumb from "../components/EmployeePhotoThumb";

function formatTime(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  const today = new Date();
  const isToday =
    d.getFullYear() === today.getFullYear() &&
    d.getMonth() === today.getMonth() &&
    d.getDate() === today.getDate();
  if (isToday) {
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  }
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export default function Messenger() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [conversations, setConversations] = useState([]);
  const [activePartnerId, setActivePartnerId] = useState(null);
  const [activePartnerName, setActivePartnerName] = useState("");
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const [showNewChat, setShowNewChat] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [empSearch, setEmpSearch] = useState("");

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // ── データ読み込み ──────────────────────────────────────────────
  const loadConversations = useCallback(() => {
    api.get("/messenger/conversations")
      .then((r) => setConversations(r.data || []))
      .catch(() => {});
  }, []);

  const loadMessages = useCallback((partnerId) => {
    if (!partnerId) return;
    api.get(`/messenger/conversation/${partnerId}`)
      .then((r) => setMessages(r.data || []))
      .catch(() => {});
  }, []);

  // 初回ロード
  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // URL パラメータで相手を指定（/messenger?with=ID）
  useEffect(() => {
    const withId = searchParams.get("with");
    if (withId) {
      openConversation(Number(withId), "");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 会話切り替え時にメッセージを読み込む / 閉じたらクリア
  useEffect(() => {
    if (activePartnerId) {
      loadMessages(activePartnerId);
    } else {
      setMessages([]);
    }
  }, [activePartnerId, loadMessages]);

  // 3秒ポーリング
  useEffect(() => {
    const id = setInterval(() => {
      loadConversations();
      if (activePartnerId) loadMessages(activePartnerId);
    }, 3000);
    return () => clearInterval(id);
  }, [activePartnerId, loadConversations, loadMessages]);

  // メッセージ末尾へスクロール
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ── アクション ────────────────────────────────────────────────
  const openConversation = (partnerId, partnerName) => {
    setActivePartnerId(partnerId);
    setActivePartnerName(
      partnerName ||
        conversations.find((c) => c.partnerId === partnerId)?.partnerName ||
        employees.find((e) => e.employeeId === partnerId)?.employeeName ||
        ""
    );
    setShowNewChat(false);
    setEmpSearch("");
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const onSend = async (e) => {
    e.preventDefault();
    if (!inputText.trim() || !activePartnerId) return;
    setError("");
    setSending(true);
    try {
      const res = await api.post("/messenger/send", {
        receiverId: activePartnerId,
        content: inputText.trim(),
      });
      setMessages((prev) => [...prev, res.data]);
      setInputText("");
      loadConversations();
    } catch (err) {
      setError(err.response?.data?.error || "送信に失敗しました。");
    } finally {
      setSending(false);
    }
  };

  const onOpenNewChat = async () => {
    if (employees.length === 0) {
      const res = await api.get("/users").catch(() => ({ data: [] }));
      setEmployees(res.data || []);
    }
    setShowNewChat(true);
    setEmpSearch("");
  };

  /** X: 自分の一覧から外す。相手には履歴と「退出」通知が残る */
  const onCloseConversation = async () => {
    if (!activePartnerId) return;
    if (
      !window.confirm(
        "この会話から退出しますか？\n自分の一覧からは消えますが、相手の画面では履歴が残り、退出したことが通知されます。"
      )
    ) {
      return;
    }
    setError("");
    try {
      // POST: 一部環境で DELETE が 405 になるため
      await api.post(`/messenger/conversation/${activePartnerId}/delete`);
      setMessages([]);
      setActivePartnerId(null);
      setActivePartnerName("");
      loadConversations();
      navigate("/messenger", { replace: true });
    } catch (err) {
      setError(err.response?.data?.error || "会話の削除に失敗しました。");
    }
  };

  // Enter で送信、Shift+Enter で改行
  const onKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSend(e);
    }
  };

  const filteredEmployees = employees.filter(
    (e) =>
      e.employeeName.includes(empSearch) ||
      (e.department || "").includes(empSearch)
  );

  const myId = user?.id ? Number(user.id) : null;

  // ── レンダリング ──────────────────────────────────────────────
  return (
    <div className="page-container" style={{ paddingBottom: 0 }}>
      <h2 className="page-title">社内メッセンジャー</h2>

      {error && <div className="error-msg" style={{ marginBottom: 12 }}>{error}</div>}

      <div
        style={{
          display: "flex",
          gap: 0,
          height: "calc(100vh - 200px)",
          minHeight: 480,
          border: "1px solid #e0e0e0",
          borderRadius: 8,
          overflow: "hidden",
          background: "#fff",
        }}
      >
        {/* ── 左: 会話一覧 ── */}
        <div
          style={{
            width: 260,
            flexShrink: 0,
            borderRight: "1px solid #e0e0e0",
            display: "flex",
            flexDirection: "column",
            background: "#f8f9fa",
          }}
        >
          <div style={{ padding: "12px 12px 8px", borderBottom: "1px solid #e0e0e0" }}>
            <button
              type="button"
              className="primary"
              style={{ width: "100%", padding: "8px 0", fontSize: 14 }}
              onClick={onOpenNewChat}
            >
              ＋ 新規メッセージ
            </button>
          </div>

          <div style={{ flex: 1, overflowY: "auto" }}>
            {conversations.length === 0 ? (
              <p style={{ color: "#aaa", fontSize: 13, padding: "16px 12px", margin: 0 }}>
                まだ会話がありません
              </p>
            ) : (
              conversations.map((c) => {
                const isActive = activePartnerId === c.partnerId;
                return (
                  <div
                    key={c.partnerId}
                    onClick={() => openConversation(c.partnerId, c.partnerName)}
                    style={{
                      padding: "10px 12px",
                      cursor: "pointer",
                      background: isActive ? "#e8f0fe" : "transparent",
                      borderLeft: isActive ? "3px solid #1a56db" : "3px solid transparent",
                      borderBottom: "1px solid #ececec",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontWeight: 600, fontSize: 14, color: "#222" }}>
                        {c.partnerName}
                      </span>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        {c.unreadCount > 0 && (
                          <span
                            style={{
                              background: "#e53e3e",
                              color: "#fff",
                              borderRadius: 10,
                              padding: "1px 7px",
                              fontSize: 11,
                              fontWeight: 700,
                            }}
                          >
                            {c.unreadCount}
                          </span>
                        )}
                        <span style={{ fontSize: 11, color: "#aaa" }}>
                          {formatTime(c.lastMessageAt)}
                        </span>
                      </div>
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        color: "#777",
                        marginTop: 3,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {c.lastMessage}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ── 右: チャット ── */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
          {showNewChat ? (
            /* 新規チャット: 社員選択 */
            <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                <h3 style={{ margin: 0, fontSize: 16 }}>メッセージ送信先を選択</h3>
                <button
                  type="button"
                  className="secondary"
                  style={{ fontSize: 12, padding: "3px 10px" }}
                  onClick={() => setShowNewChat(false)}
                >
                  キャンセル
                </button>
              </div>
              <input
                value={empSearch}
                onChange={(e) => setEmpSearch(e.target.value)}
                placeholder="名前・所属で絞り込み"
                style={{ marginBottom: 12, padding: "8px 12px", border: "1px solid #ccc", borderRadius: 4, fontSize: 14 }}
              />
              <div style={{ flex: 1, overflowY: "auto" }}>
                {filteredEmployees.length === 0 ? (
                  <p style={{ color: "#aaa", fontSize: 13 }}>該当者がいません</p>
                ) : (
                  filteredEmployees.map((e) => (
                    <div
                      key={e.employeeId}
                      onClick={() => openConversation(e.employeeId, e.employeeName)}
                      style={{
                        padding: "10px 12px",
                        cursor: "pointer",
                        borderBottom: "1px solid #ececec",
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                      }}
                      onMouseEnter={(ev) => (ev.currentTarget.style.background = "#f0f4ff")}
                      onMouseLeave={(ev) => (ev.currentTarget.style.background = "transparent")}
                    >
                      <EmployeePhotoThumb
                        employeeId={e.employeeId}
                        photoFilename={e.photoFilename}
                        size={36}
                      />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <span style={{ fontWeight: 600, fontSize: 14 }}>{e.employeeName}</span>
                          <StatusBadge status={e.status ?? "PRESENT"} />
                        </div>
                        {e.department && (
                          <div style={{ fontSize: 12, color: "#888" }}>{e.department}</div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          ) : activePartnerId ? (
            /* チャット画面 */
            <>
              {/* ヘッダー */}
              <div
                style={{
                  padding: "12px 16px",
                  borderBottom: "1px solid #e0e0e0",
                  fontWeight: 700,
                  fontSize: 15,
                  background: "#fff",
                  flexShrink: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                }}
              >
                <span
                  style={{
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    minWidth: 0,
                  }}
                >
                  {activePartnerName ||
                    conversations.find((c) => c.partnerId === activePartnerId)?.partnerName ||
                    ""}
                </span>
                <button
                  type="button"
                  aria-label="会話から退出"
                  title="会話から退出"
                  onClick={onCloseConversation}
                  style={{
                    flexShrink: 0,
                    width: 32,
                    height: 32,
                    border: "none",
                    borderRadius: 6,
                    background: "#f0f0f0",
                    color: "#444",
                    fontSize: 20,
                    lineHeight: 1,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "#e53e3e";
                    e.currentTarget.style.color = "#fff";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "#f0f0f0";
                    e.currentTarget.style.color = "#444";
                  }}
                >
                  ×
                </button>
              </div>

              {/* メッセージ一覧 */}
              <div
                style={{
                  flex: 1,
                  overflowY: "auto",
                  padding: "16px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                  background: "#f9fafb",
                }}
              >
                {messages.length === 0 ? (
                  <p style={{ color: "#aaa", fontSize: 13, textAlign: "center", marginTop: 40 }}>
                    まだメッセージがありません。最初のメッセージを送りましょう！
                  </p>
                ) : (
                  messages.map((m) => {
                    const isMine = m.senderId === myId;
                    const isPartnerLeft = m.systemType === "PARTNER_LEFT";
                    if (isPartnerLeft) {
                      return (
                        <div
                          key={m.messageId}
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            width: "100%",
                          }}
                        >
                          <div
                            style={{
                              maxWidth: "90%",
                              textAlign: "center",
                              fontSize: 13,
                              color: "#666",
                              background: "#eef0f3",
                              borderRadius: 8,
                              padding: "10px 14px",
                              lineHeight: 1.5,
                            }}
                          >
                            {m.senderName}님이 대화방을 나갔습니다
                          </div>
                          <span style={{ fontSize: 11, color: "#aaa", marginTop: 4 }}>
                            {formatTime(m.createdAt)}
                          </span>
                        </div>
                      );
                    }
                    return (
                      <div
                        key={m.messageId}
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          alignItems: isMine ? "flex-end" : "flex-start",
                        }}
                      >
                        {!isMine && (
                          <span style={{ fontSize: 11, color: "#888", marginBottom: 2 }}>
                            {m.senderName}
                          </span>
                        )}
                        <div
                          style={{
                            maxWidth: "70%",
                            background: isMine ? "#1a56db" : "#fff",
                            color: isMine ? "#fff" : "#222",
                            border: isMine ? "none" : "1px solid #e0e0e0",
                            borderRadius: isMine ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                            padding: "9px 14px",
                            fontSize: 14,
                            lineHeight: 1.5,
                            whiteSpace: "pre-wrap",
                            wordBreak: "break-word",
                          }}
                        >
                          {m.content}
                        </div>
                        <span style={{ fontSize: 11, color: "#aaa", marginTop: 2 }}>
                          {formatTime(m.createdAt)}
                          {isMine && (
                            <span style={{ marginLeft: 4 }}>
                              {m.read ? " ✓✓" : " ✓"}
                            </span>
                          )}
                        </span>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* 入力エリア */}
              <form
                onSubmit={onSend}
                style={{
                  display: "flex",
                  gap: 8,
                  padding: "10px 12px",
                  borderTop: "1px solid #e0e0e0",
                  background: "#fff",
                  flexShrink: 0,
                }}
              >
                <textarea
                  ref={inputRef}
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={onKeyDown}
                  placeholder="メッセージを入力… (Enter送信 / Shift+Enterで改行)"
                  rows={2}
                  style={{
                    flex: 1,
                    padding: "8px 12px",
                    fontSize: 14,
                    border: "1px solid #ccc",
                    borderRadius: 8,
                    resize: "none",
                    fontFamily: "inherit",
                    lineHeight: 1.5,
                  }}
                />
                <button
                  type="submit"
                  className="primary"
                  disabled={sending || !inputText.trim()}
                  style={{ alignSelf: "flex-end", padding: "8px 18px" }}
                >
                  送信
                </button>
              </form>
            </>
          ) : (
            /* 初期状態 */
            <div
              style={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexDirection: "column",
                gap: 12,
                color: "#aaa",
              }}
            >
              <span style={{ fontSize: 48 }}>💬</span>
              <p style={{ margin: 0, fontSize: 15 }}>会話を選択するか、新規メッセージを開始してください</p>
            </div>
          )}
        </div>
      </div>

      <div style={{ marginTop: 16 }}>
        <BackToMenuLink />
      </div>
    </div>
  );
}
