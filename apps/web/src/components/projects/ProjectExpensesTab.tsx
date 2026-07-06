"use client";

import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Textarea,
} from "@st-manager/ui";
import { PlusIcon, Trash2Icon, TrendingUpIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { useAuth } from "@/hooks/useAuth";
import { useProject } from "@/hooks/useProjects";
import { formatINR } from "@/lib/currency";
import { PROJECT_EXPENSE_CATEGORIES } from "@/lib/projects/constants";
import { addProjectExpense, getTotalExpenses, removeProjectExpense } from "@/lib/projects/expenses";
import { calculateProjectProfit } from "@/lib/projects/profit";

interface ProjectExpensesTabProps {
  projectId: string;
}

const emptyForm = {
  name: "",
  category: PROJECT_EXPENSE_CATEGORIES[0],
  amount: "",
  assignedPerson: "",
  notes: "",
  expenseDate: new Date().toISOString().slice(0, 10),
};

export function ProjectExpensesTab({ projectId }: ProjectExpensesTabProps) {
  const { user } = useAuth();
  const project = useProject(projectId);
  const [form, setForm] = useState(emptyForm);
  const isOwner = user?.role === "owner";

  if (!project) {
    return null;
  }

  const totalExpenses = getTotalExpenses(project);
  const profit = calculateProjectProfit(project);

  function handleAddExpense() {
    if (!form.name.trim()) {
      toast.error("Enter an expense name");
      return;
    }
    const amount = Number(form.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error("Enter a valid amount");
      return;
    }

    addProjectExpense(projectId, {
      name: form.name,
      category: form.category,
      amount,
      assignedPerson: form.assignedPerson,
      notes: form.notes,
      expenseDate: form.expenseDate,
    });
    setForm({ ...emptyForm, category: form.category });
    toast.success("Expense added");
  }

  function handleRemove(expenseId: string) {
    removeProjectExpense(projectId, expenseId);
    toast.success("Expense removed");
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Add Expense</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="expense-name">Expense Name</Label>
            <Input
              id="expense-name"
              placeholder="Tabla Artist, Travel, Studio Maintenance..."
              value={form.name}
              onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="expense-category">Category</Label>
            <select
              id="expense-category"
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
              value={form.category}
              onChange={(event) => setForm((prev) => ({ ...prev, category: event.target.value }))}
            >
              {PROJECT_EXPENSE_CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="expense-amount">Amount (INR)</Label>
            <Input
              id="expense-amount"
              type="number"
              min={0}
              value={form.amount}
              onChange={(event) => setForm((prev) => ({ ...prev, amount: event.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="expense-person">Assigned Person</Label>
            <Input
              id="expense-person"
              placeholder="Who was paid / responsible"
              value={form.assignedPerson}
              onChange={(event) => setForm((prev) => ({ ...prev, assignedPerson: event.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="expense-date">Expense Date</Label>
            <Input
              id="expense-date"
              type="date"
              value={form.expenseDate}
              onChange={(event) => setForm((prev) => ({ ...prev, expenseDate: event.target.value }))}
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="expense-notes">Notes</Label>
            <Textarea
              id="expense-notes"
              rows={2}
              value={form.notes}
              onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))}
            />
          </div>
          <div className="sm:col-span-2">
            <Button type="button" onClick={handleAddExpense}>
              <PlusIcon className="size-4" />
              Add Expense
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Expenses ({project.expenses.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {project.expenses.length === 0 ? (
            <p className="text-sm text-muted-foreground">No expenses recorded yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Expense</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Assigned Person</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {project.expenses.map((expense) => (
                  <TableRow key={expense.id}>
                    <TableCell>{new Date(`${expense.expenseDate}T12:00:00`).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <p className="font-medium">{expense.name}</p>
                      {expense.notes ? (
                        <p className="text-xs text-muted-foreground">{expense.notes}</p>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{expense.category}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{expense.assignedPerson || "—"}</TableCell>
                    <TableCell className="font-medium">{formatINR(expense.amount)}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemove(expense.id)}
                        aria-label={`Remove ${expense.name}`}
                      >
                        <Trash2Icon className="size-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {isOwner ? (
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUpIcon className="size-4" />
              Profit (Owner Only)
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-3">
            <div>
              <p className="text-sm text-muted-foreground">Revenue</p>
              <p className="text-lg font-semibold">{formatINR(profit.revenue)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Expenses</p>
              <p className="text-lg font-semibold text-amber-600 dark:text-amber-400">
                {formatINR(totalExpenses)}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Net Profit</p>
              <p
                className={`text-lg font-semibold ${
                  profit.netProfit >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"
                }`}
              >
                {formatINR(profit.netProfit)}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
