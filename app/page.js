"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase, hourKey } from "../lib/supabase";

function fmtHour(iso) {
  try {
    return new Date(iso).toLocaleString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
    });
  } catch {
    return iso;
  }
}

export default function Home() {
  const [edition, setEdition] = useState(null);
  const [notes, setNotes] = useState([]);
  const [now, setNow] = useState(hourKey());

  useEffect(() => {
    let alive = true;
    async function load() {
      const key = hourKey();
      setNow(key);
      const [{ data: hour }, { data: publicNotes }] = await Promise.all([
        supabase
          .from("redloom_hours")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from("redloom_notes")
          .select("id,title,body,created_at")
          .eq("is_public", true)
          .order("created_at", { ascending: false })
          .limit(18),
      ]);
      if (!alive) return;
      setEdition(hour);
      setNotes(publicNotes || []);
    }
    load();
    const t = setInterval(load, 60_000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);

  return (
    <div className="wrap">
      <header className="top">
        <Link href="/" className="mark">
          Red<span>loom</span>
        </Link>
        <nav className="nav">
          <Link href="/">Wall</Link>
          <Link href="/desk">Desk</Link>
        </nav>
      </header>

      <section className="hero">
        <div>
          <h1>Threads on the public wall. The rest stay in the drawer.</h1>
          <p className="lede">
            Write something. Keep it private, or pin it public. Every hour the
            loom turns — a new dispatch, and whatever people chose to show.
          </p>
          <Link className="btn" href="/desk">
            Sit at the desk
          </Link>
        </div>
        <aside className="clock">
          <div className="k">This hour</div>
          <div className="t">{fmtHour(now)}</div>
          <p>
            {edition
              ? edition.title
              : "The first dispatch of the hour is still being set."}
          </p>
        </aside>
      </section>

      <section className="grid">
        <article className="card span-7" style={{ animationDelay: "0.05s" }}>
          <div className="meta">Hourly dispatch</div>
          <h3 className="serif">
            {edition?.title || "Waiting on the turn"}
          </h3>
          {edition?.kicker ? <p className="meta">{edition.kicker}</p> : null}
          <p>
            {edition?.body ||
              "When the hour flips, a short note lands here. Public threads from the desk sit beside it."}
          </p>
        </article>
        <article className="card span-5" style={{ animationDelay: "0.12s" }}>
          <div className="meta">How it works</div>
          <h3 className="serif">Sign in. Write. Choose the wall.</h3>
          <p>
            Accounts are real — email magic links through Supabase. Private
            notes never leave your desk. Anything marked public is what
            strangers see.
          </p>
        </article>

        {notes.map((n, i) => (
          <article
            className={`card ${i % 3 === 0 ? "span-5" : i % 3 === 1 ? "span-7" : "span-4"}`}
            key={n.id}
            style={{ animationDelay: `${0.08 + i * 0.04}s` }}
          >
            <div className="meta">{fmtHour(n.created_at)}</div>
            <h3 className="serif">{n.title}</h3>
            <p>{n.body}</p>
          </article>
        ))}
      </section>
    </div>
  );
}
