-- AlterTable
ALTER TABLE "locations" ADD COLUMN     "city" TEXT;

-- AlterTable
ALTER TABLE "products" ADD COLUMN     "category" TEXT,
ADD COLUMN     "price" DOUBLE PRECISION,
ADD COLUMN     "unit" TEXT;
