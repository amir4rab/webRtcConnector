import { useRouter } from 'next/router';
import { Text, Button, Grid, Container } from '@nextui-org/react';

export default function Home({ content }) {
  const router = useRouter();
  
  const navigateTo = ( path ) => {
    router.push(path);
  }

  return (
    <Container css={{ maxHeight: '100vh' }}>
      <main>
        <Grid.Container justify="center" alignContent='space-between'css={{ height: '55vh' }}>
          <Text h1 css={{ textGradient: '45deg, $blue500 -20%, $pink500 50%' }} size={64}>WebRtc Connector</Text>
          <Text h3 weight='normal'>WebRtc Connector helps you to make p2p connection between browsers in a simple and easy way!</Text>
        </Grid.Container>
        <Grid.Container justify="center" gap={2} css={{ height: '17.5vh' }}>
          <Grid>
            <Button onClick={ _ => navigateTo('/client') } color="primary" auto>
                Client
            </Button>
          </Grid>
          <Grid>
            <Button onClick={ _ => navigateTo('/server') } color="secondary" auto>
                Server
            </Button>
          </Grid>
        </Grid.Container>
        <Grid.Container justify="center" alignContent='flex-end' css={{ height: '8.5vh' }}>
          <Text
            weight="normal"
            css={{ letterSpacing: '$wide' }}
            h6
          >
            Developed with ☕ by <a href='https://amir4rab.com' target='_blank' rel='noreferrer' >amir4rab</a>
          </Text>
        </Grid.Container>
      </main>
    </Container>
  )
}
