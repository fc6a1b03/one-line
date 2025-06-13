import type React from 'react';

/**
 * Formats markdown text to HTML with basic styling
 * @param text Markdown text to format
 * @returns Formatted HTML string
 */
export function formatMarkdownText(text: string): string {
  // Handle bold text with **
  let formatted = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

  // Handle italic text with *
  formatted = formatted.replace(/\*(.*?)\*/g, '<em>$1</em>');

  // Handle inline code with `
  formatted = formatted.replace(/`(.*?)`/g, '<code>$1</code>');

  // Handle Markdown links
  formatted = formatted.replace(/\[(.*?)\]\((.*?)\)/g, (match, text, url) => {
    const cleanUrl = url.replace(/[\)\]]$/, '');
    return `<a href="${cleanUrl}" target="_blank" rel="noopener noreferrer" class="text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 underline">${text}</a>`;
  });

  // Handle numbered lists
  formatted = formatted.replace(/(\d+\.\s+)(.*?)(?=\n|$)/g, '<span class="list-item">$1$2</span>');

  return formatted;
}

/**
 * Renders markdown content as HTML with styling
 * @param content Markdown content to render
 * @returns JSX element with rendered markdown
 */
export function renderMarkdown(content: string): React.ReactNode {
  if (!content) return null;

  return (
    <div className="space-y-3 animate-fade-in">
      {content.split("\n\n").map((paragraph, index) => (
        <div
          key={`paragraph-${index}`}
          className="text-sm leading-relaxed animate-fade-in"
          style={{animationDelay: `${0.15 * index}s`}}
          dangerouslySetInnerHTML={{
            __html: formatMarkdownText(paragraph.replace(/\n/g, '<br />'))
          }}
        />
      ))}
    </div>
  );
}
