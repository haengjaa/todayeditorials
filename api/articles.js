export default async function handler(req, res) {
  try {
    const articles = [];

    // 각 신문사의 실제 사설 기사 링크
    const editorials = [
      {
        paper: 'chosun',
        url: 'https://www.chosun.com/opinion/editorial/2026/09/30/OMECNZU6FNAVRL6TKC6YR4TVGI/'
      },
      {
        paper: 'chosun',
        url: 'https://www.chosun.com/opinion/editorial/2026/09/30/CCL4QUEOYVCXLHEHLTZQHSP25A/'
      },
      {
        paper: 'chosun',
        url: 'https://www.chosun.com/opinion/editorial/2026/09/30/4OX77UHB3ZHGFBVAPYSCANX2KI/'
      },
      {
        paper: 'hani',
        url: 'https://www.hani.co.kr/arti/opinion/editorial/1280051.html'
      },
      {
        paper: 'hani',
        url: 'https://www.hani.co.kr/arti/opinion/editorial/1280046.html'
      },
      {
        paper: 'hani',
        url: 'https://www.hani.co.kr/arti/opinion/editorial/1280036.html'
      },
      {
        paper: 'mk',
        url: 'https://www.mk.co.kr/news/editorial/12163946'
      },
      {
        paper: 'mk',
        url: 'https://www.mk.co.kr/news/editorial/12163944'
      },
      {
        paper: 'hankyung',
        url: 'https://www.hankyung.com/article/2026092928751'
      },
      {
        paper: 'hankyung',
        url: 'https://www.hankyung.com/article/2026092928501'
      },
      {
        paper: 'hankyung',
        url: 'https://www.hankyung.com/article/2026092928491'
      }
    ];

    const PAPERS = {
      chosun: '조선일보',
      hani: '한겨레',
      mk: '매일경제',
      hankyung: '한국경제'
    };

    // 각 링크에서 제목과 내용 추출
    for (let i = 0; i < editorials.length; i++) {
      const editorial = editorials[i];

      try {
        const response = await fetch(editorial.url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        });

        if (!response.ok) continue;

        const html = await response.text();

        let title = '';
        let summary = '';

        // 제목 추출
        let match = html.match(/<h1[^>]*>([^<]+)<\/h1>/i);
        if (!match) match = html.match(/<meta\s+property="og:title"\s+content="([^"]+)"/i);
        if (!match) match = html.match(/<title>([^<]+)<\/title>/i);

        if (match) {
          title = match[1].trim();
          // 신문사명 제거
          title = title.replace(/[\|\-]\s*(조선일보|한겨레|매일경제|한국경제).*$/i, '').trim();
        }

        // 요약/내용 추출
        match = html.match(/<meta\s+property="og:description"\s+content="([^"]+)"/i);
        if (!match) match = html.match(/<meta\s+name="description"\s+content="([^"]+)"/i);

        if (match) {
          summary = match[1].trim().substring(0, 100);
        }

        // 제목이 없으면 스킵
        if (!title || title.length < 5) continue;

        articles.push({
          id: `${editorial.paper}-${i}`,
          p: editorial.paper,
          d: new Date().toISOString().split('T')[0],
          t: title,
          y: '사설',
          s: summary || title.substring(0, 100),
          u: editorial.url
        });

      } catch (error) {
        console.error(`Failed to fetch ${editorial.url}:`, error.message);
      }
    }

    // 신문사별로 최대 3개씩만 유지
    const grouped = {};
    for (const paper of Object.keys(PAPERS)) {
      grouped[paper] = articles.filter(a => a.p === paper).slice(0, 3);
    }

    const finalArticles = Object.values(grouped).flat();

    res.setHeader('Content-Type', 'application/json');
    res.status(200).json({
      articles: finalArticles.length > 0 ? finalArticles : articles
    });

  } catch (error) {
    res.status(500).json({
      error: error.message,
      articles: []
    });
  }
}
