import "dotenv/config";
import bcrypt from "bcryptjs";
import { prisma } from "../src/lib/prisma";

async function main() {
  const categories = [
    {
      slug: "price-action",
      name: "Price Action",
      description: "Nến, cấu trúc, vùng cung cầu.",
    },
    {
      slug: "smc",
      name: "SMC / ICT",
      description: "Order flow, BOS, liquidity.",
    },
    {
      slug: "news",
      name: "Theo tin tức",
      description: "CPI, NFP, lãi suất — kỳ vọng vs thực tế.",
    },
    {
      slug: "brokers",
      name: "Review sàn",
      description: "Spread, swap, uy tín quy định (ý kiến cá nhân).",
    },
  ];

  for (const c of categories) {
    await prisma.forumCategory.upsert({
      where: { slug: c.slug },
      create: c,
      update: { name: c.name, description: c.description },
    });
  }

  const passwordHash = await bcrypt.hash("demo1234", 12);
  const vipUntil = new Date();
  vipUntil.setFullYear(vipUntil.getFullYear() + 1);

  const demo = await prisma.user.upsert({
    where: { email: "demo@social-forex.local" },
    create: {
      email: "demo@social-forex.local",
      name: "Demo Trader",
      passwordHash,
      vipUntil,
    },
    update: { passwordHash, vipUntil },
  });

  const sigCount = await prisma.signal.count();
  if (sigCount === 0) {
    await prisma.signal.createMany({
      data: [
        {
          authorId: demo.id,
          symbol: "XAUUSD",
          direction: "LONG",
          entry: 2650,
          stopLoss: 2620,
          takeProfit: 2700,
          tier: "FREE",
          status: "ACTIVE",
          notes: "Ví dụ tín hiệu demo — không phải khuyến nghị đầu tư.",
        },
        {
          authorId: demo.id,
          symbol: "EURUSD",
          direction: "SHORT",
          entry: 1.085,
          stopLoss: 1.092,
          takeProfit: 1.07,
          tier: "VIP",
          status: "ACTIVE",
          notes: "Tín hiệu VIP mẫu (cần gói VIP để xem đầy đủ).",
        },
      ],
    });
  }
}

main()
  .then(() => {
    console.log("Seed OK");
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
