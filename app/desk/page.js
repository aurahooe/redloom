"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "../../lib/supabase";

export default function Desk() {
  const [email, setEmail] = useState("");
  const [user, setUser] = useState(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [notes, setNotes] = useState([]);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  async function refreshNotes(uid) {
    const { data } = await supabase
      .from("redloom_notes")
      .select("*")
      .eq("author_id", uid)
      .order("created_at", { ascending: false });
    setNotes(data || []);
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const u = data.session?.user || null;
      setUser(u);
      if (u) refreshNotes(u.id);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      const u = session?.user || null;
      setUser(u);
      if (u) refreshNotes(u.id);
      else setNotes([]);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function sendLink(e) {
    e.preventDefault();
    setErr("");
    setMsg("");
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo:
          typeof window !== "undefined"
            ? window.location.origin + "/desk"
            : undefined,
      },
    });
    if (error) setErr(error.message);
    else setMsg("Check your inbox. The loom sent a sign-in thread.");
  }

  async function save(e) {
    e.preventDefault();
    setErr("");
    setMsg("");
    if (!user) return;
    const { error } = await supabase.from("redloom_notes").insert({
      author_id: user.id,
      title: title.trim(),
      body: body.trim(),
      is_public: isPublic,
    });
    if (error) setErr(error.message);
    else {
      setTitle("");
      setBody("");
      setIsPublic(false);
      setMsg(isPublic ? "Pinned to the public wall." : "Saved in the drawer.");
      refreshNotes(user.id);
    }
  }

  async function togglePublic(n) {
    const { error } = await supabase
      .from("redloom_notes")
      .update({ is_public: !n.is_public, updated_at: new Date().toISOString() })
      .eq("id", n.id);
    if (!error) refreshNotes(user.id);
    else setErr(error.message);
  }

  async function remove(n) {
    const { error } = await supabase.from("redloom_notes").delete().eq("id", n.id);
    if (!error) refreshNotes(user.id);
    else setErr(error.message);
  }

  return (
    <div className="wrap">
      <header className="top">
        <Link href="/" className="mark">
          Red<span>loom</span>
        </Link>
        <nav className="nav">
          <Link href="/">Wall</Link>
          <Link href="/desk">Desk</Link>
          {user ? (
            <a
              href="#out"
              onClick={(e) => {
                e.preventDefault();
                supabase.auth.signOut();
              }}
            >
              Sign out
            </a>
          ) : null}
        </nav>
      </header>

      <section className="hero">
        <div>
          <h1>Your desk.</h1>
          <p className="lede">
            Magic-link login. Notes persist. Flip the public switch when a
            thread is ready for the wall.
          </p>
        </div>
      </section>

      {!user ? (
        <article className="card span-12">
          <div className="meta">Sign in</div>
          <h3 className="serif">A link, not a password.</h3>
          <form onSubmit={sendLink}>
            <input
              type="email"
              required
              placeholder="you@somewhere.test"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <button className="btn" type="submit">
              Send the thread
            </button>
            {msg ? <p className="ok">{msg}</p> : null}
            {err ? <p className="err">{err}</p> : null}
          </form>
        </article>
      ) : (
        <section className="grid">
          <article className="card span-7">
            <div className="meta">{user.email}</div>
            <h3 className="serif">New thread</h3>
            <form onSubmit={save}>
              <input
                required
                maxLength={140}
                placeholder="Title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
              <textarea
                required
                maxLength={8000}
                placeholder="What belongs on the loom?"
                value={body}
                onChange={(e) => setBody(e.target.value)}
              />
              <label className="chk">
                <input
                  type="checkbox"
                  checked={isPublic}
                  onChange={(e) => setIsPublic(e.target.checked)}
                />
                Mark public — show on the wall
              </label>
              <button className="btn" type="submit">
                Save
              </button>
              {msg ? <p className="ok">{msg}</p> : null}
              {err ? <p className="err">{err}</p> : null}
            </form>
          </article>
          <article className="card span-5">
            <div className="meta">Drawer</div>
            <h3 className="serif">{notes.length} saved</h3>
            <p>Private until you say otherwise. Public ones already hang on the wall.</p>
          </article>
          <div className="span-12 list">
            {notes.map((n) => (
              <article className="card" key={n.id}>
                <div className="meta">
                  {n.is_public ? "Public" : "Private"} ·{" "}
                  {new Date(n.created_at).toLocaleString()}
                </div>
                <h3 className="serif">{n.title}</h3>
                <p>{n.body}</p>
                <button className="btn ghost" type="button" onClick={() => togglePublic(n)}>
                  {n.is_public ? "Pull off the wall" : "Pin public"}
                </button>{" "}
                <button className="btn ghost" type="button" onClick={() => remove(n)}>
                  Delete
                </button>
              </article>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
