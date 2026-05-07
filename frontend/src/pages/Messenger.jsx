import React, { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import api from "../api/api";
import { useAuth } from "../context/AuthContext";
import { useMessengerUnread } from "../context/MessengerUnreadContext";
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
  const { refresh: refreshUnread } = useMessengerUnread();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // ── タブ ─────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState("dm"); // 'dm' | 'group'

  // ── DM 状態 ───────────────────────────────────────────────────────
  const [conversations, setConversations] = useState([]);
  const [activePartnerId, setActivePartnerId] = useState(null);
  const [activePartnerName, setActivePartnerName] = useState("");
  const [messages, setMessages] = useState([]);

  // ── グループ状態 ──────────────────────────────────────────────────
  const [groupRooms, setGroupRooms] = useState([]);
  const [activeRoomId, setActiveRoomId] = useState(null);
  const [activeRoomName, setActiveRoomName] = useState("");
  const [activeRoomMembers, setActiveRoomMembers] = useState([]);
  const [groupMessages, setGroupMessages] = useState([]);

  // グループ作成
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [selectedMemberIds, setSelectedMemberIds] = useState(new Set());
  const [creating, setCreating] = useState(false);
  const [groupEmpSearch, setGroupEmpSearch] = useState("");

  // メンバー追加
  const [showAddMembers, setShowAddMembers] = useState(false);
  const [addingMemberIds, setAddingMemberIds] = useState(new Set());
  const [addEmpSearch, setAddEmpSearch] = useState("");

  // ── 共通状態 ──────────────────────────────────────────────────────
  const [inputText, setInputText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  // 新規DM
  const [showNewChat, setShowNewChat] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [empSearch, setEmpSearch] = useState("");

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // ── 社員リスト読み込み ─────────────────────────────────────────────
  const ensureEmployees = useCallback(async () => {
    if (employees.length === 0) {
      const res = await api.get("/users").catch(() => ({ data: [] }));
      setEmployees(res.data || []);
    }
  }, [employees.length]);

  // ── DM データ読み込み ─────────────────────────────────────────────
  const loadConversations = useCallback(() => {
    api
      .get("/messenger/conversations")
      .then((r) => {
        setConversations(r.data || []);
        refreshUnread();
      })
      .catch(() => {});
  }, [refreshUnread]);

  const loadMessages = useCallback(
    (partnerId) => {
      if (!partnerId) return;
      api
        .get(`/messenger/conversation/${partnerId}`)
        .then((r) => {
          setMessages(r.data || []);
          refreshUnread();
        })
        .catch(() => {});
    },
    [refreshUnread],
  );

  // ── グループデータ読み込み ────────────────────────────────────────
  const loadGroupRooms = useCallback(() => {
    api
      .get("/group-messenger/rooms")
      .then((r) => {
        setGroupRooms(r.data || []);
        refreshUnread();
      })
      .catch(() => {});
  }, [refreshUnread]);

  // グループルーム一覧が更新されたらアクティブルームのメンバーリストを同期
  useEffect(() => {
    if (activeRoomId) {
      const room = groupRooms.find((r) => r.roomId === activeRoomId);
      if (room) setActiveRoomMembers(room.members || []);
    }
  }, [groupRooms, activeRoomId]);

  const loadGroupMessages = useCallback(
    (roomId) => {
      if (!roomId) return;
      api
        .get(`/group-messenger/rooms/${roomId}/messages`)
        .then((r) => {
          setGroupMessages(r.data || []);
          refreshUnread();
        })
        .catch(() => {});
    },
    [refreshUnread],
  );

  // ── 初回ロード ────────────────────────────────────────────────────
  useEffect(() => {
    loadConversations();
    loadGroupRooms();
  }, [loadConversations, loadGroupRooms]);

  // URL パラメータで DM 相手を指定
  useEffect(() => {
    const withId = searchParams.get("with");
    if (withId) {
      openDmConversation(Number(withId), "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // DM 会話切り替え
  useEffect(() => {
    if (activePartnerId) {
      loadMessages(activePartnerId);
    } else {
      setMessages([]);
    }
  }, [activePartnerId, loadMessages]);

  // グループルーム切り替え
  useEffect(() => {
    if (activeRoomId) {
      loadGroupMessages(activeRoomId);
    } else {
      setGroupMessages([]);
    }
  }, [activeRoomId, loadGroupMessages]);

  // 3秒ポーリング（DM + グループ両方）
  useEffect(() => {
    const id = setInterval(() => {
      loadConversations();
      loadGroupRooms();
      if (activePartnerId) loadMessages(activePartnerId);
      if (activeRoomId) loadGroupMessages(activeRoomId);
    }, 3000);
    return () => clearInterval(id);
  }, [activePartnerId, activeRoomId, loadConversations, loadMessages, loadGroupRooms, loadGroupMessages]);

  // メッセージ末尾へスクロール
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, groupMessages]);

  // ── DM アクション ─────────────────────────────────────────────────
  const openDmConversation = (partnerId, partnerName) => {
    setActiveTab("dm");
    setActivePartnerId(partnerId);
    setActivePartnerName(
      partnerName ||
        conversations.find((c) => c.partnerId === partnerId)?.partnerName ||
        employees.find((e) => e.employeeId === partnerId)?.employeeName ||
        ""
    );
    setActiveRoomId(null);
    setActiveRoomName("");
    setShowNewChat(false);
    setShowCreateGroup(false);
    setEmpSearch("");
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const onSendDm = async (e) => {
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
    await ensureEmployees();
    setShowNewChat(true);
    setEmpSearch("");
  };

  const onCloseConversation = async () => {
    if (!activePartnerId) return;
    if (
      !window.confirm(
        "この会話から退出しますか？\n自分の一覧からは消えますが、相手の画面では履歴が残り、退出したことが通知されます。"
      )
    )
      return;
    setError("");
    try {
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

  // ── グループ アクション ──────────────────────────────────────────
  const openGroupRoom = (room) => {
    setActiveTab("group");
    setActiveRoomId(room.roomId);
    setActiveRoomName(room.roomName);
    setActiveRoomMembers(room.members || []);
    setActivePartnerId(null);
    setActivePartnerName("");
    setShowCreateGroup(false);
    setShowAddMembers(false);
    setInputText("");
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const onSendGroup = async (e) => {
    e.preventDefault();
    if (!inputText.trim() || !activeRoomId) return;
    setError("");
    setSending(true);
    try {
      const res = await api.post(`/group-messenger/rooms/${activeRoomId}/messages`, {
        content: inputText.trim(),
      });
      setGroupMessages((prev) => [...prev, res.data]);
      setInputText("");
      loadGroupRooms();
    } catch (err) {
      setError(err.response?.data?.error || "送信に失敗しました。");
    } finally {
      setSending(false);
    }
  };

  const onOpenCreateGroup = async () => {
    await ensureEmployees();
    setShowCreateGroup(true);
    setGroupName("");
    setSelectedMemberIds(new Set());
    setGroupEmpSearch("");
    setActiveRoomId(null);
  };

  const onCreateGroup = async (e) => {
    e.preventDefault();
    if (!groupName.trim()) {
      setError("グループ名を入力してください。");
      return;
    }
    if (selectedMemberIds.size === 0) {
      setError("メンバーを1人以上選択してください。");
      return;
    }
    setError("");
    setCreating(true);
    try {
      const res = await api.post("/group-messenger/rooms", {
        roomName: groupName.trim(),
        memberIds: Array.from(selectedMemberIds),
      });
      setShowCreateGroup(false);
      setGroupName("");
      setSelectedMemberIds(new Set());
      loadGroupRooms();
      openGroupRoom(res.data);
    } catch (err) {
      setError(err.response?.data?.error || "グループ作成に失敗しました。");
    } finally {
      setCreating(false);
    }
  };

  const onLeaveGroup = async () => {
    if (!activeRoomId) return;
    if (!window.confirm("このグループから退出しますか？")) return;
    setError("");
    try {
      await api.post(`/group-messenger/rooms/${activeRoomId}/leave`);
      setGroupMessages([]);
      setActiveRoomId(null);
      setActiveRoomName("");
      setActiveRoomMembers([]);
      loadGroupRooms();
    } catch (err) {
      setError(err.response?.data?.error || "グループの退出に失敗しました。");
    }
  };

  const onOpenAddMembers = async () => {
    await ensureEmployees();
    setShowAddMembers(true);
    setAddingMemberIds(new Set());
    setAddEmpSearch("");
  };

  const onAddMembers = async () => {
    if (addingMemberIds.size === 0) return;
    setError("");
    try {
      await api.post(`/group-messenger/rooms/${activeRoomId}/members`, {
        memberIds: Array.from(addingMemberIds),
      });
      setShowAddMembers(false);
      setAddingMemberIds(new Set());
      loadGroupRooms();
      loadGroupMessages(activeRoomId);
    } catch (err) {
      setError(err.response?.data?.error || "メンバー追加に失敗しました。");
    }
  };

  const toggleMemberId = (set, setFn, id) => {
    setFn((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  // Enter 送信 / Shift+Enter 改行
  const onKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (activeTab === "dm") onSendDm(e);
      else if (activeRoomId) onSendGroup(e);
    }
  };

  const myId = user?.id ? Number(user.id) : null;

  // DM 候補フィルター（自分除外）
  const filteredEmployees = employees.filter(
    (e) =>
      e.employeeId !== myId &&
      (e.employeeName.includes(empSearch) || (e.department || "").includes(empSearch))
  );

  // グループ作成メンバー候補（自分除外）
  const groupEmpCandidates = employees.filter(
    (e) =>
      e.employeeId !== myId &&
      (e.employeeName.includes(groupEmpSearch) || (e.department || "").includes(groupEmpSearch))
  );

  // メンバー追加候補（自分・既存メンバー除外）
  const currentMemberIds = new Set(activeRoomMembers.map((m) => m.employeeId));
  const addEmpCandidates = employees.filter(
    (e) =>
      e.employeeId !== myId &&
      !currentMemberIds.has(e.employeeId) &&
      (e.employeeName.includes(addEmpSearch) || (e.department || "").includes(addEmpSearch))
  );

  // DM 未読合計
  const dmUnread = conversations.reduce((s, c) => s + (c.unreadCount || 0), 0);
  // グループ未読合計
  const groupUnread = groupRooms.reduce((s, r) => s + (r.unreadCount || 0), 0);

  // ── レンダリング ─────────────────────────────────────────────────
  return (
    <div className="page-container" style={{ paddingBottom: 0 }}>
      <h2 className="page-title">メッセンジャー</h2>

      {error && (
        <div className="error-msg" style={{ marginBottom: 12 }}>
          {error}
        </div>
      )}

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
        {/* ── 左: サイドバー ── */}
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
          {/* タブ */}
          <div style={{ display: "flex", borderBottom: "1px solid #e0e0e0" }}>
            {[
              { key: "dm", label: "DM", badge: dmUnread },
              { key: "group", label: "グループ", badge: groupUnread },
            ].map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setActiveTab(t.key)}
                style={{
                  flex: 1,
                  padding: "10px 0",
                  border: "none",
                  borderBottom: activeTab === t.key ? "2px solid #1a56db" : "2px solid transparent",
                  background: "transparent",
                  cursor: "pointer",
                  fontSize: 13,
                  fontWeight: activeTab === t.key ? 700 : 400,
                  color: activeTab === t.key ? "#1a56db" : "#666",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 4,
                }}
              >
                {t.label}
                {t.badge > 0 && (
                  <span
                    style={{
                      background: "#e53e3e",
                      color: "#fff",
                      borderRadius: 10,
                      padding: "1px 6px",
                      fontSize: 10,
                      fontWeight: 700,
                    }}
                  >
                    {t.badge}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* 新規ボタン */}
          <div style={{ padding: "10px 12px 8px", borderBottom: "1px solid #e0e0e0" }}>
            {activeTab === "dm" ? (
              <button
                type="button"
                className="primary"
                style={{ width: "100%", padding: "7px 0", fontSize: 13 }}
                onClick={onOpenNewChat}
              >
                ＋ 新規メッセージ
              </button>
            ) : (
              <button
                type="button"
                className="primary"
                style={{ width: "100%", padding: "7px 0", fontSize: 13 }}
                onClick={onOpenCreateGroup}
              >
                ＋ グループ作成
              </button>
            )}
          </div>

          {/* 一覧 */}
          <div style={{ flex: 1, overflowY: "auto" }}>
            {activeTab === "dm" ? (
              conversations.length === 0 ? (
                <p style={{ color: "#aaa", fontSize: 13, padding: "16px 12px", margin: 0 }}>
                  まだ会話がありません
                </p>
              ) : (
                conversations.map((c) => {
                  const isActive = activePartnerId === c.partnerId;
                  return (
                    <div
                      key={c.partnerId}
                      onClick={() => openDmConversation(c.partnerId, c.partnerName)}
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
                          <span style={{ fontSize: 11, color: "#aaa" }}>{formatTime(c.lastMessageAt)}</span>
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
              )
            ) : groupRooms.length === 0 ? (
              <p style={{ color: "#aaa", fontSize: 13, padding: "16px 12px", margin: 0 }}>
                まだグループがありません
              </p>
            ) : (
              groupRooms.map((r) => {
                const isActive = activeRoomId === r.roomId;
                return (
                  <div
                    key={r.roomId}
                    onClick={() => openGroupRoom(r)}
                    style={{
                      padding: "10px 12px",
                      cursor: "pointer",
                      background: isActive ? "#e8f0fe" : "transparent",
                      borderLeft: isActive ? "3px solid #1a56db" : "3px solid transparent",
                      borderBottom: "1px solid #ececec",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 5, minWidth: 0 }}>
                        <span
                          style={{
                            fontSize: 14,
                            background: "#e8eaf6",
                            color: "#3949ab",
                            borderRadius: 4,
                            padding: "1px 5px",
                            flexShrink: 0,
                          }}
                        >
                          👥
                        </span>
                        <span
                          style={{
                            fontWeight: 600,
                            fontSize: 14,
                            color: "#222",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {r.roomName}
                        </span>
                        <span style={{ fontSize: 11, color: "#aaa", flexShrink: 0 }}>
                          {r.memberCount}
                        </span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                        {r.unreadCount > 0 && (
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
                            {r.unreadCount}
                          </span>
                        )}
                        <span style={{ fontSize: 11, color: "#aaa" }}>{formatTime(r.lastMessageAt)}</span>
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
                      {r.lastMessage || "メッセージはまだありません"}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ── 右: コンテンツ ── */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
          {/* ── グループ作成フォーム ── */}
          {showCreateGroup ? (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: 16, overflowY: "auto" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                <h3 style={{ margin: 0, fontSize: 16 }}>グループ作成</h3>
                <button
                  type="button"
                  className="secondary"
                  style={{ fontSize: 12, padding: "3px 10px" }}
                  onClick={() => { setShowCreateGroup(false); setError(""); }}
                >
                  キャンセル
                </button>
              </div>
              <form onSubmit={onCreateGroup}>
                <div style={{ marginBottom: 14 }}>
                  <label style={{ fontSize: 13, color: "#444", display: "block", marginBottom: 4 }}>
                    グループ名
                  </label>
                  <input
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    placeholder="例: 開発チーム"
                    maxLength={100}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      border: "1px solid #ccc",
                      borderRadius: 4,
                      fontSize: 14,
                      boxSizing: "border-box",
                    }}
                  />
                </div>
                <div style={{ marginBottom: 8 }}>
                  <label style={{ fontSize: 13, color: "#444", display: "block", marginBottom: 4 }}>
                    メンバーを選択 ({selectedMemberIds.size}人)
                  </label>
                  <input
                    value={groupEmpSearch}
                    onChange={(e) => setGroupEmpSearch(e.target.value)}
                    placeholder="名前・所属で絞り込み"
                    style={{
                      width: "100%",
                      padding: "7px 12px",
                      border: "1px solid #ccc",
                      borderRadius: 4,
                      fontSize: 13,
                      marginBottom: 8,
                      boxSizing: "border-box",
                    }}
                  />
                  <div
                    style={{
                      border: "1px solid #e0e0e0",
                      borderRadius: 4,
                      maxHeight: 260,
                      overflowY: "auto",
                    }}
                  >
                    {groupEmpCandidates.length === 0 ? (
                      <p style={{ color: "#aaa", fontSize: 13, padding: "12px 16px", margin: 0 }}>
                        該当者がいません
                      </p>
                    ) : (
                      groupEmpCandidates.map((e) => (
                        <label
                          key={e.employeeId}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                            padding: "9px 12px",
                            borderBottom: "1px solid #f0f0f0",
                            cursor: "pointer",
                            background: selectedMemberIds.has(e.employeeId) ? "#eef2ff" : "transparent",
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={selectedMemberIds.has(e.employeeId)}
                            onChange={() => toggleMemberId(selectedMemberIds, setSelectedMemberIds, e.employeeId)}
                            style={{ width: 16, height: 16, flexShrink: 0 }}
                          />
                          <EmployeePhotoThumb
                            employeeId={e.employeeId}
                            photoFilename={e.photoFilename}
                            size={30}
                          />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                              <span style={{ fontWeight: 600, fontSize: 13 }}>{e.employeeName}</span>
                              <StatusBadge status={e.status ?? "PRESENT"} />
                            </div>
                            {e.department && (
                              <div style={{ fontSize: 11, color: "#888" }}>{e.department}</div>
                            )}
                          </div>
                        </label>
                      ))
                    )}
                  </div>
                </div>
                <button
                  type="submit"
                  className="primary"
                  disabled={creating || !groupName.trim() || selectedMemberIds.size === 0}
                  style={{ marginTop: 12, padding: "9px 24px", fontSize: 14 }}
                >
                  {creating ? "作成中…" : "グループを作成"}
                </button>
              </form>
            </div>

          ) : activeTab === "dm" && showNewChat ? (
            /* ── DM 新規: 社員選択 ── */
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
                      onClick={() => openDmConversation(e.employeeId, e.employeeName)}
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

          ) : activeTab === "dm" && activePartnerId ? (
            /* ── DM チャット ── */
            <>
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
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0 }}>
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
                  onMouseEnter={(e) => { e.currentTarget.style.background = "#e53e3e"; e.currentTarget.style.color = "#fff"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "#f0f0f0"; e.currentTarget.style.color = "#444"; }}
                >
                  ×
                </button>
              </div>

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
                    if (m.systemType === "PARTNER_LEFT") {
                      return (
                        <div key={m.messageId} style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "100%" }}>
                          <div style={{ maxWidth: "90%", textAlign: "center", fontSize: 13, color: "#666", background: "#eef0f3", borderRadius: 8, padding: "10px 14px", lineHeight: 1.5 }}>
                            {m.senderName}님이 대화방을 나갔습니다
                          </div>
                          <span style={{ fontSize: 11, color: "#aaa", marginTop: 4 }}>{formatTime(m.createdAt)}</span>
                        </div>
                      );
                    }
                    return (
                      <div key={m.messageId} style={{ display: "flex", flexDirection: "column", alignItems: isMine ? "flex-end" : "flex-start" }}>
                        {!isMine && <span style={{ fontSize: 11, color: "#888", marginBottom: 2 }}>{m.senderName}</span>}
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
                          {isMine && <span style={{ marginLeft: 4 }}>{m.read ? " ✓✓" : " ✓"}</span>}
                        </span>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              <form
                onSubmit={onSendDm}
                style={{ display: "flex", gap: 8, padding: "10px 12px", borderTop: "1px solid #e0e0e0", background: "#fff", flexShrink: 0 }}
              >
                <textarea
                  ref={inputRef}
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={onKeyDown}
                  placeholder="メッセージを入力… (Enter送信 / Shift+Enterで改行)"
                  rows={2}
                  style={{ flex: 1, padding: "8px 12px", fontSize: 14, border: "1px solid #ccc", borderRadius: 8, resize: "none", fontFamily: "inherit", lineHeight: 1.5 }}
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

          ) : activeTab === "group" && activeRoomId ? (
            /* ── グループチャット ── */
            <>
              {/* ヘッダー */}
              <div
                style={{
                  padding: "10px 16px",
                  borderBottom: "1px solid #e0e0e0",
                  background: "#fff",
                  flexShrink: 0,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 15, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {activeRoomName}
                    </div>
                    <div style={{ fontSize: 12, color: "#888", marginTop: 2 }}>
                      {activeRoomMembers.map((m) => m.employeeName).join("、")}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                    <button
                      type="button"
                      title="メンバーを招待"
                      onClick={onOpenAddMembers}
                      style={{
                        padding: "5px 10px",
                        border: "1px solid #ccc",
                        borderRadius: 6,
                        background: "#f8f9fa",
                        color: "#333",
                        fontSize: 12,
                        cursor: "pointer",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "#e8f0fe")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "#f8f9fa")}
                    >
                      ＋ 招待
                    </button>
                    <button
                      type="button"
                      title="グループを退出"
                      onClick={onLeaveGroup}
                      style={{
                        width: 32,
                        height: 32,
                        border: "none",
                        borderRadius: 6,
                        background: "#f0f0f0",
                        color: "#444",
                        fontSize: 18,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = "#e53e3e"; e.currentTarget.style.color = "#fff"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = "#f0f0f0"; e.currentTarget.style.color = "#444"; }}
                    >
                      ×
                    </button>
                  </div>
                </div>
              </div>

              {/* メンバー追加パネル */}
              {showAddMembers && (
                <div
                  style={{
                    borderBottom: "1px solid #e0e0e0",
                    background: "#f0f4ff",
                    padding: "12px 16px",
                    flexShrink: 0,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>メンバーを招待 ({addingMemberIds.size}人選択)</span>
                    <button
                      type="button"
                      className="secondary"
                      style={{ fontSize: 11, padding: "2px 8px", marginLeft: "auto" }}
                      onClick={() => setShowAddMembers(false)}
                    >
                      キャンセル
                    </button>
                    <button
                      type="button"
                      className="primary"
                      style={{ fontSize: 11, padding: "2px 10px" }}
                      disabled={addingMemberIds.size === 0}
                      onClick={onAddMembers}
                    >
                      招待
                    </button>
                  </div>
                  <input
                    value={addEmpSearch}
                    onChange={(e) => setAddEmpSearch(e.target.value)}
                    placeholder="名前・所属で絞り込み"
                    style={{ width: "100%", padding: "6px 10px", border: "1px solid #ccc", borderRadius: 4, fontSize: 13, marginBottom: 8, boxSizing: "border-box" }}
                  />
                  <div style={{ maxHeight: 180, overflowY: "auto", border: "1px solid #e0e0e0", borderRadius: 4, background: "#fff" }}>
                    {addEmpCandidates.length === 0 ? (
                      <p style={{ color: "#aaa", fontSize: 13, padding: "10px 14px", margin: 0 }}>追加できるメンバーがいません</p>
                    ) : (
                      addEmpCandidates.map((e) => (
                        <label
                          key={e.employeeId}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            padding: "8px 12px",
                            borderBottom: "1px solid #f0f0f0",
                            cursor: "pointer",
                            background: addingMemberIds.has(e.employeeId) ? "#eef2ff" : "transparent",
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={addingMemberIds.has(e.employeeId)}
                            onChange={() => toggleMemberId(addingMemberIds, setAddingMemberIds, e.employeeId)}
                            style={{ width: 15, height: 15 }}
                          />
                          <span style={{ fontSize: 13 }}>{e.employeeName}</span>
                          {e.department && <span style={{ fontSize: 11, color: "#888" }}>{e.department}</span>}
                        </label>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* グループメッセージ一覧 */}
              <div
                style={{
                  flex: 1,
                  overflowY: "auto",
                  padding: "16px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                  background: "#f0f4f8",
                }}
              >
                {groupMessages.length === 0 ? (
                  <p style={{ color: "#aaa", fontSize: 13, textAlign: "center", marginTop: 40 }}>
                    まだメッセージがありません。最初のメッセージを送りましょう！
                  </p>
                ) : (
                  groupMessages.map((m) => {
                    const isMine = m.senderId === myId;
                    const isSystem = m.systemType === "MEMBER_LEFT" || m.systemType === "MEMBER_JOINED";
                    if (isSystem) {
                      return (
                        <div key={m.messageId} style={{ display: "flex", justifyContent: "center" }}>
                          <div
                            style={{
                              fontSize: 12,
                              color: "#666",
                              background: "rgba(0,0,0,0.06)",
                              borderRadius: 12,
                              padding: "5px 14px",
                            }}
                          >
                            {m.content}
                          </div>
                        </div>
                      );
                    }
                    return (
                      <div
                        key={m.messageId}
                        style={{ display: "flex", flexDirection: "column", alignItems: isMine ? "flex-end" : "flex-start" }}
                      >
                        {!isMine && (
                          <span style={{ fontSize: 11, color: "#666", marginBottom: 2, fontWeight: 600 }}>
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
                        <span style={{ fontSize: 11, color: "#999", marginTop: 2 }}>
                          {formatTime(m.createdAt)}
                        </span>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* 入力エリア */}
              <form
                onSubmit={onSendGroup}
                style={{ display: "flex", gap: 8, padding: "10px 12px", borderTop: "1px solid #e0e0e0", background: "#fff", flexShrink: 0 }}
              >
                <textarea
                  ref={inputRef}
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={onKeyDown}
                  placeholder="メッセージを入力… (Enter送信 / Shift+Enterで改行)"
                  rows={2}
                  style={{ flex: 1, padding: "8px 12px", fontSize: 14, border: "1px solid #ccc", borderRadius: 8, resize: "none", fontFamily: "inherit", lineHeight: 1.5 }}
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
            /* ── 初期状態 ── */
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
              <span style={{ fontSize: 48 }}>{activeTab === "group" ? "👥" : "💬"}</span>
              <p style={{ margin: 0, fontSize: 15 }}>
                {activeTab === "group"
                  ? "グループを選択するか、新規グループを作成してください"
                  : "会話を選択するか、新規メッセージを開始してください"}
              </p>
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
