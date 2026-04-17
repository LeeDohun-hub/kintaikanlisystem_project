import React, { useEffect, useMemo, useRef, useState } from "react";
import api from "../../api/api";
import BackToMenuLink from "../../components/BackToMenuLink";
import { useAuth } from "../../context/AuthContext";

const PASSWORD_MIN = 8;
const PASSWORD_MAX = 72;

function isPasswordPolicyOk(p) {
  if (!p || p.length < PASSWORD_MIN || p.length > PASSWORD_MAX) return false;
  if (!/[A-Za-z]/.test(p)) return false;
  if (!/\d/.test(p)) return false;
  if (!/[^A-Za-z0-9\s]/.test(p)) return false;
  return true;
}

const EMPTY_FORM = {
  employeeCode: "",
  employeeName: "",
  department: "",
  hourlyCost: "",
  activeFlag: 1,
  loginId: "",
  password: "",
  confirmPassword: "",
  role: "EMPLOYEE",
  inviteEmail: "",
};

function PhotoThumb({ employeeId, photoFilename, size = 32 }) {
  const [broken, setBroken] = React.useState(false);
  if (!photoFilename || broken) {
    return (
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: size,
          height: size,
          borderRadius: "50%",
          background: "#dde3ec",
          fontSize: size * 0.45,
          color: "#7f8c8d",
          flexShrink: 0,
        }}
      >
        {"\u{1F464}"}
      </span>
    );
  }
  return (
    <img
      src={`/api/employees/${employeeId}/photo`}
      alt=""
      onError={() => setBroken(true)}
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        objectFit: "cover",
        flexShrink: 0,
      }}
    />
  );
}

function EmployeeMaster() {
  const { user } = useAuth();
  const [rows, setRows] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [deleting, setDeleting] = useState(false);
  const selectAllRef = useRef(null);
  const [form, setForm] = useState(() => ({ ...EMPTY_FORM }));
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const photoInputRef = useRef(null);
  const [successMsg, setSuccessMsg] = useState("");
  const [inviteBusy, setInviteBusy] = useState(false);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [inviteModalEmail, setInviteModalEmail] = useState("");
  const [updateBusy, setUpdateBusy] = useState(false);

  const load = () => {
    setError("");
    setLoading(true);
    api
      .get("/employees")
      .then((r) => setRows(r.data || []))
      .catch(() => setError("従業員一覧を読み込めませんでした。"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const isSelf = (employeeId) =>
    user != null && Number(user.id) === Number(employeeId);

  const selectableRows = useMemo(
    () => rows.filter((r) => !isSelf(r.employeeId)),
    [rows, user],
  );

  useEffect(() => {
    const valid = new Set(rows.map((r) => r.employeeId));
    setSelectedIds((prev) => {
      const next = new Set([...prev].filter((id) => valid.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [rows]);

  const selectedKey = useMemo(
    () =>
      [...selectedIds]
        .map(Number)
        .sort((a, b) => a - b)
        .join(","),
    [selectedIds],
  );

  /** 一覧で1名だけ選択した行 */
  const selectedSingleRow = useMemo(() => {
    if (!selectedKey) return null;
    const parts = selectedKey.split(",").filter((s) => s !== "");
    if (parts.length !== 1) return null;
    const id = Number(parts[0]);
    return rows.find((r) => Number(r.employeeId) === id) ?? null;
  }, [selectedKey, rows]);

  const isEditMode = selectedSingleRow != null;
  const hasLoginAccount =
    isEditMode &&
    String(selectedSingleRow.loginId ?? "").trim() !== "";

  /** 一覧で1名だけチェックしたとき、その行の内容を上のフォームへ反映（パスワードは空） */
  useEffect(() => {
    if (!selectedKey) {
      setForm({ ...EMPTY_FORM });
      return;
    }
    const parts = selectedKey.split(",").filter((s) => s !== "");
    if (parts.length !== 1) {
      setForm({ ...EMPTY_FORM });
      return;
    }
    const id = Number(parts[0]);
    const row = rows.find((r) => Number(r.employeeId) === id);
    if (!row) {
      setForm({ ...EMPTY_FORM });
      return;
    }
    setForm({
      employeeCode: row.employeeCode ?? "",
      employeeName: row.employeeName ?? "",
      department: row.department ?? "",
      hourlyCost:
        row.hourlyCost != null && row.hourlyCost !== ""
          ? String(row.hourlyCost)
          : "",
      activeFlag: row.activeFlag != null ? Number(row.activeFlag) : 1,
      loginId: row.loginId ?? "",
      password: "",
      confirmPassword: "",
      role: row.role === "ADMIN" ? "ADMIN" : "EMPLOYEE",
      inviteEmail: row.inviteEmail ?? "",
    });
  }, [selectedKey, rows]);

  const allSelectableSelected =
    selectableRows.length > 0 &&
    selectableRows.every((r) => selectedIds.has(r.employeeId));
  const selectedCount = selectedIds.size;

  useEffect(() => {
    const el = selectAllRef.current;
    if (!el) return;
    el.indeterminate =
      selectedCount > 0 && selectedCount < selectableRows.length;
  }, [selectedCount, selectableRows.length]);

  const toggleOne = (employeeId) => {
    if (isSelf(employeeId)) return;
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(employeeId)) next.delete(employeeId);
      else next.add(employeeId);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectableRows.length === 0) return;
    if (allSelectableSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(selectableRows.map((r) => r.employeeId)));
    }
  };

  const deleteSelected = async () => {
    const ids = [...selectedIds];
    if (ids.length === 0) return;
    if (
      !window.confirm(
        `選択した ${ids.length} 件の従業員・ログインアカウントを削除します。勤務データがある場合はDB設定に従い連動削除されます。この操作は取り消せません。`,
      )
    ) {
      return;
    }
    setError("");
    setDeleting(true);
    try {
      await api.post("/employees/batch-delete", { employeeIds: ids });
      setSelectedIds(new Set());
      await load();
    } catch (err) {
      const msg = err.response?.data?.error || "削除に失敗しました。";
      setError(typeof msg === "string" ? msg : "削除に失敗しました。");
    } finally {
      setDeleting(false);
    }
  };

  const onPhotoChange = (e) => {
    const file = e.target.files?.[0] ?? null;
    setPhotoFile(file);
    if (file) {
      const url = URL.createObjectURL(file);
      setPhotoPreview(url);
    } else {
      setPhotoPreview(null);
    }
  };

  const clearPhoto = () => {
    setPhotoFile(null);
    setPhotoPreview(null);
    if (photoInputRef.current) photoInputRef.current.value = "";
  };

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (isEditMode) {
      await handleUpdate();
      return;
    }
    setError("");
    setSuccessMsg("");

    if (!isPasswordPolicyOk(form.password)) {
      setError(
        `パスワードは${PASSWORD_MIN}文字以上${PASSWORD_MAX}文字以下で、英字・数字・記号をそれぞれ1文字以上含めてください。`,
      );
      return;
    }

    let createdId = null;
    try {
      const res = await api.post("/employees", {
        employeeCode: form.employeeCode,
        employeeName: form.employeeName,
        department: form.department || undefined,
        hourlyCost: form.hourlyCost === "" ? undefined : Number(form.hourlyCost),
        activeFlag: Number(form.activeFlag),
        loginId: form.loginId,
        password: form.password,
        confirmPassword: form.confirmPassword,
        role: form.role,
        inviteEmail: form.inviteEmail.trim() || undefined,
      });
      createdId = res.data?.employeeId;
    } catch (err) {
      const msg = err.response?.data?.error || "登録に失敗しました。";
      setError(typeof msg === "string" ? msg : "登録に失敗しました。");
      return;
    }

    // 写真がある場合はアップロード
    if (createdId && photoFile) {
      try {
        const fd = new FormData();
        fd.append("file", photoFile);
        await api.post(`/employees/${createdId}/photo`, fd, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      } catch {
        // 写真アップロード失敗は警告のみ（登録自体は成功）
        setError("従業員は登録しましたが、写真のアップロードに失敗しました。");
      }
    }

    // 招待メールアドレスが入力されていれば自動送信
    if (createdId && form.inviteEmail.trim()) {
      try {
        await api.post(`/employees/${createdId}/invite-email/send`, {
          inviteEmail: form.inviteEmail.trim(),
          loginId: form.loginId.trim(),
          initialPassword: form.password,
        });
        setSuccessMsg("従業員とログインアカウントを登録し、招待メールを送信しました。");
      } catch (mailErr) {
        const mailMsg = mailErr.response?.data?.error || "メール送信に失敗しました。";
        setSuccessMsg("従業員とログインアカウントを登録しました。");
        setError(`招待メールの送信に失敗しました: ${typeof mailMsg === "string" ? mailMsg : "送信エラー"}`);
      }
    } else {
      setSuccessMsg("従業員とログインアカウントを登録しました。");
    }

    setForm({ ...EMPTY_FORM });
    clearPhoto();
    setSelectedIds(new Set());
    load();
  };

  const handleUpdate = async () => {
    if (!selectedSingleRow) return;
    setError("");
    setSuccessMsg("");

    const pw = form.password;
    const cpw = form.confirmPassword;
    const pwTouched = Boolean((pw && pw.length > 0) || (cpw && cpw.length > 0));
    if (pwTouched) {
      if (!isPasswordPolicyOk(pw)) {
        setError(
          `パスワードは${PASSWORD_MIN}文字以上${PASSWORD_MAX}文字以下で、英字・数字・記号をそれぞれ1文字以上含めてください。`,
        );
        return;
      }
      if (pw !== cpw) {
        setError("パスワードとパスワード（確認）が一致しません。");
        return;
      }
    }

    if (hasLoginAccount && !String(form.loginId ?? "").trim()) {
      setError("ログインIDを入力してください。");
      return;
    }

    setUpdateBusy(true);
    const id = selectedSingleRow.employeeId;
    try {
      await api.put(`/employees/${id}`, {
        employeeCode: form.employeeCode,
        employeeName: form.employeeName,
        department: form.department || undefined,
        hourlyCost: form.hourlyCost === "" ? undefined : Number(form.hourlyCost),
        activeFlag: Number(form.activeFlag),
        loginId: hasLoginAccount ? form.loginId.trim() : undefined,
        password: pwTouched ? pw : undefined,
        confirmPassword: pwTouched ? cpw : undefined,
        role: hasLoginAccount ? form.role : undefined,
        inviteEmail: form.inviteEmail.trim() || undefined,
      });
    } catch (err) {
      const msg = err.response?.data?.error || "更新に失敗しました。";
      setError(typeof msg === "string" ? msg : "更新に失敗しました。");
      setUpdateBusy(false);
      return;
    }

    if (photoFile) {
      try {
        const fd = new FormData();
        fd.append("file", photoFile);
        await api.post(`/employees/${id}/photo`, fd, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      } catch {
        setError("従業員情報は更新しましたが、写真のアップロードに失敗しました。");
        setUpdateBusy(false);
        await load();
        return;
      }
    }

    setSuccessMsg("従業員情報を更新しました。");
    setForm((prev) => ({
      ...prev,
      password: "",
      confirmPassword: "",
    }));
    clearPhoto();
    await load();
    setUpdateBusy(false);
  };

  const openInviteModal = () => {
    setError("");
    setSuccessMsg("");
    setInviteModalOpen(true);
  };

  useEffect(() => {
    if (!inviteModalOpen) return;
    if (!selectedSingleRow) {
      setInviteModalEmail("");
      return;
    }
    const fresh = rows.find(
      (r) => Number(r.employeeId) === Number(selectedSingleRow.employeeId),
    );
    setInviteModalEmail((fresh?.inviteEmail ?? "").trim());
  }, [inviteModalOpen, selectedSingleRow?.employeeId, rows]);

  const closeInviteModal = () => {
    setInviteModalOpen(false);
  };

  const sendInviteEmail = async () => {
    if (!selectedSingleRow) return;
    setError("");
    setSuccessMsg("");
    setInviteBusy(true);
    try {
      const trimmed = inviteModalEmail.trim();
      const res = await api.post(
        `/employees/${selectedSingleRow.employeeId}/invite-email/send`,
        trimmed ? { inviteEmail: trimmed } : {},
      );
      const m = res.data?.message;
      setSuccessMsg(typeof m === "string" ? m : "招待メールを送信しました。");
      await load();
      if (trimmed) {
        setInviteModalEmail(trimmed);
        setForm((prev) => ({ ...prev, inviteEmail: trimmed }));
      }
      closeInviteModal();
    } catch (err) {
      const msg = err.response?.data?.error || "送信に失敗しました。";
      setError(typeof msg === "string" ? msg : "送信に失敗しました。");
    } finally {
      setInviteBusy(false);
    }
  };

  return (
    <div className="page-container">
      <h2 className="page-title">社員マスター入力</h2>
      <p className="page-subtitle">
        
        
        
      </p>
      {error && <div className="error-msg">{error}</div>}
      {successMsg && (
        <div
          className="error-msg"
          style={{
            color: "#067d4a",
            background: "#e8fff4",
            border: "1px solid #a3dcc4",
          }}
        >
          {successMsg}
        </div>
      )}

      <div className="card" style={{ marginBottom: 16 }}>
        <h3 style={{ marginTop: 0 }}></h3>
        <form onSubmit={onSubmit}>
          <div className="form-row">
            <input
              name="employeeCode"
              value={form.employeeCode}
              onChange={onChange}
              placeholder="社員コード（8文字・英数字）"
              required
              maxLength={8}
              pattern="[A-Za-z0-9]{8}"
              title="8文字の英数字"
            />
            <input
              name="employeeName"
              value={form.employeeName}
              onChange={onChange}
              placeholder="氏名"
              required
              maxLength={50}
            />
          </div>
          <p>
            社員コードは8文字の英数字。パスワードは8文字以上で英字・数字・記号をそれぞれ含めてください。
          </p>
          <div className="form-row">
            <input
              name="inviteEmail"
              type="email"
              value={form.inviteEmail}
              onChange={onChange}
              placeholder="招待メール送付先（入力すると登録後に自動送信）"
              maxLength={254}
              autoComplete="off"
              style={{ flex: "1 1 100%" }}
            />
            <p>
              メールアドレスを入力すると登録と同時に招待メールが自動送信されます。
            </p>
          </div>
          <div className="form-row">
            <input
              name="loginId"
              value={form.loginId}
              onChange={onChange}
              placeholder="ログインID（例: admin02, user001）"
              required={!isEditMode || hasLoginAccount}
              maxLength={50}
              autoComplete="off"
            />
            <select
              name="role"
              value={form.role}
              onChange={onChange}
            >
              <option value="EMPLOYEE">一般スタッフ</option>
              <option value="ADMIN">管理者</option>
            </select>
          </div>
          <div className="form-row" style={{ marginTop: 10 }}>
            <input
              name="password"
              type="password"
              value={form.password}
              onChange={onChange}
              placeholder={
                isEditMode
                  ? "変更する場合のみ入力（英字・数字・記号を含む8文字以上）"
                  : "英字・数字・記号を含む8文字以上"
              }
              required={!isEditMode}
              minLength={isEditMode ? undefined : PASSWORD_MIN}
              maxLength={PASSWORD_MAX}
              title="8文字以上72文字以下、英字・数字・記号をそれぞれ1文字以上"
              autoComplete="new-password"
              
            />
            <input
              name="confirmPassword"
              type="password"
              value={form.confirmPassword}
              onChange={onChange}
              placeholder={isEditMode ? "パスワード（確認・変更時のみ）" : "パスワード（確認）"}
              required={!isEditMode}
              minLength={isEditMode ? undefined : PASSWORD_MIN}
              maxLength={PASSWORD_MAX}
              autoComplete="new-password"
            />
          </div>
          <div className="form-row" style={{ marginTop: 10 }}>
            <input
              name="department"
              value={form.department}
              onChange={onChange}
              placeholder="所属（任意）"
              maxLength={50}
            />
            <input
              name="hourlyCost"
              type="number"
              step="0.01"
              min="0"
              value={form.hourlyCost}
              onChange={onChange}
              placeholder="時給原価（任意、未入力は0）"
            />
            <select
              name="activeFlag"
              value={form.activeFlag}
              onChange={onChange}
            >
              <option value={1}>有効(1)</option>
              <option value={0}>無効(0)</option>
            </select>
            {isEditMode ? (
              <button
                type="button"
                className="primary"
                disabled={updateBusy}
                onClick={handleUpdate}
              >
                {updateBusy ? "更新中…" : "修正"}
              </button>
            ) : null}
            <button
              type="submit"
              className="primary"
              disabled={isEditMode}
              title={
                isEditMode
                  ? "新規登録するには一覧のチェックを外してください"
                  : undefined
              }
            >
              登録
            </button>
          </div>
          <div className="form-row" style={{ marginTop: 10, alignItems: "center", gap: 12 }}>
            {photoPreview ? (
              <img
                src={photoPreview}
                alt="プレビュー"
                style={{ width: 64, height: 64, borderRadius: "50%", objectFit: "cover", border: "2px solid #ddd", flexShrink: 0 }}
              />
            ) : (
              <span
                style={{
                  display: "inline-flex", alignItems: "center", justifyContent: "center",
                  width: 64, height: 64, borderRadius: "50%", background: "#dde3ec",
                  fontSize: 28, color: "#7f8c8d", flexShrink: 0,
                }}
              >
                {"\u{1F464}"}
              </span>
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#555" }}>
                プロフィール写真（任意・JPEG/PNG/GIF/WebP・5MB以下）
              </label>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input
                  ref={photoInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  onChange={onPhotoChange}
                  style={{ fontSize: 13 }}
                />
                {photoFile && (
                  <button type="button" className="secondary" style={{ padding: "4px 10px", fontSize: 12 }} onClick={clearPhoto}>
                    クリア
                  </button>
                )}
              </div>
            </div>
          </div>
        </form>
      </div>

      <div className="card" style={{ overflowX: "auto" }}>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            marginBottom: 12,
          }}
        >
          <h3 style={{ margin: 0 }}>従業員一覧</h3>
          <p>
            一覧で<strong>1名だけ</strong>チェックすると、その内容が上のフォームに自動入力されます（パスワードは空のままです）。
            内容を変更したあと<strong>修正</strong>で保存できます。パスワードは変更する場合のみ入力してください。
            新規登録は一覧の選択を外した状態で<strong>登録</strong>を押してください。
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            <button
              type="button"
              className="primary"
              onClick={openInviteModal}
              title="従業員を1名選択した状態で押すと招待メールを再送できます"
            >
              招待メール再送
            </button>
            <button
              type="button"
              className="secondary"
              disabled={selectedCount === 0 || deleting}
              onClick={deleteSelected}
            >
              {deleting
                ? "削除中…"
                : `選択を削除${selectedCount > 0 ? `（${selectedCount}件）` : ""}`}
            </button>
          </div>
        </div>
        {loading ? (
          <p>読み込み中…</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: 44, textAlign: "center" }}>
                  <input
                    ref={selectAllRef}
                    type="checkbox"
                    checked={allSelectableSelected}
                    onChange={toggleSelectAll}
                    disabled={selectableRows.length === 0}
                    title="一覧から選択可能な行をすべて選択"
                    aria-label="すべて選択"
                  />
                </th>
                <th style={{ width: 44 }}></th>
                <th>ID</th>
                <th>社員コード</th>
                <th>ログインID</th>
                <th>e-mail</th>
                <th>氏名</th>
                <th>所属</th>
                <th>時給原価</th>
                <th>有効</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={10}>データがありません。</td>
                </tr>
              ) : (
                rows.map((r) => {
                  const self = isSelf(r.employeeId);
                  return (
                    <tr key={r.employeeId}>
                      <td style={{ textAlign: "center" }}>
                        <input
                          type="checkbox"
                          checked={selectedIds.has(r.employeeId)}
                          onChange={() => toggleOne(r.employeeId)}
                          disabled={self}
                          title={
                            self
                              ? "ログイン中の自分は削除できません"
                              : "削除対象に含める"
                          }
                          aria-label={`${r.employeeName}を選択`}
                        />
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <PhotoThumb employeeId={r.employeeId} photoFilename={r.photoFilename} size={32} />
                      </td>
                      <td>{r.employeeId}</td>
                      <td>{r.employeeCode}</td>
                      <td>{r.loginId ?? "—"}</td>
                      <td style={{ maxWidth: 200, wordBreak: "break-all" }}>
                        {r.inviteEmail?.trim() ? r.inviteEmail : "—"}
                      </td>
                      <td>{r.employeeName}</td>
                      <td>{r.department ?? ""}</td>
                      <td>{r.hourlyCost ?? ""}</td>
                      <td>{r.activeFlag}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        )}
      </div>

      <BackToMenuLink />

      {inviteModalOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: 16,
          }}
          onClick={closeInviteModal}
          onKeyDown={(e) => {
            if (e.key === "Escape") closeInviteModal();
          }}
          role="presentation"
        >
          <div
            className="card"
            style={{
              maxWidth: 520,
              width: "100%",
              margin: 0,
              maxHeight: "min(90vh, 640px)",
              overflow: "auto",
            }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="invite-modal-title"
          >
            <h3 id="invite-modal-title" style={{ marginTop: 0 }}>
              招待メール再送
            </h3>
            {selectedSingleRow ? (
              <>
                <p style={{ marginTop: 0, fontSize: 14, lineHeight: 1.5 }}>
                  選択中: <strong>{selectedSingleRow.employeeName}</strong>
                  （ログインID: {selectedSingleRow.loginId ?? "—"}）<br />
                  送付先を確認・変更して送信してください。メール本文にはログイン画面URLとログインIDが記載されます。
                </p>
                <label
                  htmlFor="invite-modal-email"
                  style={{
                    display: "block",
                    marginTop: 12,
                    fontSize: 13,
                    fontWeight: 600,
                    color: "#333",
                  }}
                >
                  招待メール送付先
                </label>
                <input
                  id="invite-modal-email"
                  type="email"
                  value={inviteModalEmail}
                  onChange={(e) => setInviteModalEmail(e.target.value)}
                  placeholder="example@company.com"
                  maxLength={254}
                  autoComplete="off"
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    marginTop: 6,
                    padding: "10px 12px",
                  }}
                />
                <div
                  className="form-row"
                  style={{ marginTop: 16, flexWrap: "wrap", gap: 10 }}
                >
                  <button
                    type="button"
                    className="primary"
                    disabled={inviteBusy || !inviteModalEmail.trim()}
                    onClick={sendInviteEmail}
                  >
                    {inviteBusy ? "送信中…" : "招待メールを送信"}
                  </button>
                  <button
                    type="button"
                    className="secondary"
                    disabled={inviteBusy}
                    onClick={closeInviteModal}
                  >
                    閉じる
                  </button>
                </div>
              </>
            ) : (
              <>
                <p style={{ marginTop: 0, fontSize: 14, lineHeight: 1.5 }}>
                  一覧で従業員を<strong>1名だけ</strong>チェックしてから、もう一度「招待メール再送」を押してください。
                </p>
                <div className="form-row" style={{ marginTop: 16 }}>
                  <button type="button" className="secondary" onClick={closeInviteModal}>
                    閉じる
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default EmployeeMaster;
