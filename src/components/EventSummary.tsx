"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { FileText, AlertCircle } from 'lucide-react';
import { formatMarkdownText } from '@/lib/markdown';

interface EventSummaryProps {
  summary: string | null;
  isLoading: boolean;
}

export function EventSummary({ summary, isLoading }: EventSummaryProps) {
  // 检查摘要是否太短或不够内容丰富
  const isSummaryTooShort = summary && summary.length < 50;
  const isSummaryContentLow = summary && !summary.includes('.') && !summary.includes('。');

  const renderMarkdown = (content: string) => {
    if (!content) return null;

    return (
      <div className="space-y-3 animate-fade-in">
        {content.split("\n\n").map((paragraph, index) => (
          <div
            key={`paragraph-${index}`}
            className="text-xs sm:text-sm leading-relaxed animate-fade-in"
            style={{ animationDelay: `${0.15 * index}s` }}
            dangerouslySetInnerHTML={{
              __html: formatMarkdownText(paragraph.replace(/\n/g, '<br />'))
            }}
          />
        ))}
      </div>
    );
  };

  if (isLoading && !summary) {
    return (
      <div className="w-full max-w-3xl mx-auto mb-2 sm:mb-4">
        <Card className="glass-card rounded-xl overflow-hidden">
          <CardHeader className="p-3 sm:p-6">
            <CardTitle className="text-base sm:text-xl flex items-center gap-2">
              <FileText className="h-4 w-4 sm:h-5 sm:w-5" />
              事件概述
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              客观描述事件的基本情况
            </CardDescription>
          </CardHeader>
          <CardContent className="p-3 sm:p-6 pt-0 sm:pt-0">
            <div className="space-y-2">
              <Skeleton className="h-3 w-full rounded-md" />
              <Skeleton className="h-3 w-5/6 rounded-md" />
              <Skeleton className="h-3 w-4/5 rounded-md" />
              <Skeleton className="h-3 w-full rounded-md" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!summary) return null;

  // 处理摘要内容太少的情况
  if (isSummaryTooShort || isSummaryContentLow) {
    return (
      <div className="w-full max-w-3xl mx-auto mb-2 sm:mb-4 event-summary-container">
        <Card className="glass-card rounded-xl overflow-hidden">
          <CardHeader className="p-3 sm:p-6">
            <CardTitle className="text-base sm:text-xl flex items-center gap-2">
              <FileText className="h-4 w-4 sm:h-5 sm:w-5" />
              事件概述
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              客观描述事件的基本情况
            </CardDescription>
          </CardHeader>
          <CardContent className="p-3 sm:p-6 pt-0 sm:pt-0">
            <div className="bg-amber-50 dark:bg-amber-950/20 p-3 rounded-lg border border-dashed border-amber-200 dark:border-amber-800/50">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                <div>
                  <p className="text-amber-800 dark:text-amber-300 text-xs sm:text-sm">
                    可用信息有限，详情请查看下方的"时间脉络"和"影响评估"部分获取更多内容。
                  </p>
                  {summary && (
                    <div className="mt-2 text-xs text-amber-700 dark:text-amber-400/80">
                      {renderMarkdown(summary)}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full max-w-3xl mx-auto mb-2 sm:mb-4 event-summary-container">
      <Card className="glass-card rounded-xl overflow-hidden">
        <CardHeader className="p-3 sm:p-6">
          <CardTitle className="text-base sm:text-xl flex items-center gap-2">
            <FileText className="h-4 w-4 sm:h-5 sm:w-5" />
            事件概述
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            客观描述事件的基本情况
          </CardDescription>
        </CardHeader>
        <CardContent className="p-3 sm:p-6 pt-0 sm:pt-0">
          <div className="bg-background/20 p-3 rounded-lg">
            {renderMarkdown(summary)}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
