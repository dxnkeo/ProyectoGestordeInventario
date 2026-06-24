-- Grupo 3: orderId como UUID v4 (string)
ALTER TABLE "Reservation" ALTER COLUMN "orderId" SET DATA TYPE TEXT USING "orderId"::TEXT;
