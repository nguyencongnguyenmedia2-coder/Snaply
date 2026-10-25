import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  encodeReefCaption,
  decodeReefCaption,
  createReef,
  getActiveReefs,
  reactToReef,
  deleteReefItem,
  REEF_GRADIENTS,
} from '@/services/reefService';

describe('reefService Unit Tests', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('correctly encodes and decodes reef caption metadata', () => {
    const raw = 'Nắng chiều buông nhẹ bên hiên 🌸';
    const encoded = encodeReefCaption(raw, 'text', 'sunset', '🌸');
    expect(encoded).toContain('[REEF:text:sunset:🌸]');
    expect(encoded).toContain(raw);

    const decoded = decodeReefCaption(encoded);
    expect(decoded.isReef).toBe(true);
    expect(decoded.type).toBe('text');
    expect(decoded.gradientId).toBe('sunset');
    expect(decoded.sticker).toBe('🌸');
    expect(decoded.content).toBe(raw);
  });

  it('handles regular captions without reef tags gracefully', () => {
    const regularCaption = 'Just a normal moment photo';
    const decoded = decodeReefCaption(regularCaption);
    expect(decoded.isReef).toBe(false);
    expect(decoded.content).toBe(regularCaption);
  });

  it('creates text and media reefs and stores them in active list', async () => {
    const textReef = await createReef({
      userId: 'test-user-123',
      type: 'text',
      content: 'Hello weekend!',
      gradientId: 'aurora',
      sticker: '⚡',
      ownerProfile: {
        username: 'coder_vn',
        display_name: 'Coder',
        avatar_url: null,
      },
    });

    expect(textReef.id).toBeDefined();
    expect(textReef.content).toBe('Hello weekend!');
    expect(textReef.type).toBe('text');
    expect(textReef.background_gradient).toBe('aurora');

    const activeReefs = await getActiveReefs('test-user-123');
    expect(activeReefs.length).toBeGreaterThan(0);
    expect(activeReefs.some((r) => r.id === textReef.id)).toBe(true);

    // React to reef
    await reactToReef(textReef.id, '❤️', 'test-user-123');

    // Delete reef
    await deleteReefItem(textReef.id, 'test-user-123');
    const remaining = await getActiveReefs('test-user-123');
    expect(remaining.some((r) => r.id === textReef.id)).toBe(false);
  });

  it('validates all vibrant gradient presets', () => {
    expect(REEF_GRADIENTS.length).toBeGreaterThanOrEqual(6);
    REEF_GRADIENTS.forEach((g) => {
      expect(g.id).toBeDefined();
      expect(g.colors.length).toBe(2);
      expect(g.textColor).toBeDefined();
    });
  });
});
