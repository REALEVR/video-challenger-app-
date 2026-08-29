import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("password123", 10);

  const creator1 = await prisma.user.upsert({
    where: { email: "maya@example.com" },
    update: {},
    create: {
      email: "maya@example.com",
      displayName: "Maya Dance",
      passwordHash,
      role: "CREATOR",
      bio: "Dancer from Kampala 🇺🇬",
    },
  });

  const creator2 = await prisma.user.upsert({
    where: { email: "kofi@example.com" },
    update: {},
    create: {
      email: "kofi@example.com",
      displayName: "Kofi Comedy",
      passwordHash,
      role: "CREATOR",
      bio: "Sketch comedy, Accra 🇬🇭",
    },
  });

  const viewer = await prisma.user.upsert({
    where: { email: "viewer@example.com" },
    update: {},
    create: {
      email: "viewer@example.com",
      displayName: "Global Viewer",
      passwordHash,
      role: "VIEWER",
    },
  });

  const challenge = await prisma.challenge.upsert({
    where: { id: "seed-challenge-1" },
    update: {},
    create: {
      id: "seed-challenge-1",
      title: "60-Second World Dance Challenge",
      description:
        "Show us your best 60-second dance routine. Most-watched and most-voted entries split the prize pool when voting closes.",
      category: "Dance",
      prizePoolCents: 50000, // $500.00
      payoutModel: "HYBRID",
      status: "VOTING",
      submissionDeadline: new Date(Date.now() - 24 * 60 * 60 * 1000),
      votingDeadline: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000),
      minViewsForPayout: 1,
      createdById: creator1.id,
    },
  });

  const sub1 = await prisma.submission.upsert({
    where: { id: "seed-sub-1" },
    update: {},
    create: {
      id: "seed-sub-1",
      challengeId: challenge.id,
      userId: creator1.id,
      caption: "My grandmother taught me this move 💃",
      videoUrl: "/uploads/sample-placeholder.mp4",
      viewCount: 15234,
      voteCount: 812,
    },
  });

  const sub2 = await prisma.submission.upsert({
    where: { id: "seed-sub-2" },
    update: {},
    create: {
      id: "seed-sub-2",
      challengeId: challenge.id,
      userId: creator2.id,
      caption: "When the beat drops at a wedding 😂",
      videoUrl: "/uploads/sample-placeholder.mp4",
      viewCount: 9820,
      voteCount: 1204,
    },
  });

  await prisma.vote.upsert({
    where: { submissionId_userId: { submissionId: sub1.id, userId: viewer.id } },
    update: {},
    create: { submissionId: sub1.id, userId: viewer.id },
  });

  console.log("Seed complete:");
  console.log({ creator1: creator1.email, creator2: creator2.email, viewer: viewer.email, challenge: challenge.title });
  console.log("All seeded accounts use password: password123");
  console.log(`Submissions: ${sub1.id}, ${sub2.id}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
