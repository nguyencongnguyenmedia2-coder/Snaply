import type { MOMOWidgetSnapshot } from './types';

export const defaultSnapshot: MOMOWidgetSnapshot = {
  momentId: '',
  latestMomentId: '',
  authorName: 'Snaply Friends',
  authorUsername: 'snaply',
  caption: 'Waiting for new moments...',
  timeAgo: 'Just now',
  photoUrl: '',
  imageUrl: '',
  deepLink: 'snaply://',
  hasUnseen: false,
  isEmpty: true,
};

const MOMOLatestWidget = {
  updateSnapshot: (_props: MOMOWidgetSnapshot) => {
    // Universal fallback for web & unit test environments
  },
  reload: () => {},
};

export default MOMOLatestWidget;
