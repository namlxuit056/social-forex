"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { Crown } from "lucide-react";
import { changeUserRole } from "@/actions/admin-users";

const ROLES = ["USER", "MOD", "ADMIN"] as const;

interface UserRowProps {
  user: {
    id: string;
    email: string;
    name: string | null;
    role: string;
    vipActive: boolean;
    vipUntil: string | null;
    createdAt: string;
  };
  currentUserId: string;
  locale: string;
}

export function UserRow({ user, currentUserId, locale }: UserRowProps) {
  const t = useTranslations("admin");
  const [state, formAction, isPending] = useActionState(changeUserRole, null);
  const isSelf = user.id === currentUserId;

  const roleBadge = (role: string) => {
    if (role === "ADMIN") return "bg-red-500/15 text-red-600 dark:text-red-400";
    if (role === "MOD") return "bg-blue-500/15 text-blue-600 dark:text-blue-400";
    return "bg-muted text-muted-foreground";
  };

  return (
    <tr className="transition-colors hover:bg-muted/30">
      <td className="px-4 py-2.5">
        <div>
          <p className="font-mono text-xs">{user.email}</p>
          {user.name && (
            <p className="text-xs text-muted-foreground">{user.name}</p>
          )}
        </div>
      </td>
      <td className="px-4 py-2.5">
        <span
          className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-medium ${roleBadge(user.role)}`}
        >
          {user.role}
        </span>
      </td>
      <td className="px-4 py-2.5 text-xs">
        {user.vipActive ? (
          <span className="inline-flex items-center gap-1 text-yellow-600 dark:text-yellow-400">
            <Crown className="size-3" />
            {new Date(user.vipUntil!).toLocaleDateString(locale)}
          </span>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </td>
      <td className="px-4 py-2.5 text-xs text-muted-foreground">
        {new Date(user.createdAt).toLocaleDateString(locale)}
      </td>
      <td className="px-4 py-2.5">
        {isSelf ? (
          <span className="text-xs text-muted-foreground">—</span>
        ) : (
          <form action={formAction} className="flex items-center gap-1.5">
            <input type="hidden" name="userId" value={user.id} />
            <select
              name="role"
              defaultValue={user.role}
              disabled={isPending}
              className="h-7 rounded border border-input bg-transparent px-1.5 text-xs outline-none focus:ring-1 focus:ring-ring"
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
            <button
              type="submit"
              disabled={isPending}
              className="h-7 rounded bg-primary px-2 text-[11px] font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {isPending ? "…" : t("changeRole")}
            </button>
            {state?.ok && (
              <span className="text-[11px] text-emerald-600">✓</span>
            )}
            {state?.error && (
              <span className="text-[11px] text-destructive">{state.error}</span>
            )}
          </form>
        )}
      </td>
    </tr>
  );
}
