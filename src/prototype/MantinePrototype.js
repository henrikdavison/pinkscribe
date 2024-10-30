import React from 'react';
import { MantineProvider, AppShell, AppShellNavbar, AppShellHeader, Text, Container, NavLink } from '@mantine/core';

const MantinePrototype = () => {
  return (
    <MantineProvider theme={{ colorScheme: 'light' }} withGlobalStyles withNormalizeCSS>
      <AppShell
        padding="md"
        navbar={
          <AppShellNavbar width={{ base: 300 }} p="md" style={{ backgroundColor: '#f8f9fa', height: '100vh' }}>
            <Text size="xl" weight={700} mb="md">Menu</Text>
            
            {/* Dummy Menu Points */}
            <NavLink label="Home" />
            <NavLink label="Army Builder" active /> {/* Current Page */}
            <NavLink label="Settings" />
          </AppShellNavbar>
        }
        header={
          <AppShellHeader height={60} p="md" style={{ backgroundColor: '#f8f9fa' }}>
            <Text size="xl" weight={700}>Warhammer 40k Roster Builder</Text>
          </AppShellHeader>
        }
        styles={{
          main: {
            backgroundColor: '#ffffff',
            minHeight: '100vh',
          },
        }}
      >
        {/* Main Content Area */}
        <Container>
          <Text size="xl" weight={500}>Army Builder</Text>
          <Text>This is the Army Builder page where users can create and customize their roster.</Text>
        </Container>
      </AppShell>
    </MantineProvider>
  );
};

export default MantinePrototype;
