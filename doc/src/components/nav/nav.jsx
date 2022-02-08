import Link from 'next/link';
import { Text, Button, Grid, Spacer, Container } from '@nextui-org/react';

function Nav() {
  return (
    <Grid.Container css={{ padding: '1rem 0', marginTop: '1rem' }}>
      <Text h4>Navigation</Text>
      <Grid.Container gap={2} justify='space-between'>
        <Link href='/'>Home</Link>  
        <Link href='/client'>Client Docs</Link>  
        <Link href='/server'>Server Docs</Link>  
      </Grid.Container>
    </Grid.Container>
  );
}

export default Nav;
