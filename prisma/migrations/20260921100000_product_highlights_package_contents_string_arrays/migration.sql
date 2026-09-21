-- AlterTable
ALTER TABLE "products" DROP COLUMN "highlights",
ADD COLUMN     "highlights" TEXT[] DEFAULT ARRAY[]::TEXT[],
DROP COLUMN "package_contents",
ADD COLUMN     "package_contents" TEXT[] DEFAULT ARRAY[]::TEXT[];

