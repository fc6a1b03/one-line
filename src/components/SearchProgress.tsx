"use client";

import React, { useEffect, useRef, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { CheckIcon, ChevronDownIcon, ChevronUpIcon } from 'lucide-react';
import { Button } from './ui/button';

export interface SearchProgressStep {
  id: string;
  message: string;
  status: 'pending' | 'completed' | 'error';
  timestamp: Date;
}

interface SearchProgressProps {
  steps: SearchProgressStep[];
  visible: boolean;
  isActive: boolean;
  timeElapsed?: number; // 搜索耗时（毫秒）
  resultCount?: number; // 搜索结果数量
}

export function SearchProgress({ steps, visible, isActive, timeElapsed, resultCount }: SearchProgressProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);

  // 自动滚动到底部
  useEffect(() => {
    if (steps.length > 0 && containerRef.current && !isCollapsed) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [steps, isCollapsed]);

  // 搜索完成后自动折叠，但确保用户仍可手动展开
  useEffect(() => {
    if (!isActive && steps.length > 0) {
      // 搜索完成后2秒折叠，给用户留出更多时间查看进度
      const timer = setTimeout(() => {
        setIsCollapsed(true);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [isActive, steps.length]);

  if (!visible) return null;

  // 计算最后一次更新时间
  const lastUpdate = steps.length > 0
    ? steps[steps.length - 1].timestamp
    : new Date();

  // 格式化时间（秒）
  const formatTime = (ms?: number) => {
    if (!ms) return '0s';
    return `${(ms / 1000).toFixed(1)}s`;
  };

  // 计算已完成的步骤数
  const completedSteps = steps.filter(step => step.status === 'completed').length;

  return (
    <Card className={`search-progress-card shadow-lg ${isCollapsed ? 'collapsed' : 'relative'}`}>
      <CardContent className="p-3 sm:p-4">
        {isCollapsed ? (
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium flex items-center">
                <span className="mr-2">搜索结果</span>
                {isActive && (
                  <span className="inline-block h-2 w-2 rounded-full bg-amber-400 animate-pulse"></span>
                )}
              </h3>
              <p className="text-xs text-muted-foreground">
                {resultCount !== undefined ? `找到 ${resultCount} 条结果` : `完成 ${completedSteps} 个搜索步骤`}
                {timeElapsed ? `，耗时 ${formatTime(timeElapsed)}` : ''}
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsCollapsed(false)}
              className="h-7 w-7 p-0 rounded-full hover:bg-primary/10"
            >
              <ChevronDownIcon className="h-4 w-4" />
              <span className="sr-only">展开</span>
            </Button>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium flex items-center">
                <span className="mr-2">搜索进度</span>
                {isActive && (
                  <span className="inline-block h-2 w-2 rounded-full bg-amber-400 animate-pulse"></span>
                )}
              </h3>
              {steps.length > 0 && !isActive && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsCollapsed(true)}
                  className="h-7 w-7 p-0 rounded-full"
                >
                  <ChevronUpIcon className="h-4 w-4" />
                  <span className="sr-only">折叠</span>
                </Button>
              )}
            </div>
            <div
              className="space-y-2 max-h-[200px] overflow-y-auto pr-2"
              ref={containerRef}
            >
              {steps.map((step) => (
                <div key={step.id} className="flex items-start text-xs">
                  <div className="mr-2 mt-1">
                    {step.status === 'pending' && (
                      <div className="h-2 w-2 rounded-full bg-amber-400 animate-pulse"></div>
                    )}
                    {step.status === 'completed' && (
                      <div className="h-3 w-3 rounded-full text-green-500 flex items-center justify-center">
                        <CheckIcon className="h-2 w-2" />
                      </div>
                    )}
                    {step.status === 'error' && (
                      <div className="h-2 w-2 rounded-full bg-red-500"></div>
                    )}
                  </div>
                  <div className="flex-1">
                    <p className={`text-xs ${step.status === 'error' ? 'text-red-500' : ''}`}>
                      {step.message}
                    </p>
                    {step.status === 'pending' && (
                      <Skeleton className="h-2 w-full mt-1 rounded-sm" />
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground ml-2 whitespace-nowrap">
                    {step.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </div>
                </div>
              ))}

              {!isActive && resultCount !== undefined && (
                <div className="mt-2 pt-2 border-t text-xs text-muted-foreground">
                  <p>搜索完成：找到 {resultCount} 条结果，耗时 {formatTime(timeElapsed)}</p>
                </div>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
