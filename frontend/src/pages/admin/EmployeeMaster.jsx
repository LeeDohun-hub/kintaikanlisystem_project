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
};

function EmployeeMaster() {
  const { user } = useAuth();
  const [rows, setRows] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [deleting, setDeleting] = useState(false);
  const selectAllRef = useRef(null);
  const [form, setForm] = useState(() => ({ ...EMPTY_FORM }));

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

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!isPasswordPolicyOk(form.password)) {
      setError(
        `パスワードは${PASSWORD_MIN}文字以上${PASSWORD_MAX}文字以下で、英字・数字・記号をそれぞれ1文字以上含めてください。`,
      );
      return;
    }
    try {
      await api.post("/employees", {
        employeeCode: form.employeeCode,
        employeeName: form.employeeName,
        department: form.department || undefined,
        hourlyCost:
          form.hourlyCost === "" ? undefined : Number(form.hourlyCost),
        activeFlag: Number(form.activeFlag),
        loginId: form.loginId,
        password: form.password,
        confirmPassword: form.confirmPassword,
        role: form.role,
      });
      setForm({ ...EMPTY_FORM });
      setSelectedIds(new Set());
      load();
    } catch (err) {
      const msg = err.response?.data?.error || "登録に失敗しました。";
      setError(typeof msg === "string" ? msg : "登録に失敗しました。");
    }
  };

  return (
    <div className="page-container">
      <h2 className="page-title">社員マスター入力</h2>
      <p className="page-subtitle">
        社員コードは8文字の英数字。パスワードは8文字以上で英字・数字・記号をそれぞれ含めてください。ログインIDは空白不可（1〜50文字）です。
        一覧で<strong>1名だけ</strong>チェックすると、その内容が上のフォームに自動入力されます（パスワードは空のままです）。
      </p>
      {error && <div className="error-msg">{error}</div>}

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
          <div className="form-row" style={{ marginTop: 10 }}>
            <input
              name="loginId"
              value={form.loginId}
              onChange={onChange}
              placeholder="ログインID（例: admin02, user001）"
              required
              maxLength={50}
              autoComplete="off"
            />
            <select name="role" value={form.role} onChange={onChange}>
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
              placeholder="英字・数字・記号を含む8文字以上"
              required
              minLength={PASSWORD_MIN}
              maxLength={PASSWORD_MAX}
              title="8文字以上72文字以下、英字・数字・記号をそれぞれ1文字以上"
              autoComplete="new-password"
            />
            <input
              name="confirmPassword"
              type="password"
              value={form.confirmPassword}
              onChange={onChange}
              placeholder="パスワード（確認）"
              required
              minLength={PASSWORD_MIN}
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
            <button type="submit" className="primary">
              登録
            </button>
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
                <th>ID</th>
                <th>社員コード</th>
                <th>ログインID</th>
                <th>氏名</th>
                <th>所属</th>
                <th>時給原価</th>
                <th>有効</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={8}>データがありません。</td>
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
                      <td>{r.employeeId}</td>
                      <td>{r.employeeCode}</td>
                      <td>{r.loginId ?? "—"}</td>
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
    </div>
  );
}

export default EmployeeMaster;
