export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');

  try {
    const articles = [];
    const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
    const today = new Date().toISOString().split('T')[0];

    // 조선일보와 한국경제: 고정 URL (최신 기사)
    // 한겨레와 매일경제: 동적 추출

    const config = [
      {
        name: 'chosun',
        title: '조선일보',
        type: 'fixed',
        articles: [
          'https://www.chosun.com/opinion/editorial/2026/09/30/OMECNZU6FNAVRL6TKC6YR4TVGI/',
          'https://www.chosun.com/opinion/editorial/2026/09/30/CCL4QUEOYVCXLHEHLTZQHSP25A/',
          'https://www.chosun.com/opinion/editorial/2026/09/30/4OX77UHB3ZHGFBVAPYSCANX2KI/'
        ]
      },
      {
        name: 'hani',
        title: '한겨레',
        type: 'dynamic',
        url: 'https://www.hani.co.kr/arti/opinion/editorial',
        linkPattern: /href="(https:\/\/www\.hani\.co\.kr\/arti\/opinion\/editorial\/\d+\.html)"/g
      },
      {
        name: 'mk',
        title: '매일경제',
        type: 'dynamic',
        url: 'https://www.mk.co.kr/opinion/editorial',
        linkPattern: /href="(https:\/\/www\.mk\.co\.kr\/(?:news|opinion)\/editorial\/\d+)"/g
      },
      {
        name: 'hankyung',
        title: '한국경제',
        type: 'fixed',
        articles: [
          'https://www.hankyung.com/article/2026092928751',
          'https://www.hankyung.com/article/2026092928501',
          'https://www.hankyung.com/article/2026092928491'
        ]
      }
    ];

    // 각 신문사 처리
    for (const paper of config) {
      let articleUrls = [];

      if (paper.type === 'fixed') {
        // 고정 URL 사용
        articleUrls = paper.articles;
      } else if (paper.type === 'dynamic') {
        // 동적 추출
        try {
          const listResponse = await fetch(paper.url, {
            headers: {
              'User-Agent': userAgent,
              'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
              'Accept-Language': 'ko-KR,ko;q=0.9,en;q=0.8',
              'Referer': 'https://www.google.com/'
            },
            timeout: 10000
          });

          if (listResponse.ok) {
            const html = await listResponse.text();
            const links = new Set();
            let match;
            while ((match = paper.linkPattern.exec(html)) && links.size < 3) {
              links.add(match[1].split('?')[0]);
            }
            articleUrls = Array.from(links);
          }
        } catch (error) {
          console.error(`Failed to extract articles for ${paper.name}`);
        }
      }

      // 각 기사에서 제목 추출
      for (let i = 0; i < articleUrls.length; i++) {
        const articleUrl = articleUrls[i];

        try {
          const articleResponse = await fetch(articleUrl, {
            headers: {
              'User-Agent': userAgent,
              'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
              'Accept-Language': 'ko-KR,ko;q=0.9,en;q=0.8'
            },
            timeout: 10000
          });

          if (!articleResponse.ok) continue;

          const articleHtml = await articleResponse.text();

          let title = '';
          let summary = '';

          // 제목 추출
          let titleMatch = articleHtml.match(/<h1[^>]*>([^<]+)<\/h1>/i);
          if (!titleMatch) titleMatch = articleHtml.match(/<meta\s+property="og:title"\s+content="([^"]+)"/i);
          if (!titleMatch) titleMatch = articleHtml.match(/<title>([^<]+)<\/title>/i);

          if (titleMatch) {
            title = titleMatch[1].trim();
            title = title.replace(/[\|\-]\s*(조선일보|한겨레|매일경제|한국경제|뉴스).*$/i, '').trim();
          }

          if (!title || title.length < 5) continue;

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

        } catch (error) {
          console.error(`Error processing ${articleUrl}`);
        }

        // 요청 간 딜레이
        await new Promise(resolve => setTimeout(resolve, 300));
      }
    }

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
