import React from "react";
import { Link } from "react-router-dom";

export default function BackToMenuLink({ className = "" }) {
  return (
    <div className={"back-to-menu " + className}>
      <Link className="back-to-menu-link" to="/menu">
        メニューへ戻る
      </Link>
    </div>
  );
}

