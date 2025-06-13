import { NextResponse } from 'next/server';
import axios from 'axios';

// 减少超时时间以符合Netlify限制
const DEFAULT_TIMEOUT_MS = 45000; // 默认45秒
const MAX_TIMEOUT_MS = 45000; // 最大超时45秒
const MAX_RETRIES = 2; // 最大重试次数

// 搜索引擎列表，用于UI展示和配置
export const AVAILABLE_ENGINES = [
  // 通用搜索引擎
  'google', 'bing', 'brave', 'duckduckgo', 'baidu', 'yandex',
  // 新闻搜索引擎
  'google news', 'bing news', 'baidu news', 'duckduckgo news',
  // 学术搜索引擎
  'google scholar', 'semantic scholar', 'base', 'microsoft academic',
  // 百科类
  'wikipedia', 'wikidata',
  // 社交媒体
  'reddit', 'twitter', 'youtube',
];

// 错误类型的详细描述
const ERROR_DESCRIPTIONS: Record<string, string> = {
  ECONNABORTED: '请求超时，服务器响应时间过长',
  ECONNREFUSED: '无法连接到搜索服务器，服务可能不可用',
  ENOTFOUND: '找不到搜索服务器，请检查URL是否正确',
  ETIMEDOUT: '连接超时，请检查网络连接和服务器状态',
  'Network Error': '网络错误，请检查您的网络连接和SearXNG服务器状态',
  '404': '找不到搜索服务，请检查URL是否正确',
  '500': '搜索服务器内部错误',
  '502': '搜索服务器网关错误',
  '503': '搜索服务暂时不可用'
};

export async function POST(request: Request) {
  try {
    // 从请求体中获取查询和SearXNG配置
    const requestData = await request.json();
    const { query, searxngUrl } = requestData;

    // 如果没有提供SearXNG URL或查询，返回错误
    if (!searxngUrl || !query) {
      return NextResponse.json(
        { error: 'SearXNG URL or query not provided' },
        { status: 400 }
      );
    }

    // 从请求中获取超时设置，但确保在合理范围内
    const requestTimeout = requestData.timeout || DEFAULT_TIMEOUT_MS;
    const timeout = Math.min(Math.max(requestTimeout, 1000), MAX_TIMEOUT_MS);

    // 确保URL格式正确，并规范化URL
    let searchUrl = searxngUrl;
    if (!searchUrl.startsWith('http://') && !searchUrl.startsWith('https://')) {
      searchUrl = `https://${searchUrl}`;
    }
    // 确保URL末尾没有多余的斜杠
    searchUrl = searchUrl.replace(/\/+$/, '');
    // 拼接搜索路径
    searchUrl += '/search';

    // 构建请求参数
    const params: Record<string, any> = {
      q: query,
      format: 'json',
      categories: requestData.categories || 'general',
      language: requestData.language || 'zh',
      time_range: requestData.timeRange || 'year', // 默认搜索最近一年的内容
      // 如果明确提供了引擎，则使用；否则传null让SearXNG自动选择
      engines: requestData.engines || null,
      num_results: requestData.numResults || 10, // 默认返回10条结果
    };

    // 添加安全搜索参数，如果提供
    if (requestData.safesearch !== undefined) {
      params.safesearch = requestData.safesearch;
    }

    // 是否显示详细错误信息
    if (requestData.display_error === true) {
      params.display_error = true;
    }

    // 添加源自URL支持
    if (requestData.source_from_url) {
      params.source_from_url = requestData.source_from_url;
    }

    console.log(`搜索请求: "${query}" 发送到 ${searchUrl}，超时: ${timeout}ms, 参数:`, params);

    // 实现重试逻辑
    let lastError;
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        // 发送请求到SearXNG，使用设置的超时时间
        const response = await axios.get(searchUrl, {
          params,
          timeout: timeout,
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'Mozilla/5.0 (OneLine/1.0; +https://github.com/chengtx809/OneLine)'
          }
        });

        // 检查返回的数据是否符合预期格式
        const data = response.data;
        if (!data || typeof data !== 'object') {
          console.error('SearXNG返回的数据格式不正确', data);
          return NextResponse.json(
            { error: 'Invalid response format from SearXNG', rawData: typeof data },
            { status: 500 }
          );
        }

        // 确保结果字段存在且是数组
        if (!Array.isArray(data.results)) {
          console.warn('SearXNG返回的结果不是数组，尝试适配', data);

          // 尝试适配响应格式
          const adaptedData = {
            query: query,
            results: Array.isArray(data) ? data : [],
            number_of_results: 0,
            search_url: searchUrl, // 添加搜索URL，便于调试
            params: params // 添加使用的参数，便于调试
          };

          if (adaptedData.results.length > 0) {
            adaptedData.number_of_results = adaptedData.results.length;
            return NextResponse.json(adaptedData);
          } else {
            // 检查是否有其他可用数据，例如answers或suggestions
            if (data.answers && data.answers.length > 0) {
              adaptedData.results = data.answers.map((answer: string) => ({
                title: `${answer}`,
                content: answer,
                url: searchUrl,
                engine: 'searxng_answers'
              }));
              adaptedData.number_of_results = adaptedData.results.length;
              return NextResponse.json(adaptedData);
            }

            if (data.suggestions && data.suggestions.length > 0) {
              adaptedData.results = data.suggestions.map((suggestion: string) => ({
                title: `建议搜索: ${suggestion}`,
                content: `您可能想搜索: ${suggestion}`,
                url: `${searchUrl}?q=${encodeURIComponent(suggestion)}`,
                engine: 'searxng_suggestions'
              }));
              adaptedData.number_of_results = adaptedData.results.length;
              return NextResponse.json(adaptedData);
            }

            return NextResponse.json(
              {
                query: query,
                results: [],
                number_of_results: 0,
                message: 'No results found in SearXNG response',
                search_url: searchUrl,
                params: params
              },
              { status: 200 } // 返回200以允许继续处理
            );
          }
        }

        // 返回搜索结果，添加一些元数据
        return NextResponse.json({
          ...response.data,
          query: query, // 确保查询词被包含在响应中
          search_url: searchUrl, // 添加搜索URL，便于调试
          params: params // 添加使用的参数，便于调试
        });
      } catch (error: any) {
        console.error(`SearXNG API request failed (attempt ${attempt + 1}/${MAX_RETRIES + 1}):`, error.message);
        lastError = error;

        // 如果已经是最后一次尝试，则不再重试
        if (attempt === MAX_RETRIES) {
          break;
        }

        // 等待一段时间后重试
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    // 所有重试均失败，处理最终错误
    console.error(`SearXNG API route error for query "${lastError?.config?.params?.q || 'unknown'}":`, lastError?.message);

    // 提供更详细的错误信息和解决建议
    const errorCode = lastError?.code || (lastError?.response ? `${lastError.response.status}` : 'unknown');
    const errorDescription = ERROR_DESCRIPTIONS[errorCode] || 'Unknown error occurred';

    // 构建错误信息
    const errorDetails = {
      error: 'SearXNG search request failed after multiple attempts',
      error_code: errorCode,
      error_description: errorDescription,
      message: lastError?.message,
      query: lastError?.config?.params?.q || 'unknown',
      search_url: lastError?.config?.url,
      params: lastError?.config?.params
    };

    // 如果有响应数据，添加到错误中
    if (lastError?.response) {
      errorDetails.status = lastError.response.status;
      errorDetails.statusText = lastError.response.statusText;
      errorDetails.data = lastError.response.data;
    } else if (lastError?.code === 'ECONNABORTED') {
      // 请求超时，返回更具体的错误信息，但仍使用200状态码以允许继续处理
      console.warn(`搜索请求 "${lastError.config?.params?.q || 'unknown'}" 超时，超时设置为 ${lastError.config?.timeout || DEFAULT_TIMEOUT_MS}ms`);
      return NextResponse.json(
        {
          query: lastError.config?.params?.q || 'unknown',
          results: [],
          number_of_results: 0,
          message: `Search request timed out after ${lastError.config?.timeout || DEFAULT_TIMEOUT_MS}ms`,
          error_code: 'ECONNABORTED',
          error_description: ERROR_DESCRIPTIONS['ECONNABORTED'] || '请求超时',
          search_url: lastError.config?.url,
          params: lastError.config?.params
        },
        { status: 200 } // 返回200以允许继续处理
      );
    } else if (lastError?.request) {
      // 请求已发出但没有收到响应
      errorDetails.request = 'Request was made but no response was received';
      errorDetails.timeout = lastError.code === 'ECONNABORTED';
    }

    // 返回错误响应，但使用200状态码以便客户端不中断处理
    return NextResponse.json(
      {
        ...errorDetails,
        results: [],
        number_of_results: 0
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Search API route general error:', error);

    // 返回通用错误
    return NextResponse.json(
      {
        error: 'Search API request processing failed',
        message: error.message,
        results: [],
        number_of_results: 0
      },
      { status: 200 } // 使用200状态码以便客户端继续处理
    );
  }
}
