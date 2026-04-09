import React, { useState } from 'react'
import MonthPickerCard from '../../components/MonthPickerCard'
import { useYearMonthState } from '../../hooks/useYearMonthState'
import { useWorkTimeByMonth } from '../../hooks/useWorkTimeByMonth'
import { useAuth } from '../../context/AuthContext'
import api from '../../api/api'
import { formatMinutesAsHm, parseHmToMinutes } from '../../utils/timeFormat'

function WorkHistory() {
  const { user } = useAuth()
  const [month, setMonth] = useYearMonthState()
  const { rows, error, refetch } = useWorkTimeByMonth(month)

  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState(null)
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)

  const isMine = (r) => user != null && Number(r.employeeId) === Number(user.id)

  const startEdit = (r) => {
    setEditingId(r.workId)
    setFormError('')
    setEditForm({
      workDate: r.workDate,
      startTime: (r.startTime || '').toString().slice(0, 5),
      endTime: (r.endTime || '').toString().slice(0, 5),
      breakHm: formatMinutesAsHm(r.breakMinutes),
      remarks: r.remarks ?? ''
    })
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditForm(null)
    setFormError('')
  }

  const handleEditChange = (e) => {
    setEditForm({ ...editForm, [e.target.name]: e.target.value })
  }

  const saveEdit = async (e) => {
    e.preventDefault()
    if (!editingId || !editForm) return
    setFormError('')
    const breakMinutes = parseHmToMinutes(editForm.breakHm)
    if (Number.isNaN(breakMinutes)) {
      setFormError('휴식은 H:MM 형식으로 입력하세요. (예: 1:00, 1:30)')
      return
    }
    if (breakMinutes < 0 || breakMinutes > 24 * 60) {
      setFormError('휴식 시간이 올바른 범위인지 확인하세요.')
      return
    }
    setSaving(true)
    try {
      await api.put(`/worktime/${editingId}`, {
        workDate: editForm.workDate,
        startTime: editForm.startTime,
        endTime: editForm.endTime,
        breakMinutes,
        remarks: editForm.remarks.trim() || undefined
      })
      cancelEdit()
      refetch()
    } catch (err) {
      const msg = err.response?.data?.error || '저장에 실패했습니다.'
      setFormError(typeof msg === 'string' ? msg : '저장에 실패했습니다.')
    } finally {
      setSaving(false)
    }
  }

  const removeRow = async (workId) => {
    if (!window.confirm('이 근무 기록을 삭제할까요?')) return
    try {
      await api.delete(`/worktime/${workId}`)
      if (editingId === workId) cancelEdit()
      refetch()
    } catch (err) {
      const msg = err.response?.data?.error || '삭제에 실패했습니다.'
      window.alert(typeof msg === 'string' ? msg : '삭제에 실패했습니다.')
    }
  }

  return (
    <div className="page-container">
      <h2 className="page-title">근무 이력</h2>

      <MonthPickerCard label="조회 월" month={month} onChange={setMonth} />

      <div style={{ margin: '8px 0 12px' }}>
        <button
          type="button"
          className="primary"
          onClick={() => window.open(`/api/reports/monthly.pdf?month=${month}`, '_blank')}
        >
          월별 리포팅 PDF 출력
        </button>
      </div>

      {error && <div className="error-msg">{error}</div>}

      <div className="card" style={{ overflowX: 'auto' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>日付</th>
              <th>始業</th>
              <th>終業</th>
              <th>休憩</th>
              <th>実働(当日)</th>
              <th>実働(累計)</th>
              <th>備考</th>
              <th style={{ minWidth: 140 }}>操作</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={8}>데이터가 없습니다.</td></tr>
            ) : (
              rows.map((r, i) => (
                <tr
                  key={r.workId ?? i}
                  style={
                    editingId === r.workId
                      ? { background: 'rgba(59, 130, 246, 0.08)' }
                      : undefined
                  }
                >
                  <td>{r.workDate}</td>
                  <td>{r.startTime}</td>
                  <td>{r.endTime}</td>
                  <td>{formatMinutesAsHm(r.breakMinutes)}</td>
                  <td>{r.dailyWorkHm ?? formatMinutesAsHm(r.workMinutes)}</td>
                  <td>{r.cumulativeWorkHm ?? '—'}</td>
                  <td style={{ maxWidth: 280, whiteSpace: 'pre-wrap' }}>{r.remarks ?? ''}</td>
                  <td>
                    {isMine(r) ? (
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <button
                          type="button"
                          className="primary"
                          style={{ padding: '4px 10px', fontSize: 13 }}
                          onClick={() => startEdit(r)}
                        >
                          修正
                        </button>
                        <button
                          type="button"
                          className="secondary"
                          style={{ padding: '4px 10px', fontSize: 13 }}
                          onClick={() => removeRow(r.workId)}
                        >
                          削除
                        </button>
                      </div>
                    ) : (
                      <span style={{ color: '#999', fontSize: 13 }}>—</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {editForm && editingId != null && (
        <div className="card" style={{ marginTop: 16 }}>
          <h3 style={{ marginTop: 0 }}>選択した行を修正</h3>
          {formError && <div className="error-msg">{formError}</div>}
          <form onSubmit={saveEdit}>
            <div className="form-row">
              <div className="form-group">
                <label>근무일 *</label>
                <input
                  type="date"
                  name="workDate"
                  value={editForm.workDate}
                  onChange={handleEditChange}
                  required
                />
              </div>
              <div className="form-group">
                <label>시작 시간 *</label>
                <input
                  type="time"
                  name="startTime"
                  value={editForm.startTime}
                  onChange={handleEditChange}
                  required
                />
              </div>
              <div className="form-group">
                <label>종료 시간 *</label>
                <input
                  type="time"
                  name="endTime"
                  value={editForm.endTime}
                  onChange={handleEditChange}
                  required
                />
              </div>
              <div className="form-group">
                <label>휴식 *</label>
                <input
                  type="text"
                  name="breakHm"
                  value={editForm.breakHm}
                  onChange={handleEditChange}
                  placeholder="1:00"
                  required
                  style={{ maxWidth: 120 }}
                />
              </div>
            </div>
            <div className="form-group">
              <label>備考</label>
              <textarea
                name="remarks"
                value={editForm.remarks}
                onChange={handleEditChange}
                rows={3}
                maxLength={500}
                style={{ width: '100%', maxWidth: 560, boxSizing: 'border-box' }}
              />
            </div>
            <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
              <button type="submit" className="primary" disabled={saving}>
                {saving ? '保存中…' : '保存'}
              </button>
              <button type="button" className="secondary" onClick={cancelEdit} disabled={saving}>
                キャンセル
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}

export default WorkHistory
