export default async function handler(req, res) {
  try {
    const articles = [];

    const papers = [
      {
        name: 'chosun',
        title: '조선일보',
        url: 'https://www.chosun.com/opinion/editorial/',
        pattern: /<h2[^>]*class="[^"]*headline[^"]*"[^>]*>([^<]+)<\/h2>/gi,
        linkPattern: /<a[^>]*href="([^"]*editorial[^"]*)"[^>]*>([^<]+)<\/a>/gi
      },
      {
        name: 'hani',
        title: '한겨레',
        url: 'https://www.hani.co.kr/arti/opinion/editorial',
        pattern: /<a[^>]*class="[^"]*headline[^"]*"[^>]*>([^<]+)<\/a>/gi,
        linkPattern: /<a[^>]*href="([^"]*opinion[^"]*)"[^>]*>([^<]+)<\/a>/gi
      },
      {
        name: 'mk',
        title: '매일경제',
        url: 'https://www.mk.co.kr/opinion/editorial',
        pattern: /<h3[^>]*>([^<]+)<\/h3>/gi,
        linkPattern: /<a[^>]*href="([^"]*opinion[^"]*)"[^>]*>([^<]+)<\/a>/gi
      },
      {
        name: 'hankyung',
        title: '한국경제',
        url: 'https://www.hankyung.com/opinion/1158',
        pattern: /<h2[^>]*>([^<]+)<\/h2>/gi,
        linkPattern: /<a[^>]*href="([^"]*opinion[^"]*)"[^>]*>([^<]+)<\/a>/gi
      }
    ];

    for (const paper of papers) {
      try {
        const response = await fetch(paper.url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        });

        if (!response.ok) continue;

        const html = await response.text();

        // 제목 추출
        const titles = [];
        const titleRegex = /<(?:h[2-3]|a)[^>]*>([^<]{10,100})<\/(?:h[2-3]|a)>/gi;
        let match;
        let count = 0;

        while ((match = titleRegex.exec(html)) && count < 3) {
          const title = match[1].trim();
          if (title && title.length > 5 && !titles.includes(title)) {
            titles.push(title);
            count++;
          }
        }

        // 링크 찾기
        const linkRegex = new RegExp(`${paper.url.replace(/\//g, '\\/')}[^\\s"<>]*`, 'gi');

        titles.forEach((title, index) => {
          articles.push({
            id: `${paper.name}-${new Date().toISOString().split('T')[0]}-${index}`,
            p: paper.name,
            d: new Date().toISOString().split('T')[0],
            t: title.replace(/<[^>]+>/g, ''),
            y: '사설',
            s: title.replace(/<[^>]+>/g, '').substring(0, 100),
            u: paper.url
          });
        });
      } catch (error) {
        console.error(`Failed to scrape ${paper.name}:`, error.message);
      }
    }

    if (articles.length === 0) {
      return res.status(500).json({
        error: 'Failed to fetch articles',
        articles: []
      });
    }

    res.status(200).json({ articles });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
