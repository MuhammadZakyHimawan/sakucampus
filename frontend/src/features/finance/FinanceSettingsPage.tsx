import { useEffect, useState } from 'react';
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
import { LoadingState } from '@/components/ui/LoadingState';
import { PageHeader } from '@/components/ui/PageHeader';
import { Select } from '@/components/ui/Select';
import { useToast } from '@/components/ui/toast-context';
import { useAuth } from '@/features/auth/auth-context';
import { DEMO_USER } from '@/mocks/users';
import { MOCK_API_ENABLED } from '@/lib/config';
import { PERIOD_OPTIONS } from '@/lib/constants';
import {
  createFinanceSettings,
  getFinanceSettings,
  updateFinanceSettings,
} from '@/services/settings.service';
import type { FinanceSettings } from '@/types';
import { formatCurrency } from '@/utils/currency';
import { financeSettingsSchema } from './schemas';
import type { FinanceSettingsFormValues } from './schemas';

function toFormValues(
  settings: FinanceSettings,
): FinanceSettingsFormValues {
  return {
    initialBalance: settings.initialBalance,
    minBalance: settings.minBalance,
    period: settings.period,
    notifyBudget: settings.notifyBudget,
    notifyBalance: settings.notifyBalance,
    notifyGoal: settings.notifyGoal,
  };
}

export function FinanceSettingsPage() {
  const { user, updateProfile } = useAuth();
  const { toast } = useToast();
  const activeUser = user ?? DEMO_USER;
  const [isLoading, setIsLoading] = useState(true);
  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FinanceSettingsFormValues>({
    resolver: zodResolver(financeSettingsSchema),
    defaultValues: toFormValues(createFinanceSettings(activeUser)),
  });

  const initialBalance = watch('initialBalance');
  const minBalance = watch('minBalance');

  useEffect(() => {
    let isActive = true;

    getFinanceSettings(createFinanceSettings(activeUser))
      .then((settings) => {
        if (isActive) {
          reset(toFormValues(settings));
        }
      })
      .catch((loadError: unknown) => {
        if (isActive) {
          toast({
            title: 'Gagal memuat pengaturan',
            description:
              loadError instanceof Error
                ? loadError.message
                : 'Silakan coba lagi.',
            variant: 'error',
          });
        }
      })
      .finally(() => {
        if (isActive) {
          setIsLoading(false);
        }
      });

    return () => {
      isActive = false;
    };
  }, [activeUser, reset, toast]);

  const onSubmit = async (values: FinanceSettingsFormValues) => {
    try {
      const saved = await updateFinanceSettings(values);

      await updateProfile({
        initialBalance: saved.initialBalance,
        minBalance: saved.minBalance,
        currency: saved.currency,
      });
      reset(toFormValues(saved));
      toast({
        title: 'Pengaturan disimpan',
        description:
          'Saldo, batas minimum, dan preferensi keuangan telah diperbarui.',
        variant: 'success',
      });
    } catch (saveError) {
      toast({
        title: 'Gagal menyimpan pengaturan',
        description:
          saveError instanceof Error ? saveError.message : 'Silakan coba lagi.',
        variant: 'error',
      });
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Pengaturan Keuangan"
        description="Atur saldo awal, batas saldo minimum, dan preferensi keuangan lainnya."
        actions={
          <Badge variant={MOCK_API_ENABLED ? 'primary' : 'success'}>
            {MOCK_API_ENABLED ? 'Data demo' : 'Tersinkron'}
          </Badge>
        }
      />

      <Alert
        variant="info"
        title={
          MOCK_API_ENABLED
            ? 'Berlaku untuk data demo'
            : 'Tersinkron dengan akunmu'
        }
      >
        {MOCK_API_ENABLED
          ? 'Saldo awal dan batas minimum langsung memengaruhi ringkasan pada dashboard. Semua nilai disimpan di penyimpanan lokal browser.'
          : 'Saldo awal dan batas minimum langsung memengaruhi ringkasan pada dashboard. Pengaturan disimpan ke server dan berlaku di semua perangkat.'}
      </Alert>

      {isLoading ? (
        <Card>
          <LoadingState message="Memuat pengaturan keuangan..." />
        </Card>
      ) : (
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
                  {MOCK_API_ENABLED
                    ? 'Sesuaikan dasar perhitungan kondisi keuangan demo.'
                    : 'Sesuaikan dasar perhitungan kondisi keuanganmu.'}
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
              hint="Dipakai untuk peringatan saldo menipis."
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
              hint="MVP hanya mendukung Rupiah."
            />
            <div className="sm:col-span-2">
              <Alert variant="info">
                Perubahan saldo awal dapat membuat total saldo pada dashboard
                naik atau turun. Transaksi pemasukan dan pengeluaran tetap
                tersimpan.
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
                <span className="shrink-0 text-ink-secondary">Batas minimum</span>
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
                    Pilih peringatan yang ditampilkan.
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
              {MOCK_API_ENABLED
                ? 'Pengaturan disimpan ke penyimpanan lokal setelah tombol simpan ditekan.'
                : 'Pengaturan disimpan ke akunmu setelah tombol simpan ditekan.'}
            </p>
          </div>
          <Button type="submit" isLoading={isSubmitting}>
            <Save className="h-4 w-4" aria-hidden="true" />
            Simpan Pengaturan
          </Button>
        </div>
      </form>
      )}
    </div>
  );
}
