-- CreateTable
CREATE TABLE "Song" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "bpm" INTEGER NOT NULL,
    "onset" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "Song_pkey" PRIMARY KEY ("id")
);
