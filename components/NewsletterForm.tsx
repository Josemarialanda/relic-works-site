"use client";

import { useState } from "react";
import { cx } from "@/lib/cx";
import styles from "./NewsletterForm.module.css";
import button from "./ui/button.module.css";

// TODO: connect this form to a mailing-list service. Until then it sends nothing.
export function NewsletterForm() {
  const [msg, setMsg] = useState("");

  return (
    <form
      className={styles.form}
      onSubmit={(e) => {
        e.preventDefault();
        setMsg("Sign-up is not available yet.");
      }}
    >
      <label className="meta-b" htmlFor="newsletter-email">
        Get the news first
      </label>
      <div className={styles.row}>
        <input className={styles.input} id="newsletter-email" type="email" placeholder="Email address" required />
        <button className={cx(button.button, button.compact)} type="submit">
          Join the list
        </button>
      </div>
      <span className="meta" role="status">
        {msg}
      </span>
    </form>
  );
}
