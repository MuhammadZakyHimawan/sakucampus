import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '@/lib/categories';
import type {
  ExpenseCategory,
  IncomeCategory,
  Transaction,
  TransactionInput,
} from '@/types';
import { createId, loadDataset, saveDataset } from './data-store';

const MOCK_DELAY = 300;

function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, milliseconds);
  });
}

function isCategoryValidForType(input: TransactionInput): boolean {
  if (input.type === 'expense') {
    return EXPENSE_CATEGORIES.includes(input.category as ExpenseCategory);
  }

  if (input.type === 'income') {
    return INCOME_CATEGORIES.includes(input.category as IncomeCategory);
  }

  return input.category === 'Lainnya';
}

function validateTransactionInput(input: TransactionInput): void {
  if (!input.description.trim()) {
    throw new Error('Deskripsi transaksi wajib diisi.');
  }

  if (!Number.isInteger(input.amount) || input.amount <= 0) {
    throw new Error('Nominal harus berupa angka bulat lebih besar dari nol.');
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date)) {
    throw new Error('Tanggal transaksi tidak valid.');
  }

  if (!isCategoryValidForType(input)) {
    throw new Error('Kategori tidak sesuai dengan jenis transaksi.');
  }
}

export async function getTransactions(): Promise<Transaction[]> {
  await wait(MOCK_DELAY);

  return loadDataset().transactions;
}

export async function createTransaction(
  input: TransactionInput,
): Promise<Transaction> {
  await wait(MOCK_DELAY);
  validateTransactionInput(input);

  const dataset = loadDataset();
  const transaction: Transaction = {
    id: createId('trx'),
    description: input.description.trim(),
    amount: input.amount,
    type: input.type,
    category: input.category,
    date: input.date,
    source: input.source,
    note: input.note?.trim() ? input.note.trim() : undefined,
  };
  const transactions = [transaction, ...dataset.transactions];

  saveDataset({ ...dataset, transactions });

  return transaction;
}

export async function updateTransaction(
  id: string,
  input: TransactionInput,
): Promise<Transaction> {
  await wait(MOCK_DELAY);
  validateTransactionInput(input);

  const dataset = loadDataset();
  const index = dataset.transactions.findIndex(
    (transaction) => transaction.id === id,
  );

  if (index === -1) {
    throw new Error('Transaksi tidak ditemukan.');
  }

  const updated: Transaction = {
    ...dataset.transactions[index],
    ...input,
    description: input.description.trim(),
    note: input.note?.trim() ? input.note.trim() : undefined,
  };
  const transactions = [...dataset.transactions];
  transactions[index] = updated;

  saveDataset({ ...dataset, transactions });

  return updated;
}

export async function deleteTransaction(id: string): Promise<void> {
  await wait(MOCK_DELAY);

  const dataset = loadDataset();
  const transactions = dataset.transactions.filter(
    (transaction) => transaction.id !== id,
  );

  if (transactions.length === dataset.transactions.length) {
    throw new Error('Transaksi tidak ditemukan.');
  }

  saveDataset({ ...dataset, transactions });
}
