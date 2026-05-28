/**
 * Edge Function for health check and backend pre-warming
 * This runs on Vercel Edge Network with minimal cold start
 */
export const config = {
  runtime: 'edge',
};

export default async function handler(req: Request) {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers,
    });
  }

  // Get query parameters
  const url = new URL(req.url);
  const prewarm = url.searchParams.get('prewarm') === 'true';

  if (prewarm) {
    // Pre-warm backend services
    const backendUrls = [
      process.env.VITE_API_BASE_URL || 'https://pca-hijab-backend-unified.onrender.com',
      process.env.VITE_AI_API_URL || 'https://showmethecolor-api.onrender.com',
    ];

    const warmupResults = await Promise.allSettled(
      backendUrls.map(async (backendUrl) => {
        try {
          const startTime = Date.now();
          // ShowMeTheColor API uses /health, backend uses /api/health
          const healthEndpoint = backendUrl.includes('showmethecolor') ? '/health' : '/api/health';
          const response = await fetch(`${backendUrl}${healthEndpoint}`, {
            method: 'GET',
            headers: {
              'X-Prewarm': 'true',
            },
            // Use AbortSignal for timeout
            signal: AbortSignal.timeout(10000),
          });

          const endTime = Date.now();
          const responseTime = endTime - startTime;

          return {
            url: backendUrl,
            status: response.ok ? 'warm' : 'error',
            responseTime,
            coldStart: responseTime > 5000,
          };
        } catch (error) {
          return {
            url: backendUrl,
            status: 'failed',
            responseTime: -1,
            coldStart: true,
            error: error instanceof Error ? error.message : 'Unknown error',
          };
        }
      }),
    );

    return new Response(
      JSON.stringify({
        status: 'ok',
        service: 'edge-health',
        timestamp: new Date().toISOString(),
        prewarm: true,
        backends: warmupResults.map((r) =>
          r.status === 'fulfilled' ? r.value : { status: 'error', reason: r.reason },
        ),
      }),
      {
        status: 200,
        headers,
      },
    );
  }

  // Simple health check
  return new Response(
    JSON.stringify({
      status: 'ok',
      service: 'edge-health',
      timestamp: new Date().toISOString(),
      edge: true,
      region: process.env.VERCEL_REGION || 'unknown',
    }),
    {
      status: 200,
      headers,
    },
  );
}
