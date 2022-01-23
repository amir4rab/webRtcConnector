import Head from 'next/head'

import ReactMarkdown from 'react-markdown'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import nord from '../markdownStyles/nord';
import rehypeRaw from 'rehype-raw'

import fs from 'fs';

export default function Home({ content }) {
  const copyToClipBoard = ( input ) => {
    try {
      navigator.clipboard.writeText(input)
    } catch {
      console.error('failed to writeText to clipboard')
    }
  }

  return (
    <>
      <Head>
        <title>WebRtc Connector Client</title>
        <meta name="description" content="WebRtc Connector Client" />
      </Head>
      <ReactMarkdown
        rehypePlugins={[rehypeRaw]}
        components={{
          code({node, inline, className, children, ...props}) {
            const match = /language-(\w+)/.exec(className || '')
            return !inline && match ? (
              <div className='codeWrapper'>
                <button onClick={ _ => copyToClipBoard(String(children).replace(/\n$/, '')) } className='copyButton'>
                  Copy
                </button>
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
              <code className={className} {...props}>
                { children }
              </code>
            )
          }
        }}
      >
        { content }
      </ReactMarkdown>
    </>
  )
}

export async function getStaticProps() {
  const fullPath = process.cwd()+ '/../client/README.md';
  const fileContents = fs.readFileSync(fullPath, 'utf8');

  return {
    props: { content: fileContents }
  }
}
