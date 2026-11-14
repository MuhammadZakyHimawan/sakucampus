import { useCallback, useEffect, useMemo, useState } from 'react';
import { BookOpen, SearchX } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Input } from '@/components/ui/Input';
import { LoadingState } from '@/components/ui/LoadingState';
import { Modal } from '@/components/ui/Modal';
import { PageHeader } from '@/components/ui/PageHeader';
import { Select } from '@/components/ui/Select';
import {
  ALL_EDUCATION_CATEGORIES,
  filterEducationArticles,
  getEducationArticles,
  getEducationCategories,
} from '@/services/education.service';
import type { EducationArticle } from '@/types';
import { ArticleCard } from './components/ArticleCard';

export function EducationPage() {
  const [articles, setArticles] = useState<EducationArticle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState(ALL_EDUCATION_CATEGORIES);
  const [selectedArticle, setSelectedArticle] =
    useState<EducationArticle | null>(null);

  const loadArticles = useCallback(async () => {
    setIsLoading(true);

    try {
      const data = await getEducationArticles();
      setArticles(data);
      setError(null);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : 'Materi edukasi gagal dimuat.',
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadArticles();
  }, [loadArticles]);

  const categories = useMemo(() => getEducationCategories(articles), [articles]);

  const filteredArticles = useMemo(
    () => filterEducationArticles(articles, { query, category }),
    [articles, query, category],
  );

  const hasActiveFilters =
    query.trim().length > 0 || category !== ALL_EDUCATION_CATEGORIES;

  const resetFilters = () => {
    setQuery('');
    setCategory(ALL_EDUCATION_CATEGORIES);
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Edukasi"
        description="Materi literasi keuangan sederhana untuk membantu mengelola uang saku."
        actions={<Badge variant="primary">Konten contoh</Badge>}
      />

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Jelajahi materi</CardTitle>
            <CardDescription>
              Cari artikel berdasarkan judul atau pilih kategori yang ingin
              dipelajari.
            </CardDescription>
          </div>
          {hasActiveFilters ? (
            <Button variant="outline" size="sm" onClick={resetFilters}>
              Reset filter
            </Button>
          ) : null}
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Cari materi"
              type="search"
              placeholder="Misalnya: dana darurat"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            <Select
              label="Kategori"
              value={category}
              onChange={(event) => setCategory(event.target.value)}
            >
              {categories.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </Select>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <Card>
          <LoadingState message="Memuat materi edukasi..." />
        </Card>
      ) : error ? (
        <Card>
          <ErrorState
            title="Materi gagal dimuat"
            message={error}
            onRetry={() => {
              void loadArticles();
            }}
          />
        </Card>
      ) : filteredArticles.length === 0 ? (
        <Card>
          <EmptyState
            icon={SearchX}
            title="Materi tidak ditemukan"
            description="Coba kata kunci lain atau pilih kategori yang berbeda."
            action={
              <Button variant="outline" size="sm" onClick={resetFilters}>
                Reset filter
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filteredArticles.map((article) => (
            <ArticleCard
              key={article.id}
              article={article}
              onOpen={setSelectedArticle}
            />
          ))}
        </div>
      )}

      <Modal
        open={Boolean(selectedArticle)}
        onClose={() => setSelectedArticle(null)}
        title={selectedArticle?.title ?? 'Detail materi'}
        description={
          selectedArticle
            ? `${selectedArticle.category} · ${selectedArticle.readMinutes} menit baca`
            : undefined
        }
        size="lg"
        footer={
          <Button variant="outline" onClick={() => setSelectedArticle(null)}>
            Tutup
          </Button>
        }
      >
        {selectedArticle ? (
          <div className="flex flex-col gap-3 text-sm leading-relaxed text-ink-secondary">
            {selectedArticle.content.split('\n\n').map((paragraph, index) => (
              <p key={`${selectedArticle.id}-${index}`}>{paragraph}</p>
            ))}
            <p className="flex items-start gap-2 rounded-lg bg-background p-3 text-xs">
              <BookOpen
                className="mt-0.5 h-4 w-4 shrink-0 text-primary"
                aria-hidden="true"
              />
              Materi ini adalah konten contoh untuk keperluan demo dan bukan
              nasihat keuangan profesional.
            </p>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
