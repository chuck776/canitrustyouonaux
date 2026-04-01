-- CreateEnum
CREATE TYPE "TimeRange" AS ENUM ('SHORT_TERM', 'MEDIUM_TERM', 'LONG_TERM');

-- CreateTable
CREATE TABLE "SpotifyUser" (
    "id" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "imageUrl" TEXT,
    "spotifyAccessToken" TEXT NOT NULL,
    "spotifyRefreshToken" TEXT NOT NULL,
    "tokenExpiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SpotifyUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserMusicProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "timeRange" "TimeRange" NOT NULL,
    "genreVector" JSONB NOT NULL,
    "audioProfile" JSONB NOT NULL,
    "topArtistIds" JSONB NOT NULL,
    "followedArtistIds" JSONB NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserMusicProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Comparison" (
    "id" TEXT NOT NULL,
    "userAId" TEXT NOT NULL,
    "userBId" TEXT NOT NULL,
    "timeRange" "TimeRange" NOT NULL,
    "genreScore" DOUBLE PRECISION NOT NULL,
    "artistScore" DOUBLE PRECISION NOT NULL,
    "audioScore" DOUBLE PRECISION NOT NULL,
    "followedArtistScore" DOUBLE PRECISION NOT NULL,
    "finalScore" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Comparison_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserMusicProfile_userId_timeRange_key" ON "UserMusicProfile"("userId", "timeRange");

-- CreateIndex
CREATE INDEX "Comparison_userAId_userBId_timeRange_idx" ON "Comparison"("userAId", "userBId", "timeRange");

-- AddForeignKey
ALTER TABLE "UserMusicProfile" ADD CONSTRAINT "UserMusicProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "SpotifyUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comparison" ADD CONSTRAINT "Comparison_userAId_fkey" FOREIGN KEY ("userAId") REFERENCES "SpotifyUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comparison" ADD CONSTRAINT "Comparison_userBId_fkey" FOREIGN KEY ("userBId") REFERENCES "SpotifyUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
