import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PageLayout } from '@/components/layout';
import { ContentAPI } from '@/services/api';
import { Button, LoadingSpinner } from '@/components/ui';
import { ArrowLeft, Calendar, Eye, Clock, Share2 } from 'lucide-react';
import type { Content } from '@/types';
import DOMPurify from 'dompurify';
import { getImageUrl } from '@/utils/imageUrl';

const ContentDetailPage = (): JSX.Element => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [content, setContent] = useState<Content | null>(null);
  const [relatedContents, setRelatedContents] = useState<Content[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Tracks slugs that have already triggered a view increment to defeat
  // React Strict Mode double-mounts inside one browser session.
  const viewedSlugsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (slug) {
      loadContent(slug);
      if (!viewedSlugsRef.current.has(slug)) {
        viewedSlugsRef.current.add(slug);
        void ContentAPI.incrementContentView(slug);
      }
    }
  }, [slug]);

  const loadContent = async (contentSlug: string): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      // Load content by slug
      const contentRes = await ContentAPI.getContentBySlug(contentSlug);
      setContent(contentRes.data);

      // Load related contents if content ID is available
      if (contentRes.data.id) {
        try {
          const relatedRes = await ContentAPI.getRelatedContents(contentRes.data.id, 4);
          setRelatedContents(relatedRes.data);
        } catch {
          // Ignore related contents error
          setRelatedContents([]);
        }
      }
    } catch (err) {
      console.error('Failed to load content:', err);
      setError('We could not load this content. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString?: string | Date): string => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const estimateReadTime = (htmlContent: string): number => {
    const text = htmlContent.replace(/<[^>]*>/g, '');
    const words = text.trim().split(/\s+/).length;
    const wordsPerMinute = 200;
    return Math.ceil(words / wordsPerMinute);
  };

  const handleShare = async (): Promise<void> => {
    const shareData = {
      title: content?.title,
      text: content?.excerpt || content?.subtitle,
      url: window.location.href,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(window.location.href);
        // You could add a toast notification here
      }
    } catch (error) {
      console.error('Share failed:', error);
    }
  };

  const handleRelatedClick = (relatedSlug: string): void => {
    navigate(`/content/${relatedSlug}`);
  };

  if (loading) {
    return (
      <PageLayout>
        <div className="flex items-center justify-center min-h-screen">
          <LoadingSpinner size="lg" />
        </div>
      </PageLayout>
    );
  }

  if (error || !content) {
    return (
      <PageLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <p className="text-red-600 mb-4">{error || 'We couldn’t find that article.'}</p>
            <Button onClick={() => navigate('/')}>Back to home</Button>
          </div>
        </div>
      </PageLayout>
    );
  }

  const sanitizedContent = DOMPurify.sanitize(content.content);

  return (
    <PageLayout noPadding>
      <article className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <header className="mb-8">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back</span>
          </button>

          {/* Category */}
          <div className="mb-4">
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800">
              {ContentAPI.getCategoryIcon(content.category)}{' '}
              {ContentAPI.getCategoryDisplayName(content.category)}
            </span>
          </div>

          {/* Title */}
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">{content.title}</h1>

          {/* Subtitle */}
          {content.subtitle && <p className="text-xl text-gray-600 mb-4">{content.subtitle}</p>}

          {/* Meta info */}
          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
            <span className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              {formatDate(content.publishedAt || content.createdAt)}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              {estimateReadTime(content.content)} min read
            </span>
            <span className="flex items-center gap-1">
              <Eye className="w-4 h-4" />
              {content.viewCount.toLocaleString()} views
            </span>
            <button onClick={handleShare} className="flex items-center gap-1 hover:text-gray-700">
              <Share2 className="w-4 h-4" />
              Share
            </button>
          </div>
        </header>

        {/* Thumbnail */}
        {content.thumbnailUrl && (
          <div className="mb-8 rounded-lg overflow-hidden">
            <img
              src={getImageUrl(content.thumbnailUrl)}
              alt={content.title}
              className="w-full h-auto object-cover"
            />
          </div>
        )}

        {/* Content */}
        <div
          className="prose prose-lg max-w-none mb-12"
          dangerouslySetInnerHTML={{ __html: sanitizedContent }}
        />

        {/* Tags */}
        {content.tags && content.tags.length > 0 && (
          <div className="mb-12 pt-8 border-t">
            <div className="flex flex-wrap gap-2">
              {content.tags.map((tag, index) => (
                <span
                  key={index}
                  className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm"
                >
                  #{tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Related Contents */}
        {relatedContents.length > 0 && (
          <section className="mt-16 pt-8 border-t">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Related content</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {relatedContents.map((related) => (
                <article
                  key={related.id}
                  className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer overflow-hidden"
                  onClick={() => handleRelatedClick(related.slug)}
                >
                  <div className="flex gap-4 p-4">
                    {related.thumbnailUrl && (
                      <div className="w-24 h-24 flex-shrink-0">
                        <img
                          src={getImageUrl(related.thumbnailUrl)}
                          alt={related.title}
                          className="w-full h-full object-cover rounded"
                        />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 mb-1 line-clamp-2">
                        {related.title}
                      </h3>
                      {related.excerpt && (
                        <p className="text-sm text-gray-600 line-clamp-2">{related.excerpt}</p>
                      )}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}
      </article>
    </PageLayout>
  );
};

export default ContentDetailPage;
