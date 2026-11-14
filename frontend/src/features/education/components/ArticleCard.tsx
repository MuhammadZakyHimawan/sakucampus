import { ArrowRight, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import type { EducationArticle } from '@/types';

export interface ArticleCardProps {
  article: EducationArticle;
  onOpen: (article: EducationArticle) => void;
}

export function ArticleCard({ article, onOpen }: ArticleCardProps) {
  return (
    <Card className="flex h-full flex-col gap-3 p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Badge variant="info">{article.category}</Badge>
        <span className="inline-flex items-center gap-1 text-xs text-ink-secondary">
          <Clock className="h-3.5 w-3.5" aria-hidden="true" />
          {article.readMinutes} menit baca
        </span>
      </div>

      <div className="flex flex-col gap-1.5">
        <h2 className="text-base font-semibold text-ink">{article.title}</h2>
        <p className="text-sm leading-relaxed text-ink-secondary">
          {article.excerpt}
        </p>
      </div>

      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="mt-auto self-start px-0 hover:bg-transparent"
        onClick={() => onOpen(article)}
        aria-label={`Baca artikel ${article.title}`}
      >
        Baca artikel
        <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </Button>
    </Card>
  );
}
