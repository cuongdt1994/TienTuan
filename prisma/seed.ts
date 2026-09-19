import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import slugify from "slugify";

const prisma = new PrismaClient();

const demoImages = [
  "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=2400&q=88",
  "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=2400&q=88",
  "https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=2400&q=88",
  "https://images.unsplash.com/photo-1496747611176-843222e1e57c?w=2400&q=88",
];

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
    ["Commercial & KV", "Beauty", "Portrait"].map((name, index) =>
      prisma.category.upsert({
        where: { slug: slugify(name, { lower: true }) },
        update: { name, sortOrder: index },
        create: { name, slug: slugify(name, { lower: true }), sortOrder: index },
      }),
    ),
  );

  const projects = [
    { title: "Nocturne / Maison 2026", categoryId: categories[0].id, image: demoImages[0] },
    { title: "After Light", categoryId: categories[1].id, image: demoImages[1] },
    { title: "Soft Structures", categoryId: categories[2].id, image: demoImages[2] },
  ];

  for (const [index, item] of projects.entries()) {
    const slug = slugify(item.title, { lower: true, strict: true });
    const project = await prisma.project.upsert({
      where: { slug },
      update: { title: item.title, categoryId: item.categoryId, status: "PUBLISHED", sortOrder: index },
      create: {
        title: item.title,
        slug,
        categoryId: item.categoryId,
        status: "PUBLISHED",
        sortOrder: index,
        publishedAt: new Date(),
        description: "A study in form, atmosphere, and quiet gestures.",
      },
    });

    const existing = await prisma.image.count({ where: { projectId: project.id } });
    if (!existing) {
      const image = await prisma.image.create({
        data: {
          projectId: project.id,
          originalUrl: item.image,
          largeUrl: item.image,
          mediumUrl: item.image,
          thumbnailUrl: item.image,
          width: 1600,
          height: 2200,
          sortOrder: 0,
          alt: `${item.title} - Photo 01`,
        },
      });
      await prisma.project.update({ where: { id: project.id }, data: { coverImageId: image.id } });
    }
  }

  await prisma.siteSettings.upsert({
    where: { id: "site" },
    update: {},
    create: {
      id: "site",
      photographerName: process.env.PHOTOGRAPHER_NAME ?? "Tiến Tuấn Photography",
      websiteTitle: "Tiến Tuấn Photography — Editorial Image Maker",
      websiteDescription: "Editorial photography for culture, fashion, and people.",
      phone: "034 237 1168",
      email: "tientuan1408@gmail.com",
      facebook: "https://fb.com/dotientuan09.05",
      instagram: "https://www.instagram.com/dotientuann_",
    },
  });
}

main().finally(() => prisma.$disconnect());
