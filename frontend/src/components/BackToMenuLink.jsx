import React from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

/** 管理者のみメニューへ戻る。一般社員はメイン画面が勤怠入力のためリンクを出さない。 */
export default function BackToMenuLink({ className = "" }) {
  const { user } = useAuth();
  if (user?.role !== "ADMIN") {
    return null;
  }
  return (
    <div className={"back-to-menu " + className}>
      <Link className="back-to-menu-link" to="/menu">
        メニューへ戻る
      </Link>
    </div>
  );
}

