import { describe, expect, it } from 'vitest';
import {
  ALL_EDUCATION_CATEGORIES,
  filterEducationArticles,
  getEducationArticleById,
  getEducationArticles,
  getEducationCategories,
} from './education.service';

describe('education service', () => {
  it('returns the demo articles', async () => {
    const articles = await getEducationArticles();

    expect(articles.length).toBeGreaterThan(0);
    expect(
      articles.every(
        (article) =>
          article.id &&
          article.title &&
          article.category &&
          article.excerpt &&
          article.content &&
          article.readMinutes > 0,
      ),
    ).toBe(true);
  });

  it('returns a copy so callers cannot mutate the mock source', async () => {
    const [firstLoad] = await getEducationArticles();
    firstLoad.title = 'Berubah';

    const [secondLoad] = await getEducationArticles();

    expect(secondLoad.title).not.toBe('Berubah');
  });

  it('finds an article by id and returns null when missing', async () => {
    const [firstArticle] = await getEducationArticles();

    await expect(getEducationArticleById(firstArticle.id)).resolves.toMatchObject(
      { id: firstArticle.id },
    );
    await expect(getEducationArticleById('edu-unknown')).resolves.toBeNull();
  });

  it('filters by category and case-insensitive query', async () => {
    const articles = await getEducationArticles();
    const budgetArticles = filterEducationArticles(articles, {
      query: '',
      category: 'Budgeting',
    });

    expect(budgetArticles).toHaveLength(1);
    expect(budgetArticles[0].category).toBe('Budgeting');

    const searchResults = filterEducationArticles(articles, {
      query: 'DANA DARURAT',
      category: ALL_EDUCATION_CATEGORIES,
    });

    expect(searchResults.length).toBeGreaterThan(0);
    expect(
      searchResults.every((article) =>
        `${article.title} ${article.excerpt} ${article.category}`
          .toLowerCase()
          .includes('dana darurat'),
      ),
    ).toBe(true);

    expect(
      filterEducationArticles(articles, { query: 'tidak-ada-materi' }),
    ).toHaveLength(0);
  });

  it('builds a unique category list starting with Semua', async () => {
    const articles = await getEducationArticles();
    const categories = getEducationCategories(articles);

    expect(categories[0]).toBe(ALL_EDUCATION_CATEGORIES);
    expect(new Set(categories).size).toBe(categories.length);
  });
});
