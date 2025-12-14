import { Platform } from 'react-native';

export function measureInWindowAsync(ref) {
  return new Promise((resolve, reject) => {
    const node = ref?.current;
    if (!node || typeof node.measureInWindow !== 'function') {
      reject(new Error('Ref not measurable'));
      return;
    }

    node.measureInWindow((x, y, width, height) => {
      // Some Android cases can briefly return zeros before layout settles.
      if (width === 0 && height === 0) {
        reject(new Error('Layout not ready'));
        return;
      }

      resolve({ x, y, width, height });
    });
  });
}

// Use a platform-appropriate monospace font for the “pixel / retro” UI.
export function getMonospaceFontFamily() {
  return Platform.select({
    ios: 'Courier',
    android: 'monospace',
    default: 'monospace',
  });
}
