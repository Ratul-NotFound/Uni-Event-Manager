"use client";

import React, { useState } from "react";
import { THEME } from "@/styles/theme";
import { Button } from "@/components/common/Button";
import { Card } from "@/components/common/Card";
import { Badge } from "@/components/common/Badge";
import { DollarSign, Plus, Trash2, PieChart, TrendingUp, TrendingDown } from "lucide-react";

interface BudgetItem {
  id: string;
  category: string;
  description: string;
  amount: number;
  paidBy: string;
  isReimbursed: boolean;
}

export const BudgetReconciler: React.FC = () => {
  const [ticketRevenue, setTicketRevenue] = useState(45000);
  const [sponsorshipRevenue, setSponsorshipRevenue] = useState(30000);

  const [expenses, setExpenses] = useState<BudgetItem[]>([
    {
      id: "e1",
      category: "Catering",
      description: "Buffet Lunch for 250 attendees & judges",
      amount: 32000,
      paidBy: "Treasurer (Club Account)",
      isReimbursed: true,
    },
    {
      id: "e2",
      category: "Printing",
      description: "Event Badges, Certificates, Door Posters",
      amount: 6500,
      paidBy: "Vice President (Personal Cash)",
      isReimbursed: false,
    },
    {
      id: "e3",
      category: "Stage AV",
      description: "Sound system, wireless mics & lighting",
      amount: 15000,
      paidBy: "President (Club Account)",
      isReimbursed: true,
    },
    {
      id: "e4",
      category: "Awards",
      description: "Winner Crests, Medals, and Gift Hampers",
      amount: 12000,
      paidBy: "General Secretary (Personal Cash)",
      isReimbursed: false,
    },
  ]);

  const [newDesc, setNewDesc] = useState("");
  const [newAmount, setNewAmount] = useState(1000);
  const [newPaidBy, setNewPaidBy] = useState("Treasurer");
  const [newCat, setNewCat] = useState("Logistics");

  const totalIncome = ticketRevenue + sponsorshipRevenue;
  const totalExpenses = expenses.reduce((acc, e) => acc + e.amount, 0);
  const netSurplus = totalIncome - totalExpenses;
  const pendingReimbursements = expenses
    .filter((e) => !e.isReimbursed)
    .reduce((acc, e) => acc + e.amount, 0);

  const handleAddExpense = () => {
    if (!newDesc.trim()) return;
    setExpenses([
      ...expenses,
      {
        id: `e-${Date.now()}`,
        category: newCat,
        description: newDesc,
        amount: Number(newAmount) || 0,
        paidBy: newPaidBy,
        isReimbursed: false,
      },
    ]);
    setNewDesc("");
  };

  const handleToggleReimburse = (id: string) => {
    setExpenses(
      expenses.map((e) =>
        e.id === id ? { ...e, isReimbursed: !e.isReimbursed } : e
      )
    );
  };

  return (
    <Card padding="md" className="space-y-6">
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
            Event Treasurer Budget & Cashflow Reconciler
          </h3>
        </div>
        <Badge variant={netSurplus >= 0 ? "success" : "danger"}>
          {netSurplus >= 0 ? `Net Surplus: +$${netSurplus}` : `Deficit: -$${Math.abs(netSurplus)}`}
        </Badge>
      </div>

      {/* KPI Financial Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs">
        <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1">
          <span className="text-slate-500 dark:text-slate-400 font-medium">Total Income (Tickets + Sponsors)</span>
          <h4 className="text-xl font-bold text-emerald-600 dark:text-emerald-400 font-mono">${totalIncome}</h4>
        </div>
        <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1">
          <span className="text-slate-500 dark:text-slate-400 font-medium">Total Expenses</span>
          <h4 className="text-xl font-bold text-rose-600 dark:text-rose-400 font-mono">${totalExpenses}</h4>
        </div>
        <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1">
          <span className="text-slate-500 dark:text-slate-400 font-medium">Net Event Balance</span>
          <h4 className="text-xl font-bold text-slate-900 dark:text-white font-mono">${netSurplus}</h4>
        </div>
        <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1">
          <span className="text-slate-500 dark:text-slate-400 font-medium">Pending Reimbursements</span>
          <h4 className="text-xl font-bold text-amber-600 dark:text-amber-400 font-mono">${pendingReimbursements}</h4>
        </div>
      </div>

      {/* Expenses Table */}
      <div className="space-y-3">
        <h4 className="text-xs font-bold text-slate-900 dark:text-slate-200 uppercase tracking-wider">
          Itemized Expense Ledger:
        </h4>
        <div className="w-full overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 uppercase font-semibold">
                <th className="p-3">Category</th>
                <th className="p-3">Description</th>
                <th className="p-3">Amount</th>
                <th className="p-3">Paid By (Out of Pocket)</th>
                <th className="p-3">Reimbursement Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60 text-slate-700 dark:text-slate-300">
              {expenses.map((e) => (
                <tr key={e.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/40">
                  <td className="p-3 font-semibold text-slate-900 dark:text-white">{e.category}</td>
                  <td className="p-3">{e.description}</td>
                  <td className="p-3 font-mono font-bold text-rose-600 dark:text-rose-400">${e.amount}</td>
                  <td className="p-3 text-slate-500 dark:text-slate-400">{e.paidBy}</td>
                  <td className="p-3">
                    <button
                      onClick={() => handleToggleReimburse(e.id)}
                      className="cursor-pointer"
                    >
                      <Badge variant={e.isReimbursed ? "success" : "warning"}>
                        {e.isReimbursed ? "Reimbursed ✓" : "Pending Payback"}
                      </Badge>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Card>
  );
};
