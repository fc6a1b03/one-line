"use client";

import React, { useState, useEffect, useRef } from 'react';
import type { TimelineEvent, Person } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import type { StreamCallback } from '@/lib/api';
import { Clock, FileText } from 'lucide-react';

interface TimelineProps {
  events: TimelineEvent[];
  isLoading?: boolean;
  onRequestDetails: (event: TimelineEvent, streamCallback?: StreamCallback) => Promise<string>;
  summary?: string;
}

export function Timeline({ events, isLoading = false, onRequestDetails, summary }: TimelineProps) {
  const [selectedEvent, setSelectedEvent] = useState<TimelineEvent | null>(null);
  const [detailsContent, setDetailsContent] = useState<string>('');
  const [showDetails, setShowDetails] = useState<boolean>(false);
  const [expandedEvents, setExpandedEvents] = useState<Set<string>>(new Set());
  const [isLoadingDetails, setIsLoadingDetails] = useState<boolean>(false);
  const [isStreamingDetails, setIsStreamingDetails] = useState<boolean>(false);

  // 用于存储流式响应的ref
  const streamContentRef = useRef<string>('');

  // 清理流式响应缓存
  useEffect(() => {
    if (!showDetails) {
      streamContentRef.current = '';
    }
  }, [showDetails]);

  const toggleExpand = (eventId: string) => {
    setExpandedEvents(prev => {
      const newSet = new Set(prev);
      if (newSet.has(eventId)) {
        newSet.delete(eventId);
      } else {
        newSet.add(eventId);
      }
      return newSet;
    });
  };

  const handleShowDetails = async (event: TimelineEvent) => {
    setSelectedEvent(event);
    setDetailsContent('');
    setShowDetails(true);
    setIsLoadingDetails(true);
    setIsStreamingDetails(true);
    streamContentRef.current = '';

    try {
      // 流式回调处理函数
      const streamCallback: StreamCallback = (chunk, isDone) => {
        streamContentRef.current += chunk;
        setDetailsContent(streamContentRef.current);

        if (isDone) {
          setIsStreamingDetails(false);
          setIsLoadingDetails(false);
        }
      };

      // 使用流式请求
      await onRequestDetails(event, streamCallback);
    } catch (error) {
      console.error('Failed to fetch details:', error);
      setIsStreamingDetails(false);
      setIsLoadingDetails(false);
    }
  };

  const renderPeople = (people: Person[]) => {
    return (
      <div className="flex flex-wrap gap-1 sm:gap-2 mt-2">
        {people.map((person, index) => (
          <div
            key={`${person.name}-${index}`}
            className="flex items-center gap-1 rounded-full px-1.5 sm:px-2 py-0.5 sm:py-1 text-xs backdrop-blur-md"
            style={{
              backgroundColor: `${person.color}20`,
              borderLeft: `3px solid ${person.color}`,
              boxShadow: `0 0 10px ${person.color}10`
            }}
          >
            <Avatar className="h-4 w-4 sm:h-5 sm:w-5">
              <div
                className="h-full w-full rounded-full"
                style={{ backgroundColor: person.color }}
              />
            </Avatar>
            <span style={{ color: person.color }} className="text-xs">
              {person.name}
            </span>
            {person.role && (
              <span className="text-xs opacity-70 hidden sm:inline"> - {person.role}</span>
            )}
          </div>
        ))}
      </div>
    );
  };

  const renderMarkdown = (content: string) => {
    const formatMarkdownText = (text: string) => {
      const boldRegex = /\*\*(.*?)\*\*/g;
      let formatted = text.replace(boldRegex, '<strong>$1</strong>');

      const italicRegex = /\*(.*?)\*/g;
      formatted = formatted.replace(italicRegex, '<em>$1</em>');

      const codeRegex = /`(.*?)`/g;
      formatted = formatted.replace(codeRegex, '<code>$1</code>');

      // 添加对Markdown链接的处理，解决链接尾部带括号或方括号的问题
      const linkRegex = /\[(.*?)\]\((.*?)\)/g;
      formatted = formatted.replace(linkRegex, (match, text, url) => {
        // 移除URL中可能的尾部括号和方括号
        const cleanUrl = url.replace(/[\)\]]$/, '');
        return `<a href="${cleanUrl}" target="_blank" rel="noopener noreferrer" class="text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 underline">${text}</a>`;
      });

      return formatted;
    };

    const sectionsRegex = /===(.*?)===(?:\r?\n|$)/g;
    const sections = [];
    const titleMatches = [...content.matchAll(sectionsRegex)];

    for (let i = 0; i < titleMatches.length; i++) {
      const titleMatch = titleMatches[i];
      const sectionTitle = titleMatch[1].trim();

      const contentStartIndex = titleMatch.index! + titleMatch[0].length;
      const contentEndIndex = i < titleMatches.length - 1 ? titleMatches[i + 1].index! : content.length;

      const sectionContent = content.substring(contentStartIndex, contentEndIndex).trim();

      sections.push({ title: sectionTitle, isTitle: true });
      sections.push({ content: sectionContent, isTitle: false });
    }

    if (sections.length === 0) {
      return (
        <div className="space-y-4">
          {content.split("\n\n").map((paragraph, index) => (
            <div
              key={`paragraph-${index}`}
              className="text-sm"
              dangerouslySetInnerHTML={{
                __html: formatMarkdownText(paragraph.replace(/\n/g, '<br />'))
              }}
            />
          ))}
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {sections.map((section, index) => {
          if (section.isTitle) {
            return (
              <div key={`section-title-${index}`} className="mt-6 first:mt-0">
                <h3 className="text-base font-semibold mb-2">{section.title}</h3>
              </div>
            );
          } else {
            return (
              <div key={`section-content-${index}`} className="space-y-3">
                {section.content.split("\n\n").map((paragraph, pIndex) => (
                  <div
                    key={`p-${index}-${pIndex}`}
                    className="text-sm"
                    dangerouslySetInnerHTML={{
                      __html: formatMarkdownText(paragraph.replace(/\n/g, '<br />'))
                    }}
                  />
                ))}
              </div>
            );
          }
        })}
      </div>
    );
  };

  if (events.length === 0 && !isLoading) {
    return null;
  }

  if (isLoading) {
    const skeletonItems = [
      { id: 'skeleton-1' },
      { id: 'skeleton-2' },
      { id: 'skeleton-3' },
      { id: 'skeleton-4' },
      { id: 'skeleton-5' }
    ];

    return (
      <div className="w-full max-w-3xl mx-auto">
        {/* 添加标题区域 */}
        <Card className="glass-card rounded-xl overflow-hidden mb-4 timeline-title-card">
          <CardHeader className="p-3 sm:p-6">
            <CardTitle className="text-base sm:text-xl flex items-center gap-2">
              <Clock className="h-4 w-4 sm:h-5 sm:w-5" />
              时间脉络
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              按时间顺序了解事件发展
            </CardDescription>
          </CardHeader>
        </Card>

        <div className="flex flex-col gap-4 sm:gap-6 py-4 sm:py-8">
          {skeletonItems.map((item) => (
            <div key={item.id} className="flex gap-1 sm:gap-4">
              {/* 不再渲染外部时间标注 */}
              <div className="flex-1 min-w-0">
                <Card className="glass-card rounded-lg">
                  <CardHeader className="p-2 sm:p-6">
                    <div className="flex justify-between items-center mb-2">
                      <Skeleton className="h-4 sm:h-6 w-[70%] rounded-lg" />
                      {/* 时间标注现在在卡片内部 */}
                      <Skeleton className="h-4 sm:h-5 w-20 rounded-full" />
                    </div>
                    <Skeleton className="h-3 sm:h-4 w-[50%] rounded-lg" />
                  </CardHeader>
                  <CardContent className="p-2 sm:p-6 pt-0 sm:pt-0">
                    <Skeleton className="h-12 sm:h-20 w-full rounded-lg" />
                  </CardContent>
                </Card>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-3xl mx-auto">
      {/* 添加标题区域 */}
      <Card className="glass-card rounded-xl overflow-hidden mb-4 timeline-title-card">
        <CardHeader className="p-3 sm:p-6">
          <CardTitle className="text-base sm:text-xl flex items-center gap-2">
            <Clock className="h-4 w-4 sm:h-5 sm:w-5" />
            时间脉络
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            按时间顺序了解事件发展
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="flex flex-col gap-3 sm:gap-6 py-2 sm:py-8">
        {events.map((event, index) => {
          const isExpanded = expandedEvents.has(event.id);
          return (
            <div key={event.id} className="animate-slide-up" style={{ animationDelay: `${index * 0.1}s` }}>
              <div className="relative">
                {/* 卡片右侧的时间轴线 */}
                <div className="absolute right-8 top-0 bottom-0 w-px bg-border/50 mx-auto rounded-full"></div>
                {index < events.length - 1 && (
                  <div className="absolute right-8 bottom-0 transform translate-x-[-6px] w-3 h-3 rounded-full bg-amber-400 animate-pulse"></div>
                )}

                <Card className="event-card timeline-card w-full">
                  <CardHeader className="p-2 sm:p-6 pb-0 sm:pb-2">
                    <div className="flex justify-between items-start gap-2">
                      <CardTitle className="text-sm sm:text-lg break-words leading-tight sm:leading-normal">{event.title}</CardTitle>
                      {/* 时间标注现在在卡片内部 */}
                      <div className="timeline-date-badge whitespace-nowrap text-xs sm:text-sm px-2 sm:px-3 py-1 rounded-full flex items-center gap-1.5 shrink-0">
                        <Clock className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                        <span>{event.date}</span>
                      </div>
                    </div>
                    {event.source && (
                      <CardDescription className="text-[10px] sm:text-xs mt-1 line-clamp-1">
                        来源: {event.sourceUrl ? (
                          <a
                            href={event.sourceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:underline text-blue-500 dark:text-blue-400"
                          >
                            {event.source}
                          </a>
                        ) : event.source}
                      </CardDescription>
                    )}
                    {renderPeople(event.people)}
                  </CardHeader>
                  <CardContent className="p-2 sm:p-6 pt-1 sm:pt-2">
                    <p className={`text-xs sm:text-base ${isExpanded ? '' : 'line-clamp-3'} leading-tight sm:leading-normal`}>
                      {event.description}
                    </p>
                  </CardContent>
                  <CardFooter className="p-2 sm:p-6 pt-0 sm:pt-0 flex justify-between">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleExpand(event.id)}
                      className="text-xs sm:text-sm rounded-full h-7 sm:h-8 px-2 sm:px-3 min-w-0"
                    >
                      {isExpanded ? '收起' : '展开'}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleShowDetails(event)}
                      className="text-xs sm:text-sm rounded-full h-7 sm:h-8 px-2 sm:px-3 ml-1 gap-1.5 ai-analysis-btn"
                    >
                      <FileText className="h-3.5 w-3.5" />
                      AI分析
                    </Button>
                  </CardFooter>
                </Card>
              </div>
            </div>
          );
        })}
      </div>

      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-[95vw] sm:max-w-2xl p-3 sm:p-6 glass-card rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-sm sm:text-lg break-words">{selectedEvent?.title}</DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              {selectedEvent?.date}
            </DialogDescription>
          </DialogHeader>
          <div className="mt-2 sm:mt-4 max-h-[50vh] sm:max-h-[60vh] overflow-y-auto">
            {!isLoadingDetails || (isStreamingDetails && detailsContent) ? (
              <div className="relative">
                {renderMarkdown(detailsContent)}
                {isStreamingDetails && (
                  <div className="stream-cursor"></div>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <Skeleton className="h-3 sm:h-4 w-full rounded-md" />
                <Skeleton className="h-3 sm:h-4 w-full rounded-md" />
                <Skeleton className="h-3 sm:h-4 w-5/6 rounded-md" />
                <Skeleton className="h-3 sm:h-4 w-4/5 rounded-md" />
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* 流式光标样式 */}
      <style jsx global>{`
        .stream-cursor {
          display: inline-block;
          width: 1ch;
          height: 1.15em;
          vertical-align: bottom;
          background: none;
          color: inherit;
          font-weight: bold;
          animation: stream-cursor-blink 1s steps(1) infinite;
          font-size: 1.3em;
          line-height: 1;
        }
        .stream-cursor::after {
          content: "▌";
          display: inline-block;
        }
        @keyframes stream-cursor-blink {
          0% { opacity: 1; }
          49% { opacity: 1; }
          50% { opacity: 0; }
          100% { opacity: 0; }
        }

        /* 添加时间轴卡片新样式 */
        .timeline-card {
          backdrop-filter: blur(15px);
          background-color: rgba(255, 255, 255, 0.5);
          border: 1px solid rgba(255, 255, 255, 0.3);
          border-radius: 0.8rem;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
          transition: all 0.3s ease;
        }

        .dark .timeline-card {
          background-color: rgba(30, 30, 30, 0.5);
          border: 1px solid rgba(80, 80, 80, 0.3);
        }

        .timeline-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
        }

        .timeline-date-badge {
          background-color: rgba(var(--primary), 0.1);
          color: hsl(var(--primary));
          border-left: 3px solid hsl(var(--primary));
          box-shadow: 0 0 10px rgba(var(--primary), 0.1);
          font-weight: 500;
        }

        .dark .timeline-date-badge {
          background-color: rgba(var(--primary), 0.2);
        }
      `}</style>
    </div>
  );
}
