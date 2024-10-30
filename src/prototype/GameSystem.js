// src/prototype/GameSystem.js
import React from 'react';
import { Card, Text, Button } from '@mantine/core';

const GameSystem = () => {
  return (
    <Card shadow="sm" padding="lg">
      <Text weight={500}>Warhammer 40k</Text>
      <Button variant="light" fullWidth style={{ marginTop: 14 }}>
        Select Game System
      </Button>
    </Card>
  );
};

export default GameSystem;
