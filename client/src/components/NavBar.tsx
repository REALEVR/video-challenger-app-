import { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `px-3 py-2 rounded-full text-sm font-medium transition ${
    isActive ? "bg-white text-zinc-900" : "text-zinc-300 hover:text-white hover:bg-zinc-800"
  }`;

const mobileLinkClass = ({ isActive }: { isActive: boolean }) =>
  `block rounded-lg px-3 py-2 text-sm font-medium transition ${
    isActive ? "bg-white text-zinc-900" : "text-zinc-300 hover:bg-zinc-800 hover:text-white"
  }`;

export function NavBar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 border-b border-zinc-800 bg-zinc-950/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <Link to="/" className="flex items-center gap-2 text-lg font-bold text-white">
          <span className="grid h-8 w-8 place-items-center rounded-xl bg-gradient-to-br from-fuchsia-500 to-violet-600 text-white">
            🎬
          </span>
          Clashreel
        </Link>

        <nav className="hidden items-center gap-1 sm:flex">
          <NavLink to="/" end className={linkClass}>
            Feed
          </NavLink>
          <NavLink to="/challenges" className={linkClass}>
            Challenges
          </NavLink>
          {user && (
            <NavLink to="/create-challenge" className={linkClass}>
              Start a Challenge
            </NavLink>
          )}
        </nav>

        <div className="flex items-center gap-2">
          <div className="hidden items-center gap-2 sm:flex">
            {user ? (
              <>
                <Link
                  to={`/profile/${user.id}`}
                  className="rounded-full bg-zinc-800 px-3 py-2 text-sm font-medium text-zinc-100 hover:bg-zinc-700"
                >
                  {user.displayName}
                </Link>
                <button
                  onClick={async () => {
                    await logout();
                    navigate("/");
                  }}
                  className="rounded-full px-3 py-2 text-sm text-zinc-400 hover:text-white"
                >
                  Log out
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="rounded-full px-3 py-2 text-sm font-medium text-zinc-300 hover:text-white">
                  Log in
                </Link>
                <Link
                  to="/register"
                  className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-zinc-900 hover:bg-zinc-200"
                >
                  Sign up
                </Link>
              </>
            )}
          </div>

          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="grid h-9 w-9 place-items-center rounded-lg text-zinc-300 hover:bg-zinc-800 sm:hidden"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
          >
            <span className="text-xl">{menuOpen ? "✕" : "☰"}</span>
          </button>
        </div>
      </div>

      {menuOpen && (
        <nav className="border-t border-zinc-800 px-4 py-3 sm:hidden">
          <div className="flex flex-col gap-1">
            <NavLink to="/" end className={mobileLinkClass} onClick={() => setMenuOpen(false)}>
              Feed
            </NavLink>
            <NavLink to="/challenges" className={mobileLinkClass} onClick={() => setMenuOpen(false)}>
              Challenges
            </NavLink>
            {user && (
              <NavLink to="/create-challenge" className={mobileLinkClass} onClick={() => setMenuOpen(false)}>
                Start a Challenge
              </NavLink>
            )}
          </div>

          <div className="mt-3 flex flex-col gap-1 border-t border-zinc-800 pt-3">
            {user ? (
              <>
                <Link
                  to={`/profile/${user.id}`}
                  onClick={() => setMenuOpen(false)}
                  className="rounded-lg px-3 py-2 text-sm font-medium text-zinc-100 hover:bg-zinc-800"
                >
                  {user.displayName}
                </Link>
                <button
                  onClick={async () => {
                    setMenuOpen(false);
                    await logout();
                    navigate("/");
                  }}
                  className="rounded-lg px-3 py-2 text-left text-sm text-zinc-400 hover:bg-zinc-800 hover:text-white"
                >
                  Log out
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  onClick={() => setMenuOpen(false)}
                  className="rounded-lg px-3 py-2 text-sm font-medium text-zinc-300 hover:bg-zinc-800 hover:text-white"
                >
                  Log in
                </Link>
                <Link
                  to="/register"
                  onClick={() => setMenuOpen(false)}
                  className="rounded-lg bg-white px-3 py-2 text-center text-sm font-semibold text-zinc-900 hover:bg-zinc-200"
                >
                  Sign up
                </Link>
              </>
            )}
          </div>
        </nav>
      )}
    </header>
  );
}
