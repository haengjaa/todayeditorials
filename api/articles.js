export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');

  try {
    const articles = [];
    const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
    const today = new Date().toISOString().split('T')[0];

    // 신문사별 설정 (더 강화된 정규식)
    const papers = [
      {
        name: 'chosun',
        title: '조선일보',
        url: 'https://www.chosun.com/opinion/editorial/',
        // 더 유연한 패턴: /opinion/editorial/년/월/일/ 형식의 모든 링크
        linkPattern: /href="(https:\/\/www\.chosun\.com\/opinion\/editorial\/[^"]+)"/g,
        titleExtractors: [
          html => {
            const match = html.match(/<h1[^>]*class="[^"]*headline[^"]*"[^>]*>([^<]+)<\/h1>/i);
            return match ? match[1].trim() : null;
          },
          html => {
            const match = html.match(/<h1[^>]*>([^<]+)<\/h1>/i);
            return match ? match[1].trim() : null;
          },
          html => {
            const match = html.match(/<meta\s+property="og:title"\s+content="([^"]+)"/i);
            return match ? match[1].trim() : null;
          }
        ]
      },
      {
        name: 'hani',
        title: '한겨레',
        url: 'https://www.hani.co.kr/arti/opinion/editorial',
        linkPattern: /href="(https:\/\/www\.hani\.co\.kr\/arti\/opinion\/editorial\/\d+\.html)"/g,
        titleExtractors: [
          html => {
            const match = html.match(/<meta\s+property="og:title"\s+content="([^"]+)"/i);
            return match ? match[1].trim() : null;
          },
          html => {
            const match = html.match(/<h1[^>]*>([^<]+)<\/h1>/i);
            return match ? match[1].trim() : null;
          }
        ]
      },
      {
        name: 'mk',
        title: '매일경제',
        url: 'https://www.mk.co.kr/opinion/editorial',
        linkPattern: /href="(https:\/\/www\.mk\.co\.kr\/(?:news|opinion)\/editorial\/\d+)"/g,
        titleExtractors: [
          html => {
            const match = html.match(/<meta\s+property="og:title"\s+content="([^"]+)"/i);
            return match ? match[1].trim() : null;
          },
          html => {
            const match = html.match(/<h1[^>]*>([^<]+)<\/h1>/i);
            return match ? match[1].trim() : null;
          }
        ]
      },
      {
        name: 'hankyung',
        title: '한국경제',
        url: 'https://www.hankyung.com/opinion/1158',
        // 한국경제: 더 유연한 패턴
        linkPattern: /href="(https:\/\/www\.hankyung\.com\/(?:article|news)\/\d+)"/g,
        titleExtractors: [
          html => {
            const match = html.match(/<meta\s+property="og:title"\s+content="([^"]+)"/i);
            return match ? match[1].trim() : null;
          },
          html => {
            const match = html.match(/<h1[^>]*>([^<]+)<\/h1>/i);
            return match ? match[1].trim() : null;
          }
        ]
      }
    ];

    const PAPERS = {
      chosun: '조선일보',
      hani: '한겨레',
      mk: '매일경제',
      hankyung: '한국경제'
    };

    // 각 신문사 처리
    for (const paper of papers) {
      console.log(`[${paper.name}] Processing...`);
      const articleLinks = new Set(); // 중복 제거

      try {
        const listResponse = await fetch(paper.url, {
          headers: {
            'User-Agent': userAgent,
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'ko-KR,ko;q=0.9,en;q=0.8',
            'Referer': 'https://www.google.com/',
            'Cache-Control': 'no-cache'
          },
          timeout: 10000
        });

        if (!listResponse.ok) {
          console.error(`[${paper.name}] Failed to fetch list: HTTP ${listResponse.status}`);
          continue;
        }

        const html = await listResponse.text();

        // 기사 링크 추출 (최대 5개 추출 후 상위 3개 사용)
        let match;
        let extractedCount = 0;
        while ((match = paper.linkPattern.exec(html)) && extractedCount < 5) {
          let url = match[1];
          // URL 정규화 (쿼리 파라미터 제거)
          url = url.split('?')[0];
          if (!articleLinks.has(url)) {
            articleLinks.add(url);
            extractedCount++;
          }
        }

        const links = Array.from(articleLinks).slice(0, 3);
        console.log(`[${paper.name}] Found ${links.length} article links`);

        // 각 기사에서 제목 추출
        for (let i = 0; i < links.length; i++) {
          const articleUrl = links[i];

          try {
            const articleResponse = await fetch(articleUrl, {
              headers: {
                'User-Agent': userAgent,
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'ko-KR,ko;q=0.9,en;q=0.8',
                'Referer': paper.url
              },
              timeout: 10000
            });

            if (!articleResponse.ok) {
              console.warn(`[${paper.name}] Failed to fetch article: HTTP ${articleResponse.status}`);
              continue;
            }

            const articleHtml = await articleResponse.text();

            let title = '';
            let summary = '';

            // 제목 추출 (여러 방법 시도)
            for (const extractor of paper.titleExtractors) {
              title = extractor(articleHtml);
              if (title && title.length > 5) break;
            }

            if (!title || title.length < 5) {
              console.warn(`[${paper.name}] Could not extract title from ${articleUrl}`);
              continue;
            }

            // 신문사명 제거
            title = title
              .replace(/[\|\-]\s*(조선일보|한겨레|매일경제|한국경제|뉴스).*$/i, '')
              .replace(/\s*\|\s*오마이뉴스.*$/i, '')
              .trim();

            // 요약 추출
            const summaryMatch = articleHtml.match(/<meta\s+property="og:description"\s+content="([^"]+)"/i) ||
                                articleHtml.match(/<meta\s+name="description"\s+content="([^"]+)"/i);
            if (summaryMatch) {
              summary = summaryMatch[1].trim().substring(0, 150);
            }

            articles.push({
              id: `${paper.name}-${today}-${i}`,
              p: paper.name,
              d: today,
              t: title,
              y: '사설',
              s: summary || title.substring(0, 150),
              u: articleUrl
            });

            console.log(`[${paper.name}] ✓ ${title}`);

          } catch (articleError) {
            console.error(`[${paper.name}] Error fetching ${articleUrl}:`, articleError.message);
          }

          // 요청 간 딜레이 (웹사이트 서버 부담 줄이기)
          await new Promise(resolve => setTimeout(resolve, 500));
        }

      } catch (error) {
        console.error(`[${paper.name}] Error:`, error.message);
      }

      // 신문사 간 딜레이
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log(`=== Total: ${articles.length} articles extracted ===`);

    return res.status(200).json({
      articles: articles,
      timestamp: new Date().toISOString(),
      total: articles.length
    });

  } catch (error) {
    console.error('Fatal error:', error);
    return res.status(200).json({
      articles: [],
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
}
