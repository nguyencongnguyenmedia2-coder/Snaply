import { Box, Column, Row, Spacer, Text } from '@expo/ui/jetpack-compose';
import {
  background,
  cornerRadius,
  fillMaxSize,
  fillMaxWidth,
  paddingAll,
} from '@expo/ui/jetpack-compose/modifiers';
import { createWidget, type WidgetEnvironment } from 'expo-widgets';
import type { MOMOWidgetSnapshot } from './types';

const defaultSnapshot: MOMOWidgetSnapshot = {
  momentId: '',
  latestMomentId: '',
  authorName: 'MOMO Friends',
  authorUsername: 'momo',
  caption: 'Waiting for new moments...',
  timeAgo: 'Just now',
  photoUrl: '',
  imageUrl: '',
  deepLink: 'momo://',
  hasUnseen: false,
  isEmpty: true,
};

const MOMOLatestWidget = (
  props: MOMOWidgetSnapshot,
  _environment: WidgetEnvironment
) => {
  'widget';

  // Constants must be declared inside the widget function body
  const cream = '#FFF8F1';
  const cardBg = '#FFFFFF';

  if (props.isEmpty || !props.momentId) {
    return (
      <Column
        modifiers={[
          fillMaxSize(),
          background(cream),
          paddingAll(14),
        ]}
      >
        <Row modifiers={[fillMaxWidth()]}>
          <Text>MOMO</Text>
          <Spacer />
          <Text>✨</Text>
        </Row>
        <Spacer />
        <Text>No moments yet</Text>
        <Text>Share a photo with close friends!</Text>
        <Spacer />
      </Column>
    );
  }

  return (
    <Column
      modifiers={[
        fillMaxSize(),
        background(cream),
        paddingAll(12),
      ]}
    >
      <Row modifiers={[fillMaxWidth()]}>
        <Text>MOMO</Text>
        <Spacer />
        <Text>{props.timeAgo}</Text>
      </Row>

      <Spacer />

      <Box
        modifiers={[
          fillMaxWidth(),
          background(cardBg),
          cornerRadius(12),
          paddingAll(10),
        ]}
      >
        <Column>
          <Text>{props.authorName}</Text>
          <Text>@{props.authorUsername}</Text>
          {props.caption ? <Text>{props.caption}</Text> : null}
        </Column>
      </Box>

      <Spacer />

      <Row modifiers={[fillMaxWidth()]}>
        <Text>Tap to view moment</Text>
        <Spacer />
        <Text>❤️</Text>
      </Row>
    </Column>
  );
};

export default createWidget('MOMOLatestWidget', MOMOLatestWidget, defaultSnapshot);
