import { NextResponse } from 'next/server';
import axios from 'axios';

// 设置较短的超时时间，避免 Netlify 504 错误
const TIMEOUT_MS = 45000; // 45 秒，低于 Netlify 的 60 秒限制
const MAX_RETRIES = 2; // 最大重试次数

// 添加改进的系统提示，使分析更具动态性和相关性
const EVENT_DETAILS_SYSTEM_PROMPT = `你是一个专业的历史事件分析助手，专长于提供详细的事件分析和背景信息。
在回答问题前，你将获得搜索引擎的最新信息，请使用这些信息来确保你的回答是基于最新的事实。

请针对用户询问的特定事件，提供有选择性的分析，但不要强行分析所有方面。
根据事件特性，选择性地涵盖以下部分，而不是机械地覆盖所有分析模块：

===背景===
事件的背景和前因，包括历史脉络、相关事件和潜在因素。请尽可能提供具体的日期、人物和地点信息。

===详细内容===
事件的主要内容，按时间顺序或重要性组织，提供具体日期和事实。详细描述事件的整个过程，包括重要转折点、关键决策和各方反应。

===参与方===
仅当事件涉及多个重要参与者或存在不同立场时才分析此部分。
分析事件的主要参与者、相关人物及其立场和作用。清晰说明各方利益关系、动机和目标。

===多源分析===
仅当事件存在明显的信息差异或多种解读时才分析此部分。
从不同来源的信息中分析事件的全貌。比较不同观点的可信度和证据基础，指出可能更准确的解读。

===影响===
仅当事件具有明显影响时才分析此部分。
分析事件的短期和长期影响，包括政治、经济、社会或环境方面。评估事件引起的变化和历史意义。

===相关事实===
仅当有重要的事实或数据支持分析时才包含此部分。
提供与事件相关的重要事实或数据，包括可靠统计数据、研究结果或官方信息。

请记住：
1. 不是所有部分都需要包含在每次分析中
2. 根据事件性质决定分析哪些方面
3. 避免空洞或牵强的内容，宁可省略某个部分也不要提供无实质内容的分析
4. 保持客观中立的叙述，多角度展示事件
5. 使用清晰的段落结构和Markdown格式增强可读性
6. 明确指出信息的局限性，避免过度推断
`

// 新增函数：创建流式响应
function createStreamResponse(readable: ReadableStream) {
  return new Response(readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
    },
  });
}

export async function POST(request: Request) {
  try {
    // 从环境变量中获取 API 密钥和端点
    const apiKey = process.env.API_KEY;
    const apiEndpoint = process.env.API_ENDPOINT;
    const apiModel = process.env.API_MODEL || 'gemini-2.0-pro-exp-search';

    // 解析请求体
    const requestData = await request.json();

    // 检查请求中是否要求流式输出
    const streamMode = requestData.stream === true;

    // 检查请求中是否使用环境变量配置的标记
    const isUsingEnvConfig =
      requestData.model === "使用环境变量配置" ||
      requestData.endpoint === "使用环境变量配置" ||
      requestData.apiKey === "使用环境变量配置";

    // 如果请求表明要使用环境变量配置，但环境变量没有配置
    if (isUsingEnvConfig && (!apiKey || !apiEndpoint)) {
      return NextResponse.json(
        { error: '服务器端API配置缺失，请手动配置API参数' },
        { status: 500 }
      );
    }

    // 如果没有配置 API 密钥或端点，返回错误
    if (!isUsingEnvConfig && (!requestData.apiKey || !requestData.endpoint)) {
      return NextResponse.json(
        { error: 'API key or endpoint not configured in request' },
        { status: 400 }
      );
    }

    // 如果请求中包含 model 参数，则使用请求中的 model，否则使用环境变量中的 model
    const model = isUsingEnvConfig ? apiModel : (requestData.model || apiModel);

    // 使用正确的API端点和密钥
    const finalEndpoint = isUsingEnvConfig ? apiEndpoint : requestData.endpoint;
    const finalApiKey = isUsingEnvConfig ? apiKey : requestData.apiKey;

    // 添加系统提示到消息中
    if (Array.isArray(requestData.messages) && requestData.messages.length > 0) {
      // 在用户消息之前插入系统提示
      requestData.messages.unshift({
        role: "system",
        content: EVENT_DETAILS_SYSTEM_PROMPT
      });
    }

    // 构建实际发送给 API 的请求体
    const payload = {
      ...requestData,
      model,
      // 如果客户端请求流式输出，确保在API请求中启用
      stream: streamMode
    };

    // 构建请求头
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${finalApiKey}`
    };

    console.log('Sending event details request to API:', {
      endpoint: finalEndpoint,
      model: model,
      usingEnvConfig: isUsingEnvConfig,
      apiKeyConfigured: finalApiKey ? '已配置' : '未配置',
      streamMode: streamMode ? '已启用' : '未启用'
    });

    // 如果启用了流式模式，使用流式响应
    if (streamMode) {
      try {
        // 创建一个TransformStream来处理API响应
        const { readable, writable } = new TransformStream();
        const writer = writable.getWriter();

        // 发送请求到API端点，使用stream响应模式
        const apiResponse = await fetch(finalEndpoint, {
          method: 'POST',
          headers,
          body: JSON.stringify(payload)
        });

        if (!apiResponse.ok) {
          const errorText = await apiResponse.text();
          throw new Error(`API responded with status ${apiResponse.status}: ${errorText}`);
        }

        if (!apiResponse.body) {
          throw new Error('API response body is null');
        }

        // 处理API响应流
        const reader = apiResponse.body.getReader();

        // 开始处理流数据
        (async () => {
          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) {
                await writer.close();
                break;
              }

              // 将数据块直接传递给客户端
              await writer.write(value);
            }
          } catch (e) {
            console.error('Error processing stream:', e);
            // 写入错误消息到流
            const encoder = new TextEncoder();
            await writer.write(encoder.encode(`event: error\ndata: ${JSON.stringify({ error: e.message })}\n\n`));
            await writer.close();
          }
        })();

        // 返回流式响应
        return createStreamResponse(readable);
      } catch (error: any) {
        console.error('Stream API request failed:', error);
        // 如果流式请求失败，回退到常规响应
        return NextResponse.json(
          { error: 'Stream request failed', message: error.message },
          { status: 500 }
        );
      }
    }

    // 非流式模式下的原始实现（保留原来的重试逻辑）
    let lastError;
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        // 发送请求到实际的 API 端点，使用较短的超时设置
        const response = await axios.post(finalEndpoint, payload, {
          headers,
          timeout: TIMEOUT_MS
        });

        // 请求成功，返回 API 响应
        return NextResponse.json(response.data);
      } catch (error: any) {
        console.error(`Event details API request failed (attempt ${attempt + 1}/${MAX_RETRIES + 1}):`, error.message);
        lastError = error;

        // 如果已经是最后一次尝试，则不再重试
        if (attempt === MAX_RETRIES) {
          break;
        }

        // 等待一段时间后重试
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    // 所有重试均失败，返回错误响应
    console.error('All event details API request attempts failed:', lastError);

    // 构建更详细的错误信息
    const errorDetails: any = {
      error: 'API request failed after multiple attempts',
      message: lastError?.message,
    };

    // 如果有响应数据，添加到错误中
    if (lastError?.response) {
      errorDetails.status = lastError.response.status;
      errorDetails.statusText = lastError.response.statusText;
      errorDetails.data = lastError.response.data;
    } else if (lastError?.request) {
      // 请求已发出但没有收到响应
      errorDetails.request = 'Request was made but no response was received';
      errorDetails.timeout = lastError.code === 'ECONNABORTED';
    }

    // 返回错误响应
    return NextResponse.json(
      errorDetails,
      { status: lastError?.response?.status || 500 }
    );
  } catch (error: any) {
    console.error('Event details API route error:', error);

    // 构建更详细的错误信息
    const errorDetails: any = {
      error: 'API request failed',
      message: error.message,
    };

    // 如果有响应数据，添加到错误中
    if (error.response) {
      errorDetails.status = error.response.status;
      errorDetails.statusText = error.response.statusText;
      errorDetails.data = error.response.data;
    } else if (error.request) {
      // 请求已发出但没有收到响应
      errorDetails.request = 'Request was made but no response was received';
      errorDetails.timeout = error.code === 'ECONNABORTED';
    }

    // 返回错误响应
    return NextResponse.json(
      errorDetails,
      { status: error.response?.status || 500 }
    );
  }
}
