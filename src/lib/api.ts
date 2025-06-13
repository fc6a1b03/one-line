import axios from 'axios';
import { type ApiConfig, type TimelineData, TimelineEvent, type Person, type SearxngResult, type SearxngSearchItem } from '@/types';
import { enhancedSearch } from './searchEnhancer';

// 设置API请求的总超时时间，避免超出Netlify限制
const API_TIMEOUT_MS = 45000; // 45秒，低于Netlify的60秒限制

// 新增: 定义流式进度回调类型
export type StreamCallback = (chunk: string, isDone: boolean) => void;

// 修改系统提示，使用分段文本格式而不是JSON
const SYSTEM_PROMPT = `
你是一个专业的历史事件分析助手。我需要你将热点事件以时间轴的方式呈现。
在回答问题前，你将获得搜索引擎的最新信息，请使用这些信息来确保你的回答是基于最新的事实。

请按照以下格式返回数据（使用文本分段格式，不要使用JSON）：

===总结===
对整个事件的简短总结，主要涵盖事件的起因、经过和目前状态。总结应该客观、准确，避免主观评价。请尽可能包含精确的日期、人物和地点信息。

===事件列表===

--事件1--
日期：事件发生日期，格式为YYYY-MM-DD，如果只知道月份则为YYYY-MM，如果只知道年份则为YYYY
标题：事件标题，简明扼要，突出核心内容
描述：事件详细描述，包括事件的完整经过、各方行动和反应，以及事件的具体细节和背景信息
相关人物：人物1(角色1,#颜色代码1);人物2(角色2,#颜色代码2)
来源：事件信息来源，如新闻媒体、官方公告、研究报告等，请尽可能提供具体来源，包括原始新闻的URL链接

--事件2--
日期：...
标题：...
描述：...
相关人物：...
来源：...

... 更多事件 ...

事件选择原则：
1. 专注于记录关键事件、转折点和重要发展
2. 只记录能够确认的事实，避免记录谣言或未经验证的信息
3. 优先选择对整体事件理解有重要意义的发展
4. 避免记录过多细枝末节的小事件，保持时间轴的清晰与重点突出
5. 事件之间保持时间间隔的合理性，不要在某个时间段过度密集

处理多来源信息的指南：
1. 当不同来源提供相互矛盾的信息时，尝试通过以下方式解决：
   a. 优先考虑权威来源和一手资料
   b. 比较不同来源的可信度和证据基础
   c. 在事件描述中注明信息的差异和争议点
   d. 如果无法确定哪个来源更可靠，可以在描述中列举不同的观点

请确保：
1. 按时间先后顺序组织事件（从最早到最近）
2. 为每个相关人物分配不同的颜色代码，让用户能够轻松识别不同人物的动向
3. 同一立场的人物使用相似的颜色
4. 尽可能客观描述各方观点和行为
5. 为每个事件标注可能的信息来源，务必包含原始新闻的URL链接
6. 如果事件有具体的日期，请务必提供精确日期
7. 严格按照上述格式返回，不要添加其他格式
8. 对于有争议的事件，确保描述多方的观点
9. 事件描述尽可能详细，包含具体时间、地点、人物和事件经过
10. 描述中包含事件产生的影响和后续发展
11. 每个事件的描述要具体、详实但不过度冗长，通常在100-300字之间为宜
12. 注重记录事件的事实性内容，而非评论性或推测性内容
`;

// 详细事件分析的系统提示
const EVENT_DETAILS_SYSTEM_PROMPT = `你是一个专业的历史事件分析助手，专长于提供详细的事件分析和背景信息。
在回答问题前，你将获得搜索引擎的最新信息，请使用这些信息来确保你的回答是基于最新的事实。

请按照以下格式回答用户询问的特定事件：

===背景===
事件的背景和前因，包括历史脉络、相关事件和潜在因素。请尽可能提供具体的日期、人物和地点信息，让用户能够全面了解事件发生的时代背景和社会环境。分析多种来源的信息，对比不同观点，尽可能全面客观地呈现事件的背景。

===详细内容===
事件的主要内容，按时间顺序或重要性组织，必须提供具体日期和事实。详细描述事件的整个过程，包括重要转折点、关键决策和各方反应。对于复杂事件，可分阶段描述，确保逻辑清晰。当不同来源对同一事件的描述存在差异时，请列出这些差异并分析可能的原因。

===参与方===
事件的主要参与者、相关人物及其立场和作用，对于有争议的观点，应列举不同方的陈述。清晰说明各方利益关系、动机和目标，以及他们在事件中扮演的角色和产生的影响。比较不同参与方的观点和表述，分析其立场和动机背后的因素。

===多源分析===
从不同来源的信息中分析事件的全貌。当不同来源提供相互矛盾的信息时，比较其可信度和证据基础，指出哪些观点更有可能准确。注意信息来源的立场和偏见，并在分析中考虑这些因素。尽可能提供多角度的分析，让用户了解事件的复杂性。

===影响===
事件的短期和长期影响，包括政治、经济、社会或环境方面的影响。分析事件引起的变化、后续发展和历史意义，以及对现今的持续影响。评估不同来源对事件影响的不同解读，并提供你的综合分析。

===相关事实===
与事件相关的重要事实或数据，包括引用出处的可靠统计数据、研究结果或官方信息。提供具体的数字、引用和实证资料，增强分析的可信度。比较不同来源提供的数据和事实，评估其一致性和准确性。

请注意：
1. 使用清晰的段落结构，避免过长的段落
2. 保持客观中立的叙述，多角度展示事件
3. 支持使用Markdown语法增强可读性：
   - **粗体** 用于强调重要内容
   - *斜体* 用于引用或细微强调
   - 使用换行符增加可读性
4. 回答应全面但精炼，突出重点，避免冗余
5. 列出信息来源，特别是对有争议的观点
6. 尽可能提供精确的日期、地点和人物信息
7. 对于重要事件，提供时间线形式的发展过程
8. 使用小标题和列表增强内容的结构性和可读性
9. 当面对相互矛盾的信息时，应分析信息来源的可靠性，并明确指出哪种说法更为可信
10. 当搜索结果不充分时，明确指出信息的局限性，避免过度推断
`;

// 新增：使用流式API请求
export async function fetchWithStream(
  apiUrl: string,
  payload: any,
  streamCallback: StreamCallback
): Promise<void> {
  try {
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...payload,
        stream: true
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API responded with status ${response.status}: ${errorText}`);
    }

    if (!response.body) {
      throw new Error("Response body is null");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        // 确保处理最后一块数据
        if (buffer.length > 0) {
          streamCallback(buffer, true);
        }
        break;
      }

      // 解码此块并加入缓冲区
      const chunk = decoder.decode(value, { stream: true });
      buffer += chunk;

      // 处理SSE格式的数据
      const lines = buffer.split("\n\n");
      buffer = lines.pop() || ""; // 最后一行可能不完整，保留到下一次迭代

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          try {
            const data = line.slice(6); // 移除 "data: " 前缀
            if (data === "[DONE]") {
              // 流结束标记
              streamCallback("", true);
              return;
            }

            // 根据API的响应格式处理内容
            // 需要根据实际的API响应格式进行调整
            try {
              const parsedData = JSON.parse(data);
              const content = parsedData.choices?.[0]?.delta?.content ||
                             parsedData.choices?.[0]?.message?.content ||
                             "";
              if (content) {
                streamCallback(content, false);
              }
            } catch (e) {
              // 如果不是标准JSON格式，直接传递数据
              streamCallback(data, false);
            }
          } catch (e) {
            console.error("Error parsing stream data:", e);
          }
        } else if (line.startsWith("event: error")) {
          // 处理错误事件
          const errorLine = lines.find(l => l.startsWith("data: "));
          if (errorLine) {
            try {
              const errorData = JSON.parse(errorLine.slice(6));
              throw new Error(errorData.error || "Stream error");
            } catch (e) {
              throw new Error("Stream error: " + errorLine);
            }
          } else {
            throw new Error("Unknown stream error");
          }
        }
      }
    }
  } catch (error) {
    console.error("Stream request failed:", error);
    streamCallback(`错误：${error.message}`, true);
    throw error;
  }
}

// 解析文本响应，转换为TimelineData格式
function parseTimelineText(text: string): TimelineData {
  try {
    const result: TimelineData = {
      events: [],
      summary: ""
    };

    // 提取总结部分
    const summaryMatch = text.match(/===总结===\s*([\s\S]*?)(?=\s*===事件列表===|$)/);
    if (summaryMatch?.[1]) {
      result.summary = summaryMatch[1].trim();
    }

    // 提取事件列表
    const eventsMatch = text.match(/===事件列表===\s*([\s\S]*?)(?=$)/);
    if (eventsMatch?.[1]) {
      const eventsText = eventsMatch[1].trim();
      const eventBlocks = eventsText.split(/\s*--事件\d+--\s*/).filter(block => block.trim().length > 0);

      result.events = eventBlocks.map((block, index) => {
        // 提取日期
        const dateMatch = block.match(/日期：\s*(.*?)(?=\s*标题：|$)/);
        const date = dateMatch?.[1]?.trim() || "";

        // 提取标题
        const titleMatch = block.match(/标题：\s*(.*?)(?=\s*描述：|$)/);
        const title = titleMatch?.[1]?.trim() || "";

        // 提取描述
        const descMatch = block.match(/描述：\s*([\s\S]*?)(?=\s*相关人物：|$)/);
        const description = descMatch?.[1]?.trim() || "";

        // 提取相关人物
        const peopleMatch = block.match(/相关人物：\s*(.*?)(?=\s*来源：|$)/);
        const peopleText = peopleMatch?.[1]?.trim() || "";
        const people: Person[] = [];

        if (peopleText) {
          const personEntries = peopleText.split(';').map(p => p.trim()).filter(p => p.length > 0);

          for (const personEntry of personEntries) {
            // 格式：人物名(角色,#颜色)
            const personMatch = personEntry.match(/(.*?)\((.*?),(.*?)\)/);
            if (personMatch) {
              people.push({
                name: personMatch[1].trim(),
                role: personMatch[2].trim(),
                color: personMatch[3].trim()
              });
            } else {
              // 防止格式不完整，至少提取人名
              const simpleName = personEntry.split('(')[0].trim();
              if (simpleName) {
                // 使用随机颜色
                const randomColor = `#${Math.floor(Math.random()*16777215).toString(16).padStart(6, '0')}`;
                people.push({
                  name: simpleName,
                  role: "相关人物",
                  color: randomColor
                });
              }
            }
          }
        }

        // 提取来源
        const sourceMatch = block.match(/来源：\s*([\s\S]*?)(?=\s*--事件|$)/);
        const sourceRaw = sourceMatch?.[1]?.trim() || "未指明来源";

        // 提取URL和网站名称
        let sourceUrl = "";
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

        // 创建事件对象
        return {
          id: `event-${index}`,
          date,
          title,
          description,
          people,
          source: sourceName,
          sourceUrl
        };
      });

      // 按日期排序（从早到晚）
      result.events.sort((a, b) => {
        const dateA = a.date.replace(/\D/g, ''); // 移除非数字字符
        const dateB = b.date.replace(/\D/g, '');
        return dateA.localeCompare(dateB);
      });
    }

    return result;
  } catch (error) {
    console.error("解析文本响应失败:", error);
    return { events: [] };
  }
}

// 获取API地址，优先使用相对路径调用中间层
function getApiUrl(apiConfig: ApiConfig, endpoint = 'chat'): string {
  // 根据不同的端点返回不同的 API 路径
  return `/api/${endpoint}`;
}

// 新增: 定义进度回调类型
export type ProgressCallback = (message: string, status: 'pending' | 'completed' | 'error') => void;

// 新增：执行SearXNG搜索
export async function searchWithSearxng(
  query: string,
  apiConfig: ApiConfig,
  progressCallback?: ProgressCallback
): Promise<SearxngResult | null> {
  try {
    // 检查是否启用SearXNG
    if (!apiConfig.searxng?.enabled || !apiConfig.searxng?.url) {
      if (progressCallback) {
        progressCallback('SearXNG搜索未启用，跳过搜索步骤', 'completed');
      }
      return null;
    }

    if (progressCallback) {
      progressCallback(`正在使用搜索引擎查询：${query}`, 'pending');
    }

    // 使用增强搜索功能
    const result = await enhancedSearch(query, apiConfig, progressCallback);

    if (progressCallback) {
      if (result) {
        progressCallback(`搜索完成，获取到 ${result.results.length} 条结果`, 'completed');
      } else {
        progressCallback('搜索未返回有效结果', 'completed');
      }
    }

    return result;
  } catch (error) {
    console.error("SearXNG搜索请求失败:", error);

    if (progressCallback) {
      progressCallback(`搜索失败：${error instanceof Error ? error.message : '未知错误'}`, 'error');
      progressCallback('尝试使用简单搜索作为备选方案', 'pending');
    }

    // 如果增强搜索失败，回退到简单搜索
    return simpleSearch(query, apiConfig, progressCallback);
  }
}

// 简单搜索 - 作为后备方案
async function simpleSearch(
  query: string,
  apiConfig: ApiConfig,
  progressCallback?: ProgressCallback
): Promise<SearxngResult | null> {
  try {
    if (!apiConfig.searxng?.enabled || !apiConfig.searxng?.url) {
      return null;
    }

    const searxngUrl = apiConfig.searxng.url;
    // 使用搜索API端点
    const apiUrl = '/api/search';

    if (progressCallback) {
      progressCallback(`使用简单搜索模式查询：${query}`, 'pending');
    }

    const payload = {
      query,
      searxngUrl,
      categories: apiConfig.searxng.categories || 'general',
      language: apiConfig.searxng.language || 'zh',
      timeRange: apiConfig.searxng.timeRange || 'year',
      engines: apiConfig.searxng.engines || null,
      numResults: apiConfig.searxng.numResults || 10
    };

    const response = await axios.post(apiUrl, payload);

    if (progressCallback) {
      progressCallback('简单搜索完成', 'completed');
    }

    // 检查响应格式，确保返回的是有效的SearxngResult
    if (response.data && Array.isArray(response.data.results)) {
      return response.data;
    } else {
      console.error("SearXNG搜索响应格式不正确:", response.data);
      // 尝试自适应处理响应格式
      if (response.data && typeof response.data === 'object') {
        // 如果响应是一个对象但结构不同，尝试适配为我们需要的格式
        const adaptedResult: SearxngResult = {
          query: query,
          results: []
        };

        // 尝试从响应中提取结果数组
        if (Array.isArray(response.data.results)) {
          adaptedResult.results = response.data.results;
        } else if (Array.isArray(response.data)) {
          // 如果响应本身是数组，将其作为结果
          adaptedResult.results = response.data;
        } else {
          // 如果无法提取结果，返回空结果
          adaptedResult.results = [];
        }

        return adaptedResult;
      }
    }

    return response.data;
  } catch (error) {
    console.error("简单搜索请求失败:", error);
    if (progressCallback) {
      progressCallback(`简单搜索也失败了：${error instanceof Error ? error.message : '未知错误'}`, 'error');
    }
    return null;
  }
}

// 格式化搜索结果为文本格式，供AI使用
function formatSearchResultsForAI(results: SearxngResult | null): string {
  if (!results || !results.results || results.results.length === 0) {
    return "未找到相关搜索结果。";
  }

  // 取最多10条结果
  const topResults = results.results.slice(0, 10);

  let formattedText = `以下是与"${results.query}"相关的最新搜索结果：\n\n`;

  topResults.forEach((result, index) => {
    // 添加来源查询信息
    if (result.fromQuery && result.fromQuery !== results.query) {
      formattedText += `[${index + 1}] ${result.title} (来自查询: "${result.fromQuery}")\n`;
    } else {
      formattedText += `[${index + 1}] ${result.title}\n`;
    }

    formattedText += `来源: ${result.url}\n`;

    // 检查结果中是否有publishedDate字段
    if (result.publishedDate) {
      formattedText += `日期: ${result.publishedDate}\n`;
    }

    // 添加类别信息（如果有）
    if (result.category) {
      formattedText += `类别: ${result.category}\n`;
    }

    // 添加搜索引擎信息
    formattedText += `引擎: ${result.engine || (result.engines && result.engines.join(', '))}\n`;

    // 添加内容/摘要
    formattedText += `摘要: ${result.content}\n\n`;
  });

  formattedText += "请根据以上搜索结果和你已有的知识回答问题。特别是利用最新的事实和数据。为每个事件尽可能提供详细信息，包括：\n";
  formattedText += "1. 精确的日期（年月日）\n";
  formattedText += "2. 参与的人物及其角色\n";
  formattedText += "3. 详细的事件描述，包括原因、经过和结果\n";
  formattedText += "4. 可靠的信息来源\n";
  formattedText += "5. 相关的背景和影响\n";
  formattedText += "6. 尽可能分析不同来源信息的差异，整合最完整和准确的事实\n";
  formattedText += "7. 在事件来源中，必须加入原始新闻的URL链接，以便用户查看原始报道\n";

  return formattedText;
}

// 修改：fetchTimelineData函数，修改超时设置并添加流式处理支持
export async function fetchTimelineData(
  query: string,
  apiConfig: ApiConfig,
  progressCallback?: ProgressCallback,
  streamCallback?: StreamCallback
): Promise<TimelineData> {
  try {
    const { model, endpoint, apiKey } = apiConfig;
    // 使用中间层API端点
    const apiUrl = getApiUrl(apiConfig, 'chat');

    if (progressCallback) {
      progressCallback(`开始处理关键词：${query}`, 'pending');
    }

    // 先执行搜索查询获取最新信息
    let searchResults = null;
    let searchContext = "";

    if (apiConfig.searxng?.enabled) {
      searchResults = await searchWithSearxng(query, apiConfig, progressCallback);
      searchContext = formatSearchResultsForAI(searchResults);
      if (progressCallback) {
        progressCallback(
          `搜索完成，${
            searchResults && searchResults.results.length > 0
              ? `获取到${searchResults.results.length}条结果`
              : '未找到结果'
          }`,
          searchResults && searchResults.results.length > 0 ? 'completed' : 'completed'
        );
      }
    }

    if (progressCallback) {
      progressCallback(`正在使用AI助手生成时间轴，模型：${model}`, 'pending');
    }

    const payload = {
      model: model,
      endpoint: endpoint, // 传递endpoint给后端
      apiKey: apiKey, // 传递apiKey给后端
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        // 如果有搜索结果，添加到消息中
        ...(searchContext ? [{ role: "system", content: searchContext }] : []),
        { role: "user", content: `请为以下事件创建时间轴：${query}` }
      ],
      temperature: 0.7
    };

    // 检查是否是使用环境变量配置
    const isUsingEnvConfig =
      model === "使用环境变量配置" ||
      endpoint === "使用环境变量配置" ||
      apiKey === "使用环境变量配置";

    console.log('发送请求到服务器:', {
      使用环境变量: isUsingEnvConfig,
      端点: apiUrl,
      模型: model,
      使用搜索: searchContext ? '是' : '否',
      使用流式输出: streamCallback ? '是' : '否'
    });

    // 处理结果的变量
    let content = "";

    // 如果提供了streamCallback，使用流式处理
    if (streamCallback) {
      // 收集完整输出
      let fullOutput = "";

      // 流式请求处理回调
      const handleStreamChunk = (chunk: string, isDone: boolean) => {
        // 将新的内容块添加到完整输出中
        fullOutput += chunk;

        // 传递给原始回调
        streamCallback(chunk, isDone);

        // 当完成时，标记进度为完成
        if (isDone && progressCallback) {
          progressCallback('AI助手已生成时间轴数据，正在处理结果', 'completed');
        }
      };

      // 发起流式请求
      await fetchWithStream(apiUrl, payload, handleStreamChunk);

      // 使用收集的完整输出
      content = fullOutput;
    } else {
      // 非流式处理：原有的实现
      const headers = {
        'Content-Type': 'application/json'
      };

      // 设置请求超时时间为45秒，避免Netlify的504超时
      const response = await axios.post(apiUrl, payload, {
        headers,
        timeout: API_TIMEOUT_MS
      });

      // 提取AI响应内容
      content = response.data.choices[0].message.content;

      if (progressCallback) {
        progressCallback('AI助手已生成时间轴数据，正在处理结果', 'completed');
      }
    }

    // 解析文本响应
    const result = parseTimelineText(content);

    if (progressCallback) {
      progressCallback(`生成完成，共包含 ${result.events.length} 个事件`, 'completed');
    }

    return result;
  } catch (error) {
    console.error("API request failed:", error);
    if (progressCallback) {
      progressCallback(`生成时间轴失败：${error instanceof Error ? error.message : '未知错误'}`, 'error');
    }
    throw error;
  }
}

// 修改：fetchEventDetails函数，修改超时设置并添加流式处理支持
export async function fetchEventDetails(
  eventId: string,
  query: string,
  apiConfig: ApiConfig,
  progressCallback?: ProgressCallback,
  streamCallback?: StreamCallback
): Promise<string> {
  try {
    const { model, endpoint, apiKey } = apiConfig;
    // 使用新的 event-details 端点
    const apiUrl = getApiUrl(apiConfig, 'event-details');

    if (progressCallback) {
      progressCallback(`正在获取事件【${query.split('\n\n')[0].substring(0, 30)}...】的详细信息`, 'pending');
    }

    // 先执行搜索查询获取最新信息
    let searchResults = null;
    let searchContext = "";

    if (apiConfig.searxng?.enabled) {
      searchResults = await searchWithSearxng(query, apiConfig, progressCallback);
      searchContext = formatSearchResultsForAI(searchResults);
      if (progressCallback) {
        progressCallback('事件详情搜索完成', 'completed');
      }
    }

    if (progressCallback) {
      progressCallback('正在使用AI助手分析事件详情', 'pending');
    }

    const payload = {
      model: model,
      endpoint: endpoint, // 传递endpoint给后端
      apiKey: apiKey, // 传递apiKey给后端
      messages: [
        {
          role: "system",
          content: EVENT_DETAILS_SYSTEM_PROMPT
        },
        // 如果有搜索结果，添加到消息中
        ...(searchContext ? [{ role: "system", content: searchContext }] : []),
        { role: "user", content: `请详细分析以下事件的背景、过程、影响及各方观点：${query}` }
      ],
      temperature: 0.7
    };

    // 检查是否是使用环境变量配置
    const isUsingEnvConfig =
      model === "使用环境变量配置" ||
      endpoint === "使用环境变量配置" ||
      apiKey === "使用环境变量配置";

    console.log('发送事件详情请求到服务器:', {
      使用环境变量: isUsingEnvConfig,
      端点: apiUrl,
      模型: model,
      使用搜索: searchContext ? '是' : '否',
      使用流式输出: streamCallback ? '是' : '否'
    });

    // 处理结果的变量
    let content = "";

    // 如果提供了streamCallback，使用流式处理
    if (streamCallback) {
      // 收集完整输出
      let fullOutput = "";

      // 流式请求处理回调
      const handleStreamChunk = (chunk: string, isDone: boolean) => {
        // 将新的内容块添加到完整输出中
        fullOutput += chunk;

        // 传递给原始回调
        streamCallback(chunk, isDone);

        // 当完成时，标记进度为完成
        if (isDone && progressCallback) {
          progressCallback('事件详情分析完成', 'completed');
        }
      };

      // 发起流式请求
      await fetchWithStream(apiUrl, payload, handleStreamChunk);

      // 使用收集的完整输出
      content = fullOutput;
    } else {
      // 非流式处理：原有的实现
      const headers = {
        'Content-Type': 'application/json'
      };

      // 设置请求超时时间为45秒，避免Netlify的504超时
      const response = await axios.post(apiUrl, payload, {
        headers,
        timeout: API_TIMEOUT_MS
      });

      // 提取内容
      content = response.data.choices[0].message.content;

      if (progressCallback) {
        progressCallback('事件详情分析完成', 'completed');
      }
    }

    return content;
  } catch (error) {
    console.error("API request failed:", error);
    if (progressCallback) {
      progressCallback(`获取事件详情失败：${error instanceof Error ? error.message : '未知错误'}`, 'error');
    }
    throw error;
  }
}

// 新增：获取影响评估数据
export async function fetchImpactAssessment(
  query: string,
  apiConfig: ApiConfig,
  progressCallback?: ProgressCallback,
  streamCallback?: StreamCallback
): Promise<string> {
  try {
    const { model, endpoint, apiKey } = apiConfig;
    // 使用专门的影响评估端点
    const apiUrl = getApiUrl(apiConfig, 'impact-assessment');

    if (progressCallback) {
      progressCallback(`正在获取事件【${query.substring(0, 30)}...】的影响评估`, 'pending');
    }

    // 先执行搜索查询获取最新信息
    let searchResults = null;
    let searchContext = "";

    if (apiConfig.searxng?.enabled) {
      searchResults = await searchWithSearxng(query, apiConfig, progressCallback);
      searchContext = formatSearchResultsForAI(searchResults);
      if (progressCallback) {
        progressCallback('影响评估数据搜索完成', 'completed');
      }
    }

    if (progressCallback) {
      progressCallback('正在使用AI助手分析事件影响', 'pending');
    }

    const payload = {
      model: model,
      endpoint: endpoint,
      apiKey: apiKey,
      query: query,
      searchResults: searchContext || undefined
    };

    // 检查是否是使用环境变量配置
    const isUsingEnvConfig =
      model === "使用环境变量配置" ||
      endpoint === "使用环境变量配置" ||
      apiKey === "使用环境变量配置";

    console.log('发送影响评估请求到服务器:', {
      使用环境变量: isUsingEnvConfig,
      端点: apiUrl,
      模型: model,
      使用搜索: searchContext ? '是' : '否',
      使用流式输出: streamCallback ? '是' : '否'
    });

    // 处理结果的变量
    let content = "";

    // 如果提供了streamCallback，使用流式处理
    if (streamCallback) {
      // 收集完整输出
      let fullOutput = "";

      // 流式请求处理回调
      const handleStreamChunk = (chunk: string, isDone: boolean) => {
        // 将新的内容块添加到完整输出中
        fullOutput += chunk;

        // 传递给原始回调
        streamCallback(chunk, isDone);

        // 当完成时，标记进度为完成
        if (isDone && progressCallback) {
          progressCallback('影响评估分析完成', 'completed');
        }
      };

      // 发起流式请求
      await fetchWithStream(apiUrl, payload, handleStreamChunk);

      // 使用收集的完整输出
      content = fullOutput;
    } else {
      // 非流式处理
      const headers = {
        'Content-Type': 'application/json'
      };

      // 设置请求超时
      const response = await axios.post(apiUrl, payload, {
        headers,
        timeout: API_TIMEOUT_MS
      });

      // 提取内容
      content = response.data.choices[0].message.content;

      if (progressCallback) {
        progressCallback('影响评估分析完成', 'completed');
      }
    }

    return content;
  } catch (error) {
    console.error("Impact assessment API request failed:", error);
    if (progressCallback) {
      progressCallback(`获取影响评估失败：${error instanceof Error ? error.message : '未知错误'}`, 'error');
    }
    throw error;
  }
}
