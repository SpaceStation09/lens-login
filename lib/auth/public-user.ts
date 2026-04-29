import type { UserRecord } from "@/lib/db/types";

export type PublicUser = {
  id: string;
  username: string | null;
  hasPassword: boolean;
  createdAt: string;
  updatedAt: string;
};

export function toPublicUser(user: UserRecord): PublicUser {
  return {
    id: user.id,
    username: user.username,
    hasPassword: Boolean(user.passwordHash),
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}
