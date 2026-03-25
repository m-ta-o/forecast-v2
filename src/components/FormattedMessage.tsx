
import React from 'react';

interface FormattedMessageProps {
  content: string;
}

export function FormattedMessage({ content }: FormattedMessageProps) {
  // Convert markdown-style formatting to JSX
  const formatMessage = (text: string) => {
    const lines = text.split('\n');
    const formatted: React.ReactNode[] = [];
    
    lines.forEach((line, index) => {
      // Skip empty lines but add spacing
      if (line.trim() === '') {
        formatted.push(<div key={index} className="h-2" />);
        return;
      }
      
      // Process the line for inline formatting
      let processedLine = processInlineFormatting(line);
      
      // Handle different line types
      if (line.match(/^#{1,3}\s/)) {
        // Headers
        const level = line.match(/^(#{1,3})/)?.[1].length || 1;
        const headerText = line.replace(/^#{1,3}\s/, '');
        const HeaderTag = `h${Math.min(level + 2, 6)}` as keyof JSX.IntrinsicElements;
        formatted.push(
          <HeaderTag key={index} className="font-bold text-gray-100 mt-3 mb-1">
            {processInlineFormatting(headerText)}
          </HeaderTag>
        );
      } else if (line.match(/^\s*[\*\-\+]\s/)) {
        // Bullet points
        const content = line.replace(/^\s*[\*\-\+]\s/, '');
        formatted.push(
          <div key={index} className="flex items-start space-x-2 mb-1">
            <span className="text-blue-400 mt-1">•</span>
            <span>{processInlineFormatting(content)}</span>
          </div>
        );
      } else if (line.match(/^\s*\d+\.\s/)) {
        // Numbered lists
        const match = line.match(/^\s*(\d+)\.\s(.+)$/);
        if (match) {
          const number = match[1];
          const content = match[2];
          formatted.push(
            <div key={index} className="flex items-start space-x-2 mb-1">
              <span className="text-blue-400 mt-1 font-medium">{number}.</span>
              <span>{processInlineFormatting(content)}</span>
            </div>
          );
        }
      } else if (line.match(/^[📉📈📆💡✅🔧⚡🎯💰📊🚀]/)) {
        // Lines starting with emojis - treat as callouts
        formatted.push(
          <div key={index} className="bg-gray-800/50 border-l-4 border-blue-500 pl-3 py-2 my-2 rounded-r">
            {processedLine}
          </div>
        );
      } else {
        // Regular text
        formatted.push(
          <div key={index} className="mb-1">
            {processedLine}
          </div>
        );
      }
    });
    
    return formatted;
  };
  
  const processInlineFormatting = (text: string): React.ReactNode => {
    // Handle bold (**text** or __text__)
    let result = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    result = result.replace(/__(.*?)__/g, '<strong>$1</strong>');
    
    // Handle italic (*text* or _text_)
    result = result.replace(/\*(.*?)\*/g, '<em>$1</em>');
    result = result.replace(/_(.*?)_/g, '<em>$1</em>');
    
    // Handle inline code (`code`)
    result = result.replace(/`(.*?)`/g, '<code class="bg-gray-700 px-1 py-0.5 rounded text-sm">$1</code>');
    
    // Split by HTML tags and render accordingly
    const parts = result.split(/(<\/?(?:strong|em|code)[^>]*>)/);
    const elements: React.ReactNode[] = [];
    let currentElement = '';
    let inTag = false;
    let tagType = '';
    
    parts.forEach((part, index) => {
      if (part.match(/^<(strong|em|code)/)) {
        if (currentElement) {
          elements.push(currentElement);
          currentElement = '';
        }
        tagType = part.match(/^<(strong|em|code)/)?.[1] || '';
        inTag = true;
      } else if (part.match(/^<\/(strong|em|code)/)) {
        if (tagType === 'strong') {
          elements.push(<strong key={index} className="font-bold text-white">{currentElement}</strong>);
        } else if (tagType === 'em') {
          elements.push(<em key={index} className="italic text-gray-300">{currentElement}</em>);
        } else if (tagType === 'code') {
          elements.push(<code key={index} className="bg-gray-700 px-1 py-0.5 rounded text-sm">{currentElement}</code>);
        }
        currentElement = '';
        inTag = false;
        tagType = '';
      } else {
        currentElement += part;
      }
    });
    
    if (currentElement) {
      elements.push(currentElement);
    }
    
    return elements.length > 0 ? elements : text;
  };
  
  return (
    <div className="space-y-1 text-sm leading-relaxed">
      {formatMessage(content)}
    </div>
  );
}
