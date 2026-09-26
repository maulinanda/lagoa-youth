"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const supabase = createClient();

export default function Navbar() {
  const pathname = usePathname();

  const [loggedIn, setLoggedIn] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    async function checkAuth() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      setLoggedIn(!!user);
      setCheckingAuth(false);
    }

    checkAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setLoggedIn(!!session?.user);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const isAppPage =
    pathname === "/discover" ||
    pathname === "/create" ||
    pathname === "/my-activities" ||
    pathname === "/profile" ||
    pathname.startsWith("/activity/");

  if (!isAppPage || checkingAuth) {
    return null;
  }

  const links = [
    {
      href: "/discover",
      label: "Discover",
      icon: "🔎",
    },
    {
      href: loggedIn ? "/create" : "/login",
      label: "Buat",
      icon: "＋",
    },
    {
      href: loggedIn ? "/my-activities" : "/login",
      label: "Aktivitas Saya",
      icon: "📅",
    },
    {
      href: loggedIn ? "/profile" : "/login",
      label: "Profile",
      icon: "👤",
    },
  ];

  return (
    <nav
      aria-label="Navigasi utama"
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-gray-200 bg-white/95 backdrop-blur sm:static sm:border-b sm:border-t-0"
    >
      <div className="mx-auto flex max-w-5xl items-center px-2 sm:px-6">
        {/* Logo desktop */}
        <Link
          href="/"
          className="hidden shrink-0 py-4 text-lg font-bold text-teal-700 sm:block"
        >
          Lagoa Youth
        </Link>

        {/* Navigation */}
        <div className="flex w-full items-stretch justify-around sm:w-auto sm:ml-8 sm:gap-2">
          {links.map((link) => {
            const active =
              pathname === link.href ||
              (link.label === "Discover" &&
                pathname.startsWith("/activity/"));

            return (
              <Link
                key={link.label}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={`flex min-w-[72px] flex-col items-center justify-center gap-1 px-2 py-3 text-xs font-medium transition sm:min-w-0 sm:flex-row sm:gap-2 sm:px-4 sm:py-4 sm:text-sm ${
                  active
                    ? "text-teal-700"
                    : "text-gray-500 hover:text-gray-900"
                }`}
              >
                <span
                  className={`flex h-8 w-8 items-center justify-center rounded-xl text-lg sm:h-auto sm:w-auto sm:rounded-none ${
                    active ? "bg-teal-50 sm:bg-transparent" : ""
                  }`}
                >
                  {link.icon}
                </span>

                <span className="whitespace-nowrap">
                  {link.label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}