-- Add BillingMode enum and monthly billing tables

CREATE TYPE "BillingMode" AS ENUM ('per_delivery', 'monthly');
CREATE TYPE "MonthlyBillStatus" AS ENUM ('unpaid', 'partial', 'paid');

ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "billingMode" "BillingMode" NOT NULL DEFAULT 'per_delivery';

CREATE TABLE IF NOT EXISTS "MonthlyBill" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "totalAmount" DOUBLE PRECISION NOT NULL,
    "paidAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" "MonthlyBillStatus" NOT NULL DEFAULT 'unpaid',
    "dueDate" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MonthlyBill_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "MonthlyBill_customerId_month_key" ON "MonthlyBill"("customerId", "month");

ALTER TABLE "MonthlyBill" ADD CONSTRAINT "MonthlyBill_customerId_fkey"
    FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "MonthlyBillPayment" (
    "id" TEXT NOT NULL,
    "billId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "method" "PaymentMethod" NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MonthlyBillPayment_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "MonthlyBillPayment" ADD CONSTRAINT "MonthlyBillPayment_billId_fkey"
    FOREIGN KEY ("billId") REFERENCES "MonthlyBill"("id") ON DELETE CASCADE ON UPDATE CASCADE;
