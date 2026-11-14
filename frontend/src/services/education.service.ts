import { mockEducationArticles } from '@/mocks/education';
import type { EducationArticle } from '@/types';

const MOCK_DELAY = 250;
export const ALL_EDUCATION_CATEGORIES = 'Semua';

function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, milliseconds);
  });
}

export interface EducationFilter {
  query?: string;
  category?: string;
}

export function filterEducationArticles(
  articles: EducationArticle[],
  filter: EducationFilter,
): EducationArticle[] {
  const query = filter.query?.trim().toLowerCase() ?? '';
  const category =
    filter.category && filter.category !== ALL_EDUCATION_CATEGORIES
      ? filter.category
      : null;

  return articles.filter((article) => {
    const matchesCategory = category ? article.category === category : true;
    const haystack =
      `${article.title} ${article.excerpt} ${article.category}`.toLowerCase();
    const matchesQuery = query.length === 0 ? true : haystack.includes(query);

    return matchesCategory && matchesQuery;
  });
}

export function getEducationCategories(
  articles: EducationArticle[],
): string[] {
  return [
    ALL_EDUCATION_CATEGORIES,
    ...Array.from(new Set(articles.map((article) => article.category))),
  ];
}

export async function getEducationArticles(): Promise<EducationArticle[]> {
  await wait(MOCK_DELAY);

  return mockEducationArticles.map((article) => ({ ...article }));
}

export async function getEducationArticleById(
  id: string,
): Promise<EducationArticle | null> {
  const articles = await getEducationArticles();

  return articles.find((article) => article.id === id) ?? null;
}
