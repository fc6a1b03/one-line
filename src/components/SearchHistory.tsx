"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp, Clock } from 'lucide-react';

export interface SearchHistoryItem {
  query: string;
  timestamp: number;
  count: number;
}

interface SearchHistoryProps {
  onSelectHistoryItem: (query: string) => void;
  visible: boolean;
  historyItems: SearchHistoryItem[];
}

export function SearchHistory({ onSelectHistoryItem, visible, historyItems }: SearchHistoryProps) {
  const [expanded, setExpanded] = useState<boolean>(false);

  // Reset expanded state when visibility changes
  useEffect(() => {
    if (!visible) {
      setExpanded(false);
    }
  }, [visible]);

  // If component is not visible, don't render anything
  if (!visible || historyItems.length === 0) return null;

  // Default to showing only 5 items when not expanded
  const defaultDisplayCount = 5;
  const displayedItems = expanded ? historyItems : historyItems.slice(0, defaultDisplayCount);

  // Format the timestamp to a readable date
  const formatDate = (timestamp: number): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffInDays === 0) {
      // Today - show hour:minute
      return `今天 ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
    } else if (diffInDays === 1) {
      // Yesterday
      return `昨天 ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
    } else if (diffInDays < 7) {
      // Within a week
      return `${diffInDays}天前`;
    } else {
      // Older than a week
      return `${date.getMonth() + 1}月${date.getDate()}日`;
    }
  };

  return (
    <div className="search-history-dropdown w-full rounded-lg glass-card mt-2 overflow-hidden animate-fade-in z-30">
      <div className="p-2.5 flex items-center justify-between border-b border-muted/20">
        <h3 className="text-sm font-medium flex items-center">
          <Clock size={14} className="text-blue-500 mr-1.5" />
          最近搜索记录
        </h3>
        {historyItems.length > 0 && (
          <div className="text-xs text-muted-foreground">
            {expanded ? `显示全部${historyItems.length}条` : `前${Math.min(defaultDisplayCount, historyItems.length)}条`}
          </div>
        )}
      </div>

      <div className="p-2">
        <div className="grid grid-cols-1 gap-1.5">
          {displayedItems.map((item, index) => (
            <div
              key={index}
              className="history-item cursor-pointer p-1.5 rounded-md hover:bg-primary/10 transition-colors"
              onClick={() => onSelectHistoryItem(item.query)}
            >
              <div className="flex items-center justify-between">
                <span className="history-title text-xs line-clamp-1 max-w-[75%] sm:max-w-[85%]">{item.query}</span>
                <span className="history-time text-[10px] text-muted-foreground">{formatDate(item.timestamp)}</span>
              </div>
              <div className="ml-4 mt-0.5">
                <span className="history-count text-[10px] text-muted-foreground">搜索次数: {item.count}</span>
              </div>
            </div>
          ))}
        </div>

        {historyItems.length > defaultDisplayCount && (
          <div className="text-center mt-3 pb-4">
            <Button
              variant="outline"
              size="sm"
              className="text-xs rounded-full h-8 px-4 mb-4 bg-background/70 shadow-sm"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? (
                <>收起 <ChevronUp size={14} className="ml-1" /></>
              ) : (
                <>查看更多 <ChevronDown size={14} className="ml-1" /></>
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
