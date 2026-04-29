import type { LensDiscoveredAccount } from "./types";

export function normalizeAddress(value: string) {
  return value.toLowerCase();
}

export function normalizeText(value: unknown) {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

export function toDiscoveredAccount(item: any): LensDiscoveredAccount {
  const account = item.account ?? item;
  const metadata = account.metadata;

  return {
    accountAddress: normalizeAddress(account.address),
    username: account.username
      ? {
          fullHandle: normalizeText(account.username.value),
          localName: normalizeText(account.username.localName),
          namespace: normalizeText(account.username.namespace),
        }
      : null,
    metadata: metadata
      ? {
          id: String(metadata.id),
          name: normalizeText(metadata.name),
          bio: normalizeText(metadata.bio),
          picture: normalizeText(metadata.picture),
          coverPicture: normalizeText(metadata.coverPicture),
          attributes: Array.isArray(metadata.attributes)
            ? metadata.attributes.map((attribute: any) => ({
                key: String(attribute?.key ?? ""),
                type: String(attribute?.type ?? ""),
                value: String(attribute?.value ?? ""),
              }))
            : [],
        }
      : null,
  };
}

export abstract class LensLoginError extends Error {
  code: string;
  status: number;

  constructor(code: string, message: string, status: number) {
    super(message);
    this.code = code;
    this.status = status;
  }
}
