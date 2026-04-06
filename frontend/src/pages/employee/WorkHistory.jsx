import React, { useState, useEffect } from 'react'
import api from '../../api/api'

const WORK_TYPE_LABELS = { NORMAL: '일반', OVERTIME: '야근', HOLIDAY: '휴일' }
const WORK_TYPE_COLORS = {
  NORMAL: '#dbeafe',
  OVERTIME: '#fef3c7',
  HOLIDAY: '#fee2e2'
}

function WorkHistory() {
  const [records, setRecords] = useState([])
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7))
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setLoading(true)
    api.get(`/attendance?month=${month}`)
      .then(res => setRecords(res.data))
      .catch(() => setRecords([]))
      .finally(() => setLoading(false))
  }, [month])

  const totalHours = records.reduce((s, r) => s + (r.workHours || 0), 0).toFixed(1)
  const workDays = records.length

  return (
    <div className="page-container">
      <h2 className="page-title">근무 이력</h2>

      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <label style={{ fontWeight: 500, fontSize: 14 }}>월 선택:</label>
            <input
              type="month"
              value={month}
              onChange={e => setMonth(e.target.value)}
              style={{ padding: '6px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 14 }}
            />
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 20 }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#3498db' }}>{workDays}일</div>
              <div style={{ fontSize: 12, color: '#7f8c8d' }}>근무일수</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#2ecc71' }}>{totalHours}h</div>
              <div style={{ fontSize: 12, color: '#7f8c8d' }}>총 근무시간</div>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        {loading ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#7f8c8d' }}>로딩 중...</div>
        ) : records.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>해당 월의 근무 기록이 없습니다.</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>근무일</th>
                <th>구분</th>
                <th>시작</th>
                <th>종료</th>
                <th>휴식(분)</th>
                <th>근무시간</th>
                <th>프로젝트</th>
                <th>업무 내용</th>
              </tr>
            </thead>
            <tbody>
              {records.map(r => (
                <tr key={r.id}>
                  <td>{r.workDate}</td>
                  <td>
                    <span style={{
                      background: WORK_TYPE_COLORS[r.workType] || '#f3f4f6',
                      padding: '2px 8px',
                      borderRadius: 3,
                      fontSize: 12,
                      fontWeight: 500
                    }}>
                      {WORK_TYPE_LABELS[r.workType] || r.workType}
                    </span>
                  </td>
                  <td>{r.startTime || '-'}</td>
                  <td>{r.endTime || '-'}</td>
                  <td>{r.breakMinutes}</td>
                  <td><strong>{r.workHours?.toFixed(1)}h</strong></td>
                  <td>{r.projectName || '-'}</td>
                  <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {r.comment || '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

export default WorkHistory
