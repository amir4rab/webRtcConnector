import ReactMarkdown from 'react-markdown';
import { Text, Button } from '@nextui-org/react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import nord from '../../../markdownStyles/nord';
import rehypeRaw from 'rehype-raw';

import React from 'react';

const buttonStyles = `position: absolute; top: .5rem ;right: .5rem; opacity: .75; transition: opacity .15s ease-in-out, color .15s ease-in-out, background .15s ease-in-out; border-radius: .4rem;`

function MarkdownWrapper({ htmlContent }) {
  const copyToClipBoard = ( input ) => {
    try {
      navigator.clipboard.writeText(input)
    } catch {
      console.error('failed to writeText to clipboard')
    }
  }

  return (
    <ReactMarkdown
        rehypePlugins={[rehypeRaw]}
        components={{
          code({ node, inline, className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || '')
            return !inline && match ? (
              <div className='codeWrapper'>
                <Button 
                  onClick={ _ => copyToClipBoard(String(children).replace(/\n$/, '')) } 
                  css={{ position: 'absolute', top: '.5rem' ,right: '.5rem' }}
                  size='sm'
                  color='success'
                  flat
                >
                  Copy
                </Button>
                <SyntaxHighlighter
                  style={nord}
                  language={match[1]}
                  PreTag="div"
                  {...props}
                >
                  { String(children).replace(/\n$/, '') }
                </SyntaxHighlighter>
              </div>
            ) : (
              <code className={ className } {...props}>
                { children }
              </code>
            )
          },
          h1({ node, inline, children, ...props }) {
            return <Text h1 css={{ textGradient: '45deg, $blue500 -20%, $pink500 50%', textAlign: 'left' }}>{children}</Text>
          },
          h3({ node, inline, children, ...props }) {
            return <Text h3 css={{ marginBottom: 0, paddingBottom: '.5rem', textAlign: 'left' }}>{children}</Text>
          }
        }}
      >
        { htmlContent }
      </ReactMarkdown>
  );
}

export default MarkdownWrapper;
