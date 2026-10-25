import { HStack, Spacer, Text, VStack } from '@expo/ui/swift-ui';
import {
  background,
  cornerRadius,
  font,
  foregroundStyle,
  padding,
  widgetURL,
} from '@expo/ui/swift-ui/modifiers';
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
  environment: WidgetEnvironment
) => {
  'widget';

  // In isolated widget runtime, all variables must be declared inside the function
  const coral = '#FF806E';
  const warmDark = '#2B1E1A';
  const cream = '#FFF8F1';
  const textMuted = '#8A7B75';

  const isSmall = environment.widgetFamily === 'systemSmall';
  const destination = props.deepLink || 'momo://';

  if (props.isEmpty || !props.momentId) {
    return (
      <VStack
        modifiers={[
          padding({ all: 16 }),
          background(cream),
          widgetURL(destination),
        ]}
      >
        <HStack>
          <Text
            modifiers={[
              font({ size: 14, weight: 'bold' }),
              foregroundStyle(coral),
            ]}
          >
            MOMO
          </Text>
          <Spacer />
          <Text modifiers={[font({ size: 14 })]}>✨</Text>
        </HStack>
        <Spacer />
        <Text
          modifiers={[
            font({ size: 13, weight: 'medium' }),
            foregroundStyle(warmDark),
          ]}
        >
          No moments yet
        </Text>
        <Text
          modifiers={[
            font({ size: 11 }),
            foregroundStyle(textMuted),
          ]}
        >
          Share a photo with your close circle!
        </Text>
        <Spacer />
      </VStack>
    );
  }

  if (isSmall) {
    return (
      <VStack
        modifiers={[
          padding({ all: 12 }),
          background(cream),
          widgetURL(destination),
        ]}
      >
        <HStack>
          <Text
            modifiers={[
              font({ size: 11, weight: 'bold' }),
              foregroundStyle(coral),
            ]}
          >
            MOMO
          </Text>
          <Spacer />
          <Text
            modifiers={[
              font({ size: 10 }),
              foregroundStyle(textMuted),
            ]}
          >
            {props.timeAgo}
          </Text>
        </HStack>

        <Spacer />

        <VStack
          modifiers={[
            padding({ all: 8 }),
            background('#FFFFFF'),
            cornerRadius(12),
          ]}
        >
          <Text
            modifiers={[
              font({ size: 12, weight: 'bold' }),
              foregroundStyle(warmDark),
            ]}
          >
            {props.authorName}
          </Text>
          {props.caption ? (
            <Text
              modifiers={[
                font({ size: 11 }),
                foregroundStyle(warmDark),
              ]}
            >
              {props.caption}
            </Text>
          ) : null}
        </VStack>

        <Spacer />

        <HStack>
          <Text
            modifiers={[
              font({ size: 9 }),
              foregroundStyle(coral),
            ]}
          >
            Tap to open
          </Text>
          <Spacer />
          <Text modifiers={[font({ size: 9 })]}>❤️</Text>
        </HStack>
      </VStack>
    );
  }

  return (
    <HStack
      modifiers={[
        padding({ all: 14 }),
        background(cream),
        widgetURL(destination),
      ]}
    >
      <VStack modifiers={[padding({ trailing: 8 })]}>
        <HStack>
          <Text
            modifiers={[
              font({ size: 13, weight: 'bold' }),
              foregroundStyle(coral),
            ]}
          >
            MOMO
          </Text>
          <Spacer />
          <Text
            modifiers={[
              font({ size: 11 }),
              foregroundStyle(textMuted),
            ]}
          >
            {props.timeAgo}
          </Text>
        </HStack>

        <Spacer />

        <Text
          modifiers={[
            font({ size: 15, weight: 'bold' }),
            foregroundStyle(warmDark),
          ]}
        >
          {props.authorName}
        </Text>
        <Text
          modifiers={[
            font({ size: 11 }),
            foregroundStyle(textMuted),
          ]}
        >
          @{props.authorUsername}
        </Text>

        <Spacer />

        <Text
          modifiers={[
            font({ size: 12 }),
            foregroundStyle(warmDark),
          ]}
        >
          {props.caption || 'Sent a private moment'}
        </Text>

        <Spacer />

        <Text
          modifiers={[
            font({ size: 10, weight: 'medium' }),
            foregroundStyle(coral),
          ]}
        >
          Tap to view & react ✨
        </Text>
      </VStack>
    </HStack>
  );
};

export default createWidget('MOMOLatestWidget', MOMOLatestWidget, defaultSnapshot);
