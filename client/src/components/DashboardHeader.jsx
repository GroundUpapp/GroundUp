import { useAuth } from '../context/AuthContext';
import Brand from './Brand';

export default function DashboardHeader() {
  const { user, signOut } = useAuth();

  return (
    <header className="sticky top-0 z-10 w-full select-none border-b border-amber-900/20 bg-ground-950/80 backdrop-blur">
      <div className="mx-auto flex max-w-[1440px] items-center justify-between px-5 py-3">
        <Brand size="sm" />
        <div className="flex items-center gap-3">
          <span className="hidden text-sm text-cream-300 sm:inline">
            {user?.email}
          </span>
          <button
            onClick={() => signOut()}
            className="rounded-lg border border-amber-900/40 px-3 py-1.5 text-sm font-medium text-cream-200 transition hover:border-amber-500 hover:text-amber-300"
          >
            Sign out
          </button>
        </div>
      </div>
    </header>
  );
}
