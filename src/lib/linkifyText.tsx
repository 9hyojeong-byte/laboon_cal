import React from 'react';

const URL_REGEX = /((?:https?:\/\/|www\.)[^\s<]+)/gi;
// Trailing punctuation is usually sentence punctuation, not part of the URL
// (e.g. "링크: https://example.com." should not swallow the period).
const TRAILING_PUNCTUATION = /[.,!?;:'")\]}]+$/;

// Turns http(s):// and www. links inside plain text into clickable <a> tags,
// leaving everything else untouched (including line breaks, for containers
// using whitespace-pre-line).
export function linkifyText(text: string | null | undefined): React.ReactNode {
  if (!text) return text;

  return text.split(URL_REGEX).map((part, i) => {
    if (i % 2 !== 1) return part;

    const trailingMatch = part.match(TRAILING_PUNCTUATION);
    const trailing = trailingMatch ? trailingMatch[0] : '';
    const urlText = trailing ? part.slice(0, -trailing.length) : part;
    const href = urlText.toLowerCase().startsWith('www.') ? `https://${urlText}` : urlText;

    return (
      <React.Fragment key={i}>
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="text-accent underline underline-offset-2 hover:text-accent-secondary break-all"
        >
          {urlText}
        </a>
        {trailing}
      </React.Fragment>
    );
  });
}
