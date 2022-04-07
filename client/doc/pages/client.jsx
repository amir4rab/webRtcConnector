import React from 'react';
import { Container } from '@nextui-org/react';

import readMarkdown from '../src/utils/readMarkdown';
import MarkdownWrapper from '../src/components/markdownWrapper/markdownWrapper';
import Nav from '../src/components/nav/nav';

function ClientPage({ markdown }) {
  return (
    <Container css={{ maxHeight: '100vh' }}>
      <MarkdownWrapper htmlContent={ markdown } />
      <Nav />
    </Container>
  );
}

export async function getStaticProps () {
  const markdownData = await readMarkdown('README', '/../client/');
  return {
    props: {
      markdown: markdownData
    }
  }
}

export default ClientPage;
