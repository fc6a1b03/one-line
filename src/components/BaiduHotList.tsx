"use client";

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Flame, X } from 'lucide-react';
import axios from 'axios';

interface HotItem {
  title: string;
  url: string;
  hot: string;
}

interface BaiduHotListProps {
  onSelectHotItem: (title: string) => void;
  onClose: () => void;
  visible: boolean;
}

export function BaiduHotList({ onSelectHotItem, onClose, visible }: BaiduHotListProps) {
  const [hotItems, setHotItems] = useState<HotItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const fetchHotSearches = async () => {
      try {
        setIsLoading(true);
        setError('');
        const response = await axios.get('/api/baidu-hot');
        setHotItems(response.data.hotItems || []);
      } catch (err) {
        console.error('Failed to fetch Baidu hot searches:', err);
        setError('获取热搜失败，请稍后再试');
      } finally {
        setIsLoading(false);
      }
    };

    if (visible) {
      fetchHotSearches();
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <div className="fixed top-16 right-4 md:right-8 z-50 w-full max-w-xs">
      <Card className="hot-search-card glass-card rounded-xl w-full mx-auto animate-slide-up shadow-lg">
        <CardHeader className="flex flex-row items-center justify-between p-4">
          <CardTitle className="text-base flex items-center">
            <Flame size={18} className="text-red-500 mr-2" />
            百度热搜榜
          </CardTitle>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
            <X size={16} />
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 text-center">
              <div className="loading-spinner mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">加载中...</p>
            </div>
          ) : error ? (
            <div className="p-4 text-center text-red-500 dark:text-red-400 text-sm">
              {error}
            </div>
          ) : (
            <ScrollArea className="h-80 px-4 pb-4">
              <ul className="space-y-4">
                {hotItems.map((item, index) => (
                  <li key={index} className="hot-item">
                    <Button
                      variant="ghost"
                      className="w-full justify-start text-left rounded-lg hover:bg-primary/10 py-3 px-4 h-auto"
                      onClick={() => onSelectHotItem(item.title)}
                    >
                      <span className="hot-rank mr-4">{index + 1}</span>
                      <span className="hot-title flex-1 text-base font-medium">{item.title}</span>
                      <span className="hot-value text-sm text-muted-foreground ml-4">{item.hot}</span>
                    </Button>
                  </li>
                ))}
              </ul>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
      <style jsx global>{`
        .hot-rank {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 1rem;
          font-weight: 700;
          width: 2rem;
          height: 2rem;
          border-radius: 0.5rem;
        }

        .hot-item:nth-child(1) .hot-rank {
          background-color: #ff4d4f;
          color: white;
        }

        .hot-item:nth-child(2) .hot-rank {
          background-color: #ff7a45;
          color: white;
        }

        .hot-item:nth-child(3) .hot-rank {
          background-color: #ffa940;
          color: white;
        }

        @keyframes fly-in {
          from {
            transform: translateY(-1rem);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }

        @keyframes fly-to-input {
          0% {
            transform: translate(0, 0) scale(1);
            opacity: 1;
          }
          80% {
            transform: translate(var(--fly-x), var(--fly-y)) scale(0.8);
            opacity: 0.8;
          }
          100% {
            transform: translate(var(--fly-x), var(--fly-y)) scale(0);
            opacity: 0;
          }
        }

        .fly-to-input {
          position: relative;
          animation: fly-to-input 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          pointer-events: none;
        }
      `}</style>
    </div>
  );
}
