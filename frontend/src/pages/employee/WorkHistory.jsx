import React from 'react'
import MonthPickerCard from '../../components/MonthPickerCard'
import { useYearMonthState } from '../../hooks/useYearMonthState'
import { useWorkTimeByMonth } from '../../hooks/useWorkTimeByMonth'

function WorkHistory() {
  const [month, setMonth] = useYearMonthState()
  const { rows, error } = useWorkTimeByMonth(month)

  return (
    <div className="page-container">
      <h2 className="page-title">근무 이력</h2>

      <MonthPickerCard label="조회 월" month={month} onChange={setMonth} />

      {error && <div className="error-msg">{error}</div>}

      <div className="card" style={{ overflowX: 'auto' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>일자</th>
              <th>시작</th>
              <th>종료</th>
              <th>휴식(분)</th>
              <th>실근무(분)</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={5}>데이터가 없습니다.</td></tr>
            ) : (
              rows.map((r, i) => (
                <tr key={r.workId ?? i}>
                  <td>{r.workDate}</td>
                  <td>{r.startTime}</td>
                  <td>{r.endTime}</td>
                  <td>{r.breakMinutes}</td>
                  <td>{r.workMinutes}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default WorkHistory
