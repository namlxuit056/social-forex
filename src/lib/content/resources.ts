export type ResourceItem = {
  title: string;
  kind: "pdf" | "link";
  href: string;
  note?: string;
};

export const ebookResources: ResourceItem[] = [
  {
    title: "Tâm lý giao dịch (placeholder)",
    kind: "pdf",
    href: "#",
    note: "Thay bằng URL file trên S3 / Cloudflare R2 sau khi upload.",
  },
  {
    title: "Quản lý vốn cơ bản (placeholder)",
    kind: "pdf",
    href: "#",
  },
];
