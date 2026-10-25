import type { Metadata } from "next";
import { AccountBalance, EfiTransfer } from "@/components/finance/balance-cards";
import { DailySpending, MonthlySpending } from "@/components/finance/spending-charts";
import { StatStrip } from "@/components/finance/stat-strip";
import { ExpenseBreakdown, TopSuppliers } from "@/components/finance/supplier-expense";
import { Card } from "@/components/ui/card";
import { SampleDataNote } from "@/components/ui/sample-data-note";
import { requirePage } from "@/lib/guard";
import { SelectButton } from "@/components/ui/select-button";
import { filters } from "@/lib/mock/overview";

export const metadata: Metadata = { title: "Finance & Cost · SPPG Internal" };

export default async function FinancePage() {
  await requirePage("/finance");
  return (
    <div className="mx-auto max-w-400">
      <SampleDataNote />
      <Card className="space-y-5 p-6 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Finance &amp; Cost</h1>
            <p className="mt-2 text-sm text-slate-500 sm:text-base">Ringkasan uang dapur: belanja ke supplier, saldo, dan transfer EFI.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {filters.map((label) => (
              <SelectButton key={label} label={label} />
            ))}
          </div>
        </div>

        <StatStrip />
        <div className="grid gap-5 xl:grid-cols-[1fr_1fr]">
          <TopSuppliers />
          <ExpenseBreakdown />
        </div>
        <div className="grid gap-5 xl:grid-cols-2">
          <MonthlySpending />
          <DailySpending />
        </div>
        <div className="grid gap-5 xl:grid-cols-2">
          <AccountBalance />
          <EfiTransfer />
        </div>
      </Card>
    </div>
  );
}
