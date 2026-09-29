export default async function handler(req, res) {
  try {
    const articles = [];

    // 각 신문사의 사설 목록 페이지
    const papers = [
      {
        name: 'chosun',
        title: '조선일보',
        url: 'https://www.chosun.com/opinion/editorial/'
      },
      {
        name: 'hani',
        title: '한겨레',
        url: 'https://www.hani.co.kr/arti/opinion/editorial'
      },
      {
        name: 'mk',
        title: '매일경제',
        url: 'https://www.mk.co.kr/opinion/editorial'
      },
      {
        name: 'hankyung',
        title: '한국경제',
        url: 'https://www.hankyung.com/opinion/1158'
      }
    ];

    const PAPERS = {
      chosun: '조선일보',
      hani: '한겨레',
      mk: '매일경제',
      hankyung: '한국경제'
    };

    // 각 신문사의 목록 페이지에서 기사 링크 추출
    for (const paper of papers) {
      const articleLinks = [];

      try {
        const listResponse = await fetch(paper.url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
          }
        });

        if (!listResponse.ok) {
          console.error(`Failed to fetch ${paper.name} list: ${listResponse.status}`);
          continue;
        }

        const html = await listResponse.text();

        // 신문사별 기사 링크 추출 로직
        if (paper.name === 'chosun') {
          // 조선일보: /opinion/editorial/ 경로의 링크 추출
          const linkRegex = /href="(https:\/\/www\.chosun\.com\/opinion\/editorial\/\d{4}\/\d{2}\/\d{2}\/[^"]+)"/g;
          let match;
          while ((match = linkRegex.exec(html)) && articleLinks.length < 3) {
            const url = match[1];
            if (!articleLinks.includes(url)) {
              articleLinks.push(url);
            }
          }
        } else if (paper.name === 'hani') {
          // 한겨레: /arti/opinion/editorial/ 경로의 링크 추출
          const linkRegex = /href="(https:\/\/www\.hani\.co\.kr\/arti\/opinion\/editorial\/\d+\.html)"/g;
          let match;
          while ((match = linkRegex.exec(html)) && articleLinks.length < 3) {
            const url = match[1];
            if (!articleLinks.includes(url)) {
              articleLinks.push(url);
            }
          }
        } else if (paper.name === 'mk') {
          // 매일경제: /news/editorial/ 또는 /opinion/editorial/ 경로의 링크 추출
          const linkRegex = /href="(https:\/\/www\.mk\.co\.kr\/(?:news|opinion)\/editorial\/\d+)"/g;
          let match;
          while ((match = linkRegex.exec(html)) && articleLinks.length < 3) {
            const url = match[1];
            if (!articleLinks.includes(url)) {
              articleLinks.push(url);
            }
          }
        } else if (paper.name === 'hankyung') {
          // 한국경제: /article/ 경로의 링크 추출
          const linkRegex = /href="(https:\/\/www\.hankyung\.com\/article\/\d+)"/g;
          let match;
          while ((match = linkRegex.exec(html)) && articleLinks.length < 3) {
            const url = match[1];
            if (!articleLinks.includes(url)) {
              articleLinks.push(url);
            }
          }
        }

        console.log(`Found ${articleLinks.length} articles for ${paper.name}`);

        // 추출한 각 링크에서 제목과 내용 추출
        for (let i = 0; i < articleLinks.length; i++) {
          const articleUrl = articleLinks[i];

          try {
            const articleResponse = await fetch(articleUrl, {
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
              }
            });

            if (!articleResponse.ok) {
              console.error(`Failed to fetch article: ${articleUrl}`);
              continue;
            }

            const articleHtml = await articleResponse.text();

            let title = '';
            let summary = '';

            // 제목 추출 (여러 방법 시도)
            let titleMatch = articleHtml.match(/<h1[^>]*>([^<]+)<\/h1>/i);
            if (!titleMatch) titleMatch = articleHtml.match(/<meta\s+property="og:title"\s+content="([^"]+)"/i);
            if (!titleMatch) titleMatch = articleHtml.match(/<title>([^<]+)<\/title>/i);

            if (titleMatch) {
              title = titleMatch[1].trim();
              // 신문사명 제거
              title = title.replace(/[\|\-]\s*(조선일보|한겨레|매일경제|한국경제).*$/i, '').trim();
            }

            // 요약 추출
            let summaryMatch = articleHtml.match(/<meta\s+property="og:description"\s+content="([^"]+)"/i);
            if (!summaryMatch) summaryMatch = articleHtml.match(/<meta\s+name="description"\s+content="([^"]+)"/i);

            if (summaryMatch) {
              summary = summaryMatch[1].trim().substring(0, 100);
            }

            // 제목이 없으면 스킵
            if (!title || title.length < 5) continue;

            articles.push({
              id: `${paper.name}-${new Date().toISOString().split('T')[0]}-${i}`,
              p: paper.name,
              d: new Date().toISOString().split('T')[0],
              t: title,
              y: '사설',
              s: summary || title.substring(0, 100),
              u: articleUrl
            });

          } catch (articleError) {
            console.error(`Failed to extract content from ${articleUrl}:`, articleError.message);
          }
        }

      } catch (error) {
        console.error(`Failed to process ${paper.name}:`, error.message);
      }
    }

    // 데이터가 없으면 안내 메시지 반환
    if (articles.length === 0) {
      articles.push({
        id: 'no-data-1',
        p: 'chosun',
        d: new Date().toISOString().split('T')[0],
        t: '사설을 로드할 수 없습니다',
        y: '안내',
        s: '잠시 후 다시 시도해주세요. 신문사 페이지 구조가 변경되었을 수 있습니다.',
        u: 'https://www.chosun.com'
      });
    }

    res.setHeader('Content-Type', 'application/json');
    res.status(200).json({
      articles: articles
    });

  } catch (error) {
    console.error('Main error:', error);
    res.status(500).json({
      error: error.message,
      articles: []
    });
  }
}
