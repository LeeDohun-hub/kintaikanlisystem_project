-- =============================================================================
-- Attendance derived metrics (reference SQL)
--
-- Assumes a row-level table:
--   attendance_record (
--     id, employee_id,
--     clock_in   TIMESTAMP,  -- inclusive start
--     clock_out  TIMESTAMP,  -- exclusive end recommended in app; here we use
--                             -- duration = clock_out - clock_in in minutes
--     break_minutes INT,
--     is_holiday BOOLEAN
--   )
--
-- Constants:
--   480  = regular day minutes (8h)
--   2700 = monthly overtime threshold minutes (45h) — applied to MONTHLY sum
--   standard_monthly_minutes = parameter (e.g. 9600 for 160h/month)
--
-- Night window (local time): 22:00–24:00 and 00:00–05:00 on each calendar day
-- touched by [clock_in, clock_out). Half-open intervals avoid double counting
-- at 05:00 / 22:00 boundaries.
--
-- Fatigue score (implemented as WEIGHTED SUM; recommended for production):
--   Spec text used consecutive '*' which reads as multiplication; that would
--   zero out whenever holiday_work_minutes = 0. We use:
--     fatigue_points = overtime_minutes * 1.0
--                    + holiday_work_minutes * 1.5
--                    + night_work_minutes * 1.8
--                    + GREATEST(0, monthly_overtime_sum - 2700) * 0.5
--   The last term is evaluated at MONTH scope in the "monthly" CTE below.
--   Per-row fatigue_index uses row-level points without the 2700 term.
--
-- fatigue_index = (fatigue_points / NULLIF(standard_monthly_minutes, 0)) * 100
-- =============================================================================

-- -----------------------------------------------------------------------------
-- PostgreSQL 14+: per-row metrics + night overlap (no double counting)
-- Replace 9600 with your :standard_monthly_minutes bind if your client supports it.
-- -----------------------------------------------------------------------------

WITH params AS (
  SELECT 9600::numeric AS standard_monthly_minutes
),
base AS (
  SELECT
    ar.*,
    -- 1) work_minutes: elapsed minutes minus break
    GREATEST(0,
      FLOOR(EXTRACT(EPOCH FROM (ar.clock_out - ar.clock_in)) / 60)::int
      - COALESCE(ar.break_minutes, 0)
    ) AS work_minutes
  FROM attendance_record ar
  WHERE ar.clock_in IS NOT NULL
    AND ar.clock_out IS NOT NULL
    AND ar.clock_out > ar.clock_in
),
-- One row per attendance row per calendar day touched (for night overlap)
day_grid AS (
  SELECT
    b.id,
    gs::date AS d
  FROM base b
  CROSS JOIN LATERAL generate_series(
    (date_trunc('day', b.clock_in))::date,
    (date_trunc('day', b.clock_out))::date,
    interval '1 day'
  ) AS gs
),
day_segments AS (
  SELECT
    dg.id,
    GREATEST(b.clock_in, dg.d::timestamp) AS seg_lo,
    LEAST(b.clock_out, (dg.d + 1)::timestamp) AS seg_hi,
    dg.d
  FROM day_grid dg
  JOIN base b ON b.id = dg.id
),
night_calc AS (
  SELECT
    ds.id,
    -- 4) night_work_minutes: [00:00–05:00) ∪ [22:00–24:00) per calendar day, clipped to shift
    SUM(
      GREATEST(0, EXTRACT(EPOCH FROM (
        LEAST(ds.seg_hi, ds.d::timestamp + interval '5 hours')
        - GREATEST(ds.seg_lo, ds.d::timestamp)
      )) / 60)
      + GREATEST(0, EXTRACT(EPOCH FROM (
        LEAST(ds.seg_hi, (ds.d + 1)::timestamp)
        - GREATEST(ds.seg_lo, ds.d::timestamp + interval '22 hours')
      )) / 60)
    )::int AS night_work_minutes
  FROM day_segments ds
  WHERE ds.seg_lo < ds.seg_hi
  GROUP BY ds.id
),
daily AS (
  SELECT
    b.*,
    COALESCE(nc.night_work_minutes, 0) AS night_work_minutes,
    -- 2) overtime_minutes
    GREATEST(0, b.work_minutes - 480) AS overtime_minutes,
    -- 3) holiday_work_minutes
    CASE WHEN b.is_holiday THEN b.work_minutes ELSE 0 END AS holiday_work_minutes,
    -- Row-level weighted fatigue points (no monthly OT threshold)
    (GREATEST(0, b.work_minutes - 480) * 1.0
      + (CASE WHEN b.is_holiday THEN b.work_minutes ELSE 0 END) * 1.5
      + COALESCE(nc.night_work_minutes, 0) * 1.8
    ) AS fatigue_points_daily
  FROM base b
  LEFT JOIN night_calc nc ON nc.id = b.id
),
monthly AS (
  SELECT
    employee_id,
    date_trunc('month', clock_in)::date AS ym,
    SUM(overtime_minutes) AS sum_overtime,
    SUM(holiday_work_minutes) AS sum_holiday,
    SUM(night_work_minutes) AS sum_night
  FROM daily
  GROUP BY employee_id, date_trunc('month', clock_in)::date
),
joined AS (
  SELECT
    d.*,
    m.sum_overtime,
    m.sum_holiday,
    m.sum_night,
    (m.sum_overtime * 1.0
      + m.sum_holiday * 1.5
      + m.sum_night * 1.8
      + GREATEST(0, m.sum_overtime - 2700) * 0.5
    ) AS fatigue_points_monthly
  FROM daily d
  JOIN monthly m
    ON m.employee_id = d.employee_id
   AND m.ym = date_trunc('month', d.clock_in)::date
)
SELECT
  j.id,
  j.employee_id,
  j.clock_in,
  j.clock_out,
  j.break_minutes,
  j.is_holiday,
  -- 1) work_minutes
  j.work_minutes,
  -- 2) overtime_minutes
  j.overtime_minutes,
  -- 3) holiday_work_minutes
  j.holiday_work_minutes,
  -- 4) night_work_minutes
  j.night_work_minutes,
  -- Row fatigue index (no 45h threshold)
  ROUND(
    (j.fatigue_points_daily / NULLIF((SELECT standard_monthly_minutes FROM params), 0)) * 100,
    4
  ) AS fatigue_index_daily,
  -- Monthly aggregates (same on every row of that employee-month)
  j.sum_overtime AS monthly_overtime_minutes,
  j.sum_holiday AS monthly_holiday_work_minutes,
  j.sum_night AS monthly_night_work_minutes,
  ROUND(
    (j.fatigue_points_monthly / NULLIF((SELECT standard_monthly_minutes FROM params), 0)) * 100,
    4
  ) AS fatigue_index_monthly
FROM joined j
ORDER BY j.employee_id, j.clock_in;

-- -----------------------------------------------------------------------------
-- Optional: PostgreSQL VIEW (lift params to a small config table in real use)
-- -----------------------------------------------------------------------------
-- CREATE TABLE IF NOT EXISTS fatigue_config (
--   id INT PRIMARY KEY DEFAULT 1,
--   standard_monthly_minutes INT NOT NULL DEFAULT 9600,
--   CONSTRAINT fatigue_config_singleton CHECK (id = 1)
-- );
-- INSERT INTO fatigue_config(id) VALUES (1) ON CONFLICT DO NOTHING;
--
-- CREATE OR REPLACE VIEW v_attendance_derived_metrics AS
-- SELECT ... same as above but (SELECT standard_monthly_minutes FROM fatigue_config WHERE id = 1) ...

-- -----------------------------------------------------------------------------
-- MySQL 8.0: work / OT / holiday in SQL; night minutes via app or stored function
-- (Recursive day-walk per row is verbose; Java implementation ships in this repo.)
-- -----------------------------------------------------------------------------
/*
SELECT
  id,
  employee_id,
  clock_in,
  clock_out,
  break_minutes,
  is_holiday,
  GREATEST(0,
    TIMESTAMPDIFF(MINUTE, clock_in, clock_out) - COALESCE(break_minutes, 0)
  ) AS work_minutes,
  GREATEST(0,
    TIMESTAMPDIFF(MINUTE, clock_in, clock_out) - COALESCE(break_minutes, 0) - 480
  ) AS overtime_minutes,
  CASE WHEN is_holiday THEN
    GREATEST(0, TIMESTAMPDIFF(MINUTE, clock_in, clock_out) - COALESCE(break_minutes, 0))
  ELSE 0 END AS holiday_work_minutes
FROM attendance_record
WHERE clock_in IS NOT NULL AND clock_out IS NOT NULL AND clock_out > clock_in;
*/
