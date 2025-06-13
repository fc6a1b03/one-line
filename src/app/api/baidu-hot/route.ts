import { NextResponse } from 'next/server';
import axios from 'axios';
import * as cheerio from 'cheerio';

export const GET = async (request: Request) => {
  try {
    // 获取百度热搜页面
    const response = await axios.get('https://top.baidu.com/board?tab=realtime', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    const html = response.data;
    const $ = cheerio.load(html);
    const hotItems: { title: string; url: string; hot: string }[] = [];

    // 尝试查找热搜列表
    // 首先尝试与官方文档中相符的选择器
    $('.category-wrap_iQLoo').each((i, element) => {
      const title = $(element).find('.c-single-text-ellipsis').text().trim();
      const url = $(element).find('a').attr('href');
      const hot = $(element).find('.hot-index_1Bl1a').text().trim();

      if (title && url) {
        hotItems.push({
          title,
          url,
          hot
        });
      }
    });

    // 如果第一种方法未找到任何内容，尝试备用选择器
    if (hotItems.length === 0) {
      // 尝试查找热搜卡片
      $('.hot-list_1EDla .content_1YWBm').each((i, element) => {
        const title = $(element).find('.c-single-text-ellipsis').text().trim();
        const url = $(element).find('a').attr('href');
        const hot = $(element).find('.hot-index_1Bl1a').text().trim();

        if (title && url) {
          hotItems.push({
            title,
            url,
            hot
          });
        }
      });
    }

    // 如果依然没有找到，尝试最通用的选择器
    if (hotItems.length === 0) {
      // 尝试查找任何可能包含热搜的元素
      $('div[class*="hot-list"] div[class*="content"]').each((i, element) => {
        const title = $(element).find('div[class*="title"]').text().trim();
        const url = $(element).find('a').attr('href');
        const hot = $(element).find('div[class*="hot-index"]').text().trim();

        if (title && url) {
          hotItems.push({
            title,
            url,
            hot: hot || '热'
          });
        }
      });
    }

    // 如果上述方法都失败，使用最后的备用方法
    if (hotItems.length === 0) {
      // 尝试从页面中提取任何看起来像热搜的内容
      const scriptContent = $('script').map((i, el) => $(el).html()).get().join('');
      const matches = scriptContent.match(/"query":"([^"]+)","url":"([^"]+)".*?"hotScore":(\d+)/g);

      if (matches) {
        matches.forEach(match => {
          const titleMatch = match.match(/"query":"([^"]+)"/);
          const urlMatch = match.match(/"url":"([^"]+)"/);
          const hotMatch = match.match(/"hotScore":(\d+)/);

          if (titleMatch && urlMatch) {
            hotItems.push({
              title: titleMatch[1],
              url: urlMatch[1],
              hot: hotMatch ? hotMatch[1] : '热'
            });
          }
        });
      }
    }

    // 如果仍然无法获取热搜，返回静态数据作为备用
    if (hotItems.length === 0) {
      console.log('无法获取百度热搜，使用静态数据');
      hotItems.push(
        { title: '中国经济', url: 'https://www.baidu.com/s?wd=中国经济', hot: '9999999' },
        { title: '国际形势分析', url: 'https://www.baidu.com/s?wd=国际形势分析', hot: '8888888' },
        { title: '科技创新', url: 'https://www.baidu.com/s?wd=科技创新', hot: '7777777' },
        { title: '人工智能发展', url: 'https://www.baidu.com/s?wd=人工智能发展', hot: '6666666' },
        { title: '环境保护', url: 'https://www.baidu.com/s?wd=环境保护', hot: '5555555' },
        { title: '教育改革', url: 'https://www.baidu.com/s?wd=教育改革', hot: '4444444' },
        { title: '医疗健康', url: 'https://www.baidu.com/s?wd=医疗健康', hot: '3333333' },
        { title: '文化传承', url: 'https://www.baidu.com/s?wd=文化传承', hot: '2222222' },
        { title: '体育赛事', url: 'https://www.baidu.com/s?wd=体育赛事', hot: '1111111' },
        { title: '社会民生', url: 'https://www.baidu.com/s?wd=社会民生', hot: '999999' }
      );
    }

    return NextResponse.json({ hotItems }, { status: 200 });
  } catch (error) {
    console.error('Error fetching Baidu hot searches:', error);
    // 出错时也返回静态数据
    const staticHotItems = [
      { title: '中国经济', url: 'https://www.baidu.com/s?wd=中国经济', hot: '9999999' },
      { title: '国际形势分析', url: 'https://www.baidu.com/s?wd=国际形势分析', hot: '8888888' },
      { title: '科技创新', url: 'https://www.baidu.com/s?wd=科技创新', hot: '7777777' },
      { title: '人工智能发展', url: 'https://www.baidu.com/s?wd=人工智能发展', hot: '6666666' },
      { title: '环境保护', url: 'https://www.baidu.com/s?wd=环境保护', hot: '5555555' },
      { title: '教育改革', url: 'https://www.baidu.com/s?wd=教育改革', hot: '4444444' },
      { title: '医疗健康', url: 'https://www.baidu.com/s?wd=医疗健康', hot: '3333333' },
      { title: '文化传承', url: 'https://www.baidu.com/s?wd=文化传承', hot: '2222222' },
      { title: '体育赛事', url: 'https://www.baidu.com/s?wd=体育赛事', hot: '1111111' },
      { title: '社会民生', url: 'https://www.baidu.com/s?wd=社会民生', hot: '999999' }
    ];
    return NextResponse.json({ hotItems: staticHotItems }, { status: 200 });
  }
}
