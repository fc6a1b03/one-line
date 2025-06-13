import { NextResponse } from 'next/server';
import axios from 'axios';
import { getEnvConfig } from '@/lib/env';
import type { ApiConfig } from '@/types';

export const maxDuration = 60; // Set maximum duration to 60 seconds (Vercel hobby plan limit)
export const dynamic = 'force-dynamic';

// Impact assessment system prompt
const IMPACT_ASSESSMENT_PROMPT = `
你是一个专业的事件影响评估专家，专长于分析事件的多方面影响。
根据用户提供的事件描述，你需要先提供事件简介，然后根据事件的特性和相关性，有选择地评估该事件的影响，可以从经济、社会和地缘政治三个主要维度进行分析。

请记住，不是所有事件都需要分析全部维度。根据事件的性质，某些维度可能完全不相关或缺乏足够的依据进行分析。
在这种情况下，你应该忽略不相关的维度，而不是勉强提供毫无实质内容的分析。

你需要生成以下内容，请严格按照以下格式返回：

===事件简介===
简要介绍事件的背景、主要过程和当前状态，包括：
1. 事件发生的时间、地点和主要参与者
2. 事件的核心内容和重要转折点
3. 事件的最新进展和当前状态
4. 事件的核心争议点或关键问题
5. 事件的基本影响概述

===维度分析===
首先，评估一下哪些维度与当前事件最相关，并只分析那些相关性较高的维度。对于每个维度，评估一下相关性分数（0-10），只有分数超过6的维度才应该进行详细分析。

===经济影响===
仅当事件与经济领域有显著关联时才分析此部分。如果不相关，请忽略此部分。
经济影响分析可能包括：
1. GDP影响预测：评估事件对相关国家或地区GDP的短期和长期影响，使用可量化的数据和百分比
2. 行业影响分析：识别受影响最大的行业，分析供应链、就业和市场变化
3. 市场反应：评估金融市场、股票、大宗商品和货币市场的反应
4. 经济风险评估：根据可能的情景分析潜在经济风险，包括通胀、失业率等变化
5. 评估信心度：表明你分析的可信度（很高/高/中等/低），并说明影响该信心度的因素

===社会影响===
仅当事件对社会层面有明显影响时才分析此部分。如果不相关，请忽略此部分。
社会影响分析可能包括：
1. 舆情情感导向：根据公众反应分析积极/消极/中性情绪的分布比例，必须给出大致百分比
2. 传播热度图谱：描述议题传播范围、速度和持久性，使用相对热度值（1-10）
3. 社会群体影响：分析不同社会群体受到的差异化影响
4. 政策响应预测：预测可能的政策变化和公共响应
5. 信息生态评估：评估相关信息的可靠性、争议点和误导性叙事
6. 评估信心度：表明你分析的可信度（很高/高/中等/低），并说明影响该信心度的因素

===地缘政治影响===
仅当事件涉及国际关系、国家间互动或可能影响全球地缘政治格局时才分析此部分。如果不相关，请忽略此部分。
地缘政治影响分析可能包括：
1. 国际关系变化：评估事件对相关国家双边关系的影响，使用-5(极度恶化)到+5(极度改善)的量化尺度
2. 战略利益分析：识别相关国家的核心利益和战略目标如何受到影响
3. 区域权力平衡：分析区域权力结构的潜在变化
4. 跨国机构角色：评估国际组织和多边机构的参与和影响
5. 全球治理影响：分析对国际规则和全球治理机制的潜在影响
6. 评估信心度：表明你分析的可信度（很高/高/中等/低），并说明影响该信心度的因素

确保你的分析：
1. 基于可靠的数据和事实
2. 提供多角度视角和平衡的分析
3. 区分短期和长期影响
4. 使用量化指标和具体数据支持你的观点
5. 避免过度推测和主观判断
6. 对于不确定性高的预测，明确标示信心水平
7. 当某个维度与事件关联度低时，应完全省略该维度的分析，而不是提供空洞或牵强的内容
`;

// 处理POST请求
export async function POST(req: Request) {
  try {
    const { model, endpoint, apiKey, query, searchResults } = await req.json();

    // 获取配置
    const config = getEnvConfig();

    // 根据请求参数或环境变量构建API配置
    const apiConfig: ApiConfig = {
      endpoint: endpoint === "使用环境变量配置" ? config.API_ENDPOINT || "" : endpoint,
      model: model === "使用环境变量配置" ? config.API_MODEL || "" : model,
      apiKey: apiKey === "使用环境变量配置" ? config.API_KEY || "" : apiKey,
    };

    // 构建消息
    const messages = [
      { role: "system", content: IMPACT_ASSESSMENT_PROMPT },
    ];

    // 添加搜索结果（如果有）
    if (searchResults) {
      messages.push({ role: "system", content: searchResults });
    }

    // 添加用户查询
    messages.push({ role: "user", content: `请对以下事件进行影响评估分析：${query}` });

    // 构建API请求参数
    const requestPayload = {
      model: apiConfig.model,
      messages: messages,
      temperature: 0.7,
      stream: true // 启用流式输出
    };

    // 根据endpoint构建完整的API URL
    let apiUrl = apiConfig.endpoint;

    // 如果是Azure OpenAI，需要特殊处理URL
    if (apiUrl.includes('openai.azure.com')) {
      // 从model中提取deployment名称，格式通常为"deployment@model"
      const deploymentName = apiConfig.model.split('@')[0];
      if (!apiUrl.endsWith('/')) apiUrl += '/';
      apiUrl += `openai/deployments/${deploymentName}/chat/completions?api-version=2023-05-15`;
    } else if (!apiUrl.endsWith('/chat/completions')) {
      // 对于OpenAI API和兼容的API，确保URL指向chat/completions
      if (!apiUrl.endsWith('/')) apiUrl += '/';
      apiUrl += 'chat/completions';
    }

    // 构建请求头
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // 设置API密钥头部，根据是否为Azure OpenAI选择正确的头部名称
    if (apiUrl.includes('openai.azure.com')) {
      headers['api-key'] = apiConfig.apiKey;
    } else {
      headers['Authorization'] = `Bearer ${apiConfig.apiKey}`;
    }

    // 进行API请求，并将结果流式传输到客户端
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(requestPayload),
    });

    // 如果响应不成功，抛出错误
    if (!response.ok) {
      // 尝试读取错误信息
      let errorText = await response.text();
      try {
        const errorJson = JSON.parse(errorText);
        errorText = errorJson.error?.message || errorText;
      } catch (e) {
        // 如果解析失败，使用原始错误文本
      }

      // 返回错误响应
      return NextResponse.json(
        { error: `AI API responded with status ${response.status}: ${errorText}` },
        { status: response.status }
      );
    }

    // 直接将AI服务的流式响应传递给客户端
    return new Response(response.body, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error: any) {
    console.error('Error in impact assessment API:', error);

    // 构建错误响应
    return NextResponse.json(
      { error: error.message || 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
