import React from 'react'
import MonthPickerCard from '../../components/MonthPickerCard'
import { useYearMonthState } from '../../hooks/useYearMonthState'
import { useWorkTimeByMonth } from '../../hooks/useWorkTimeByMonth'

function WorkView() {
  const [month, setMonth] = useYearMonthState()
  const { rows, error } = useWorkTimeByMonth(month)

  return (
    <div className="page-container">
      <h2 className="page-title">근무 조회 (전체)</h2>

      <MonthPickerCard label="조회 월" month={month} onChange={setMonth} />

      {error && <div className="error-msg">{error}</div>}

      <div className="card" style={{ overflowX: 'auto' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>직원</th>
              <th>일자</th>
              <th>시작</th>
              <th>종료</th>
              <th>실근무(분)</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={5}>데이터가 없습니다.</td></tr>
            ) : (
              rows.map((r, i) => (
                <tr key={r.workId ?? i}>
                  <td>{r.employeeName ?? r.employeeCode ?? '-'}</td>
                  <td>{r.workDate}</td>
                  <td>{r.startTime}</td>
                  <td>{r.endTime}</td>
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

export default WorkView
