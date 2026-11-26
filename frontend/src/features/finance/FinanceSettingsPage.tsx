import { useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Coins, Landmark, Save, Settings2, Wallet } from 'lucide-react';
import { Alert } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/Card';
import { Checkbox } from '@/components/ui/Checkbox';
import { Input } from '@/components/ui/Input';
import { PageHeader } from '@/components/ui/PageHeader';
import { Select } from '@/components/ui/Select';
import { useToast } from '@/components/ui/toast-context';
import { useFinanceData } from '@/hooks/finance-data-context';
import { isMockApiEnabled } from '@/lib/config';
import { PERIOD_OPTIONS } from '@/lib/constants';
import { formatCurrency } from '@/utils/currency';
import { financeSettingsSchema } from './schemas';
import type { FinanceSettingsFormValues } from './schemas';

export function FinanceSettingsPage() {
  const { financeSettings, saveFinanceSettings } = useFinanceData();
  const { toast } = useToast();
  const isMock = isMockApiEnabled();

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FinanceSettingsFormValues>({
    resolver: zodResolver(financeSettingsSchema),
    defaultValues: {
      initialBalance: financeSettings.initialBalance,
      minBalance: financeSettings.minBalance,
      period: financeSettings.period,
      notifyBudget: financeSettings.notifyBudget,
      notifyBalance: financeSettings.notifyBalance,
      notifyGoal: financeSettings.notifyGoal,
    },
  });

  useEffect(() => {
    reset({
      initialBalance: financeSettings.initialBalance,
      minBalance: financeSettings.minBalance,
      period: financeSettings.period,
      notifyBudget: financeSettings.notifyBudget,
      notifyBalance: financeSettings.notifyBalance,
      notifyGoal: financeSettings.notifyGoal,
    });
  }, [financeSettings, reset]);

  const initialBalance = watch('initialBalance');
  const minBalance = watch('minBalance');

  const onSubmit = async (values: FinanceSettingsFormValues) => {
    try {
      await saveFinanceSettings({
        initialBalance: values.initialBalance,
        minBalance: values.minBalance,
        currency: 'IDR',
        period: values.period,
        notifyBudget: values.notifyBudget,
        notifyBalance: values.notifyBalance,
        notifyGoal: values.notifyGoal,
      });
      reset(values);
      toast({
        title: 'Pengaturan disimpan',
        description:
          'Saldo awal, batas minimum, dan preferensi keuangan berhasil diperbarui.',
        variant: 'success',
      });
    } catch (saveError) {
      toast({
        title: 'Gagal menyimpan pengaturan',
        description:
          saveError instanceof Error
            ? saveError.message
            : 'Silakan coba lagi.',
        variant: 'error',
      });
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Pengaturan Keuangan"
        description="Atur saldo awal, batas saldo minimum, dan preferensi peringatan keuanganmu."
        actions={isMock ? <Badge variant="primary">Data demo</Badge> : undefined}
      />

      {isMock ? (
        <Alert variant="info" title="Berlaku untuk data demo">
          Saldo awal dan batas minimum langsung memengaruhi ringkasan pada
          dashboard. Semua nilai disimpan di penyimpanan lokal browser.
        </Alert>
      ) : null}

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="grid gap-4 xl:grid-cols-3"
        noValidate
      >
        <Card className="xl:col-span-2">
          <CardHeader>
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-light text-primary-dark">
                <Wallet className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <CardTitle>Saldo dan Periode</CardTitle>
                <CardDescription>
                  Sesuaikan dasar perhitungan saldo berjalan dan batas aman
                  keuanganmu.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Saldo awal (Rp)"
              type="number"
              inputMode="numeric"
              min="0"
              step="1"
              hint="Gunakan angka bulat tanpa titik atau koma."
              error={errors.initialBalance?.message}
              {...register('initialBalance')}
            />
            <Input
              label="Batas saldo minimum (Rp)"
              type="number"
              inputMode="numeric"
              min="0"
              step="1"
              hint="Dipakai Rule Engine untuk peringatan saldo menipis."
              error={errors.minBalance?.message}
              {...register('minBalance')}
            />
            <Select
              label="Periode keuangan"
              hint="Menjadi periode awal saat membuka dashboard."
              error={errors.period?.message}
              {...register('period')}
            >
              {PERIOD_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
            <Input
              label="Mata uang"
              value="IDR (Rupiah)"
              disabled
              readOnly
              hint="SakuCampus menggunakan mata uang Rupiah (IDR)."
            />
            <div className="sm:col-span-2">
              <Alert variant="info">
                Perubahan saldo awal memengaruhi total saldo berjalan pada
                dashboard dan Telegram Bot, sementara riwayat transaksi tetap
                tersimpan utuh.
              </Alert>
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-light text-primary-dark">
                  <Coins className="h-5 w-5" aria-hidden="true" />
                </span>
                <div>
                  <CardTitle>Ringkasan</CardTitle>
                  <CardDescription>
                    Pratinjau nilai yang akan disimpan.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 text-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="shrink-0 text-ink-secondary">Saldo awal</span>
                <span className="min-w-0 break-words text-right font-semibold text-ink">
                  {formatCurrency(Number(initialBalance) || 0)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="shrink-0 text-ink-secondary">
                  Batas minimum
                </span>
                <span className="min-w-0 break-words text-right font-semibold text-ink">
                  {formatCurrency(Number(minBalance) || 0)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3 border-t border-border pt-3">
                <span className="text-ink-secondary">Mata uang</span>
                <span className="font-semibold text-ink">IDR</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-light text-primary-dark">
                  <Settings2 className="h-5 w-5" aria-hidden="true" />
                </span>
                <div>
                  <CardTitle>Preferensi Notifikasi</CardTitle>
                  <CardDescription>
                    Pilih peringatan dini yang diaktifkan.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <Checkbox
                label="Peringatan anggaran"
                {...register('notifyBudget')}
              />
              <Checkbox
                label="Peringatan saldo minimum"
                {...register('notifyBalance')}
              />
              <Checkbox
                label="Pembaruan target tabungan"
                {...register('notifyGoal')}
              />
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-5 shadow-soft sm:flex-row sm:items-center sm:justify-between xl:col-span-3">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-light text-primary-dark">
              <Landmark className="h-5 w-5" aria-hidden="true" />
            </span>
            <p className="text-sm text-ink-secondary">
              {isMock
                ? 'Pengaturan disimpan ke penyimpanan browser.'
                : 'Pengaturan disimpan langsung ke akun SakuCampus dan disinkronkan dengan Rule Engine.'}
            </p>
          </div>
          <Button type="submit" isLoading={isSubmitting}>
            <Save className="h-4 w-4" aria-hidden="true" />
            Simpan Pengaturan
          </Button>
        </div>
      </form>
    </div>
  );
}
