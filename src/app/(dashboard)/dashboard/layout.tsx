import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import { getCurrentTenant } from "@/lib/tenant";
import { SignOutButton } from "@/components/dashboard/SignOutButton";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const tenant = await getCurrentTenant();
  if (!tenant) redirect("/register");

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <span className="font-bold text-orange-500 text-lg">Shogun PDV</span>
            <span className="text-gray-400 text-sm hidden sm:block">|</span>
            <span className="text-gray-700 font-medium text-sm hidden sm:block">
              {tenant.name}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <a
              href={`/${tenant.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-gray-500 hover:text-orange-500 px-3 py-1.5 rounded-lg hover:bg-orange-50 transition-colors"
            >
              Ver cardápio
            </a>
            <SignOutButton />
          </div>
        </div>
      </header>

      <div className="flex flex-1">
        {/* Sidebar */}
        <nav className="w-52 bg-white border-r border-gray-200 p-4 space-y-1 hidden md:block shrink-0">
          <NavLink href="/dashboard">Pedidos</NavLink>
          <NavLink href="/dashboard/balcao">Balcão</NavLink>
          <NavLink href="/dashboard/cardapio">Cardápio</NavLink>
          <NavLink href="/dashboard/estoque">Estoque</NavLink>
          <NavLink href="/dashboard/configuracoes">Configurações</NavLink>
        </nav>

        {/* Mobile nav */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-10">
          <div className="flex">
            {[
              { href: "/dashboard", label: "Pedidos" },
              { href: "/dashboard/balcao", label: "Balcão" },
              { href: "/dashboard/cardapio", label: "Cardápio" },
              { href: "/dashboard/estoque", label: "Estoque" },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex-1 py-3 text-center text-xs text-gray-600 hover:text-orange-500 font-medium"
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>

        {/* Content */}
        <main className="flex-1 p-4 md:p-6 pb-20 md:pb-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

function NavLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="block px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-orange-50 hover:text-orange-600 font-medium transition-colors"
    >
      {children}
    </Link>
  );
}
