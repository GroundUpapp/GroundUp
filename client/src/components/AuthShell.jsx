import Brand from './Brand';

// Centered, mobile-first frame shared by Login and SignUp.
export default function AuthShell({ title, subtitle, children, footer }) {
  return (
    <div className="flex min-h-screen flex-col px-5 py-10">
      <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center">
        <div className="mb-8 flex flex-col items-center text-center">
          <Brand />
          <h1 className="mt-8 text-2xl font-bold text-cream-50">{title}</h1>
          {subtitle && <p className="mt-1.5 text-sm text-cream-300">{subtitle}</p>}
        </div>

        <div className="card">{children}</div>

        {footer && (
          <p className="mt-6 text-center text-sm text-cream-300">{footer}</p>
        )}
      </div>
    </div>
  );
}
