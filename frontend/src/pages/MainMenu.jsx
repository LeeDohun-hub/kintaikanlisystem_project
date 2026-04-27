import React from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useMessengerUnread } from "../context/MessengerUnreadContext";

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
  const { unreadCount } = useMessengerUnread();
  const isAdmin = user?.role === "ADMIN";

  const messengerBadge =
    unreadCount > 0
      ? {
          type: "unread",
          text: unreadCount > 99 ? "未読 99+" : `未読 ${unreadCount}件`,
        }
      : null;

  return (
    <div className="page-container main-menu-page">
      {isAdmin && (
        <div className="home-admin-hint" role="status">
          <span className="home-admin-hint-icon" aria-hidden="true">
            📣
          </span>
          <span>
            管理者向け：よく使う機能をメニューから開けます。社員マスタ・勤怠取込・休暇承認はこちらからどうぞ。
          </span>
        </div>
      )}
      <h2 className="page-title">メインメニュー</h2>
      <p className="page-subtitle">
        利用する機能を選択してください。
      </p>

      <div className="menu-grid menu-grid--home">
        {isAdmin ? (
          <>
            <MenuCard
              to="/employees"
              title="社員マスタ入力"
              desc="社員の登録・編集を行います。"
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
              title="メッセンジャー"
              desc="社員間で1対1のメッセージをやり取りします。"
              badge={messengerBadge}
            />
            <MenuCard
              to="/vacation"
              title="休暇申請"
              desc="ご自身の休暇を申請し、承認/却下ステータスを確認します。"
            />
            <MenuCard
              to="/vacation-manage"
              title="休暇申請管理"
              desc="社員の休暇申請を承認・却下します。"
              badge={{ type: "admin", text: "管理者" }}
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
              badge={messengerBadge}
            />
            <MenuCard
              to="/vacation"
              title="休暇申請"
              desc="休暇を申請し、承認/却下ステータスを確認します。"
            />
          </>
        )}
      </div>
    </div>
  );
}

