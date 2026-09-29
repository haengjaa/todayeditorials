export default async function handler(req, res) {
  try {
    const articles = [];

    // 각 신문사의 최신 기사 페이지에서 직접 가져오기
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

    for (const paper of papers) {
      try {
        const response = await fetch(paper.url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
          }
        });

        if (!response.ok) continue;

        const html = await response.text();

        // 더 정확한 제목 추출 - a 태그의 title 속성이나 text 활용
        const titleMatches = [];

        // 패턴 1: <a> 태그에서 텍스트 추출 (길이 10-150)
        const linkRegex = /<a[^>]*href="[^"]*(?:opinion|editorial)[^"]*"[^>]*>([^<]{10,150})<\/a>/gi;
        let match;

        while ((match = linkRegex.exec(html)) && titleMatches.length < 3) {
          const title = match[1].trim();

          // 광고, 메뉴 같은 단어 제외
          if (!title.includes('구독') &&
              !title.includes('메뉴') &&
              !title.includes('검색') &&
              !title.includes('로그인') &&
              !title.includes('회원') &&
              title.length > 5) {
            titleMatches.push(title);
          }
        }

        // 패턴 2: h1, h2, h3 태그 추출
        if (titleMatches.length < 3) {
          const headingRegex = /<h[123][^>]*>([^<]{8,150})<\/h[123]>/gi;
          while ((match = headingRegex.exec(html)) && titleMatches.length < 3) {
            const title = match[1].trim().replace(/<[^>]*>/g, '');
            if (title && !titleMatches.includes(title) && title.length > 5) {
              titleMatches.push(title);
            }
          }
        }

        // 아티클 생성
        titleMatches.forEach((title, index) => {
          const cleanTitle = title.replace(/<[^>]*>/g, '').trim();
          if (cleanTitle) {
            articles.push({
              id: `${paper.name}-${new Date().toISOString().split('T')[0]}-${index}`,
              p: paper.name,
              d: new Date().toISOString().split('T')[0],
              t: cleanTitle,
              y: '사설',
              s: cleanTitle.substring(0, 100),
              u: paper.url
            });
          }
        });

      } catch (error) {
        console.error(`Failed to scrape ${paper.name}:`, error.message);
      }
    }

    // 데이터가 없으면 기본값 반환
    if (articles.length === 0) {
      articles.push({
        id: 'empty-1',
        p: 'chosun',
        d: new Date().toISOString().split('T')[0],
        t: '뉴스를 로드하는 중입니다. 잠시 후 다시 시도해주세요.',
        y: '안내',
        s: '네트워크 상태를 확인해주세요.',
        u: 'https://www.chosun.com'
      });
    }

    res.setHeader('Content-Type', 'application/json');
    res.status(200).json({ articles });
  } catch (error) {
    res.status(500).json({
      error: error.message,
      articles: []
    });
  }
}
