export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="min-h-[72vh] py-4 sm:py-8">{children}</div>;
}
