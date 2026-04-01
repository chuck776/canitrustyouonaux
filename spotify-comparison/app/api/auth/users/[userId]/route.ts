// app/api/users/[userId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const user = await prisma.spotifyUser.findUnique({
      where: { id: params.userId },
      select: {
        id: true,
        displayName: true,
        imageUrl: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json(user);
  } catch (err) {
    console.error("Failed to fetch user:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}