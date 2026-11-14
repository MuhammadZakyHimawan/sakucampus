import { Send, Wallet } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { cn } from '@/lib/cn';
import { telegramMessages } from '../content';

export function TelegramChatPreview() {
  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b border-border bg-surface px-4 py-3">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-white">
            <Wallet className="h-4 w-4" aria-hidden="true" />
          </span>
          <div>
            <p className="text-sm font-semibold text-ink">SakuCampus Bot</p>
            <p className="text-xs text-ink-secondary">Simulasi percakapan</p>
          </div>
        </div>
        <Badge variant="info">Telegram</Badge>
      </div>

      <div className="flex flex-col gap-3 bg-background/70 px-4 py-5">
        {telegramMessages.map((message, index) => {
          const isUser = message.from === 'user';

          return (
            <div
              key={`${message.from}-${index}`}
              className={cn(
                'flex w-full',
                isUser ? 'justify-end' : 'justify-start',
              )}
            >
              <div
                className={cn(
                  'max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm shadow-soft',
                  isUser
                    ? 'rounded-br-md bg-primary text-white'
                    : 'rounded-bl-md border border-border bg-surface text-ink',
                )}
              >
                <p className="leading-relaxed">{message.text}</p>
                {'meta' in message && message.meta ? (
                  <p
                    className={cn(
                      'mt-1.5 text-xs font-medium',
                      isUser ? 'text-white/80' : 'text-primary',
                    )}
                  >
                    {message.meta}
                  </p>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-2 border-t border-border bg-surface px-4 py-3 text-xs text-ink-secondary">
        <Send className="h-3.5 w-3.5" aria-hidden="true" />
        Integrasi Telegram belum aktif pada versi demo.
      </div>
    </Card>
  );
}
