import React from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function MenuCard({ to, title, desc, badge }) {
  return (
    <Link className="menu-card" to={to}>
      <div className="menu-card-top">
        <div className="menu-card-title">{title}</div>
        {badge ? <span className={"menu-badge " + badge.type}>{badge.text}</span> : null}
      </div>
      <div className="menu-card-desc">{desc}</div>
      <div className="menu-card-cta">開く →</div>
    </Link>
  );
}

export default function MainMenu() {
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";

  return (
    <div className="page-container">
      <h2 className="page-title">メインメニュー</h2>
      <p className="page-subtitle">
        利用する機能を選択してください。
      </p>

      <div className="menu-grid">
        {isAdmin ? (
          <MenuCard
            to="/employees"
            title="社員マスタ入力"
            desc="従業員の登録・編集を行います。"
            badge={{ type: "admin", text: "管理者" }}
          />
        ) : null}

        <MenuCard
          to="/work-input"
          title="勤怠入力"
          desc="日別/⽉次の勤怠を入力・保存します。"
        />

        <MenuCard
          to="/upload"
          title="EXCELアップロード"
          desc={isAdmin ? "勤怠Excelの一括取込を行います。" : "勤務表（Excel/CSV）のインポートを行います。"}
          badge={isAdmin ? { type: "admin", text: "管理者" } : null}
        />

        <MenuCard
          to="/report"
          title="PDF出力"
          desc="月指定でPDFを出力します。"
        />
      </div>
    </div>
  );
}

