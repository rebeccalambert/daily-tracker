-- CreateTable
CREATE TABLE "Item" (
    "id" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "recurrence" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "notes" TEXT,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" DATE,
    "dueDate" DATE,
    "weekday" TEXT,
    "dayOfMonth" INTEGER,
    "month" INTEGER,
    "sortIndex" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Item_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Item_type_sortIndex_idx" ON "Item"("type", "sortIndex");
