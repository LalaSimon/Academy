-- CreateTable
CREATE TABLE "GroupMaterial" (
    "groupId" TEXT NOT NULL,
    "materialId" TEXT NOT NULL,

    CONSTRAINT "GroupMaterial_pkey" PRIMARY KEY ("groupId","materialId")
);

-- AddForeignKey
ALTER TABLE "GroupMaterial" ADD CONSTRAINT "GroupMaterial_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupMaterial" ADD CONSTRAINT "GroupMaterial_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "Material"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
