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
          <>
            <MenuCard
              to="/employees"
              title="社員マスタ入力"
              desc="従業員の登録・編集を行います。"
              badge={{ type: "admin", text: "管理者" }}
            />
            <MenuCard
              to="/login-check"
              title="ログイン確認"
              desc="ログイン試行の記録を確認します。"
              badge={{ type: "admin", text: "管理者" }}
            />
            <MenuCard
              to="/upload"
              title="EXCELアップロード"
              desc="勤怠Excel・勤務表の一括取込を行います。"
              badge={{ type: "admin", text: "管理者" }}
            />
            <MenuCard
              to="/report"
              title="勤怠履歴"
              desc="勤務履歴の確認と月次PDFのプレビュー。"
              badge={{ type: "admin", text: "管理者" }}
            />
            <MenuCard
              to="/board"
              title="掲示板"
              desc="社内の連絡・お知らせを投稿・閲覧します。"
            />
            <MenuCard
              to="/messenger"
              title="社内メッセージ"
              desc="社員間で1対1のメッセージをやり取りします。"
            />
            <MenuCard
              to="/vacation-manage"
              title="休暇申請管理"
              desc="社員の休暇申請を承認・却下します。"
              badge={{ type: "admin", text: "管理者" }}
            />
            <MenuCard
              to="/vacation"
              title="休暇申請"
              desc="連次・半休を申請します。"
            />
          </>
        ) : (
          <>
            <MenuCard
              to="/work-input"
              title="勤怠入力"
              desc="日別/月次の勤怠を入力・保存します。"
            />
            <MenuCard
              to="/board"
              title="掲示板"
              desc="社内の連絡・お知らせを投稿・閲覧します。"
            />
            <MenuCard
              to="/messenger"
              title="社内メッセージ"
              desc="社員間で1対1のメッセージをやり取りします。"
            />
            <MenuCard
              to="/vacation"
              title="休暇申請"
              desc="連次・半休を申請します。"
            />
          </>
        )}
      </div>
    </div>
  );
}

