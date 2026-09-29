export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');

  try {
    const articles = [];

    // 각 신문사의 사설 목록 페이지
    const papers = [
      {
        name: 'chosun',
        title: '조선일보',
        url: 'https://www.chosun.com/opinion/editorial/',
        selector: 'editorial'
      },
      {
        name: 'hani',
        title: '한겨레',
        url: 'https://www.hani.co.kr/arti/opinion/editorial',
        selector: 'editorial'
      },
      {
        name: 'mk',
        title: '매일경제',
        url: 'https://www.mk.co.kr/opinion/editorial',
        selector: 'editorial'
      },
      {
        name: 'hankyung',
        title: '한국경제',
        url: 'https://www.hankyung.com/opinion/1158',
        selector: 'article'
      }
    ];

    const PAPERS = {
      chosun: '조선일보',
      hani: '한겨레',
      mk: '매일경제',
      hankyung: '한국경제'
    };

    const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
    const today = new Date().toISOString().split('T')[0];

    // 각 신문사의 목록 페이지에서 기사 링크 추출
    for (const paper of papers) {
      console.log(`Processing ${paper.name}...`);
      const articleLinks = [];

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

        if (!listResponse.ok) {
          console.error(`Failed to fetch ${paper.name} list: ${listResponse.status}`);
          continue;
        }

        const html = await listResponse.text();

        // 신문사별 기사 링크 추출 로직
        if (paper.name === 'chosun') {
          const linkRegex = /href="(https:\/\/www\.chosun\.com\/opinion\/editorial\/\d{4}\/\d{2}\/\d{2}\/[^"]+)"/g;
          let match;
          while ((match = linkRegex.exec(html)) && articleLinks.length < 3) {
            const url = match[1];
            if (!articleLinks.includes(url) && url.length < 200) {
              articleLinks.push(url);
            }
          }
        } else if (paper.name === 'hani') {
          const linkRegex = /href="(https:\/\/www\.hani\.co\.kr\/arti\/opinion\/editorial\/\d+\.html)"/g;
          let match;
          while ((match = linkRegex.exec(html)) && articleLinks.length < 3) {
            const url = match[1];
            if (!articleLinks.includes(url)) {
              articleLinks.push(url);
            }
          }
        } else if (paper.name === 'mk') {
          const linkRegex = /href="(https:\/\/www\.mk\.co\.kr\/(?:news|opinion)\/editorial\/\d+)"/g;
          let match;
          while ((match = linkRegex.exec(html)) && articleLinks.length < 3) {
            const url = match[1];
            if (!articleLinks.includes(url)) {
              articleLinks.push(url);
            }
          }
        } else if (paper.name === 'hankyung') {
          const linkRegex = /href="(https:\/\/www\.hankyung\.com\/article\/\d+)"/g;
          let match;
          while ((match = linkRegex.exec(html)) && articleLinks.length < 3) {
            const url = match[1];
            if (!articleLinks.includes(url)) {
              articleLinks.push(url);
            }
          }
        }

        console.log(`Found ${articleLinks.length} article links for ${paper.name}`);

        // 추출한 각 링크에서 제목과 내용 추출
        for (let i = 0; i < articleLinks.length; i++) {
          const articleUrl = articleLinks[i];

          try {
            const articleResponse = await fetch(articleUrl, {
              headers: {
                'User-Agent': userAgent,
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'ko-KR,ko;q=0.9,en;q=0.8'
              },
              timeout: 10000
            });

            if (!articleResponse.ok) {
              console.error(`Failed to fetch article: ${articleUrl} (${articleResponse.status})`);
              continue;
            }

            const articleHtml = await articleResponse.text();

            let title = '';
            let summary = '';

            // 제목 추출
            let titleMatch = articleHtml.match(/<h1[^>]*>([^<]+)<\/h1>/i);
            if (!titleMatch) titleMatch = articleHtml.match(/<meta\s+property="og:title"\s+content="([^"]+)"/i);
            if (!titleMatch) titleMatch = articleHtml.match(/<title>([^<]+)<\/title>/i);

            if (titleMatch) {
              title = titleMatch[1].trim();
              title = title.replace(/[\|\-]\s*(조선일보|한겨레|매일경제|한국경제).*$/i, '').trim();
            }

            // 요약 추출
            let summaryMatch = articleHtml.match(/<meta\s+property="og:description"\s+content="([^"]+)"/i);
            if (!summaryMatch) summaryMatch = articleHtml.match(/<meta\s+name="description"\s+content="([^"]+)"/i);

            if (summaryMatch) {
              summary = summaryMatch[1].trim().substring(0, 150);
            }

            // 제목이 없으면 스킵
            if (!title || title.length < 5) {
              console.error(`Invalid title for ${articleUrl}: "${title}"`);
              continue;
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

            console.log(`✓ Extracted: ${title}`);

          } catch (articleError) {
            console.error(`Error processing ${articleUrl}:`, articleError.message);
          }
        }

      } catch (error) {
        console.error(`Error processing ${paper.name}:`, error.message);
      }
    }

    console.log(`Total articles extracted: ${articles.length}`);

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
