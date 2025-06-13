// 测试URL处理逻辑

// 测试数据
const sourceRawList = [
  '新华网（https://www.xinhuanet.com）',
  '腾讯网 (https://news.qq.com)',
  '新闻来源: https://example.com/news/123]',
  'BBC News https://www.bbc.com/news]',
  '央视新闻 (https://news.cctv.com)',
  'https://www.thepaper.cn/newsDetail_forward_12345]',
];

// 模拟api.ts中的URL提取逻辑
function extractUrl(sourceRaw: string): { sourceName: string, sourceUrl: string } {
  let sourceUrl = '';
  let sourceName = sourceRaw;

  // 处理"网站名（URL）"或"网站名(URL)"等格式
  const nameUrlMatch = sourceRaw.match(/^(.+?)[\(（]+(https?:\/\/[^\s\)）]+)[\)）]+/);
  if (nameUrlMatch) {
    sourceName = nameUrlMatch[1].trim();
    const originalUrl = nameUrlMatch[2].trim(); // 保存原始URL
    sourceUrl = originalUrl.replace(/[\)\]]$/, ''); // 清理URL
  } else {
    // 尝试直接提取URL
    const urlMatch = sourceRaw.match(/(https?:\/\/[^\s\)）]+)/);
    if (urlMatch) {
      const originalUrl = urlMatch[1]; // 保存原始URL
      sourceUrl = originalUrl.replace(/[\)\]]$/, ''); // 清理URL

      // 如果URL前有内容，取URL前的内容为sourceName（去除尾部标点）
      const beforeUrl = sourceRaw.split(originalUrl)[0].trim().replace(/[\s:：\-—]+$/, '');
      if (beforeUrl) {
        sourceName = beforeUrl;
      } else {
        // 如果整个来源就是URL，使用域名作为显示文本
        try {
          const url = new URL(sourceUrl);
          sourceName = url.hostname.replace(/^www\./, '');
        } catch (e) {
          sourceName = "查看来源";
        }
      }
    } else {
      // 没有URL，全部作为名称
      sourceName = sourceRaw;
      sourceUrl = "";
    }
  }

  return { sourceName, sourceUrl };
}

// 测试并输出结果
console.log('URL 提取测试结果:');
console.log('-------------------------');
sourceRawList.forEach(sourceRaw => {
  const { sourceName, sourceUrl } = extractUrl(sourceRaw);
  console.log(`原始: "${sourceRaw}"`);
  console.log(`网站名: "${sourceName}"`);
  console.log(`链接: "${sourceUrl}"`);
  console.log('-------------------------');
});
