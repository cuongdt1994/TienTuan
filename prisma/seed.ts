import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import slugify from "slugify";

const prisma = new PrismaClient();

async function main() {
  const email = process.env.ADMIN_EMAIL ?? "admin@example.com";
  const password = process.env.ADMIN_PASSWORD ?? "change-me-before-production";
  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.user.upsert({
    where: { email },
    update: { passwordHash },
    create: { email, passwordHash, role: "ADMIN" },
  });

  const categories = await Promise.all(
    ["Commercial", "Beauty", "Portrait"].map((name, index) =>
      prisma.category.upsert({
        where: { slug: slugify(name, { lower: true }) },
        update: { name, sortOrder: index },
        create: { name, slug: slugify(name, { lower: true }), sortOrder: index },
      }),
    ),
  );

  await prisma.siteSettings.upsert({
    where: { id: "site" },
    update: {},
    create: {
      id: "site",
      photographerName: process.env.PHOTOGRAPHER_NAME ?? "Tien Tuan Photography",
      websiteTitle: "Tien Tuan Photography — Editorial Image Maker",
      websiteDescription: "Editorial photography for culture, fashion, and people.",
      phone: "034 237 1168",
      email: "tientuan1408@gmail.com",
      facebook: "https://fb.com/dotientuan09.05",
      instagram: "https://www.instagram.com/dotientuann_",
      introEnabled: true,
    },
  });
}

main().finally(() => prisma.$disconnect());
