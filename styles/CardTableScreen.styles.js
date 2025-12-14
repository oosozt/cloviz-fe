import { Platform, StyleSheet } from 'react-native';

import { getMonospaceFontFamily } from '../lib/ui';

export const styles = StyleSheet.create({
  screen: {
    flex: 1,
    alignSelf: 'stretch',
    backgroundColor: '#d4d4d4',
  },
  root: {
    flex: 1,
    padding: 16,
    position: 'relative',
  },

  labelBox: {
    backgroundColor: '#ffffff',
    borderWidth: 4,
    borderColor: '#000000',
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',

    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOpacity: 1,
        shadowRadius: 0,
        shadowOffset: { width: 4, height: 4 },
      },
      android: {
        elevation: 6,
      },
      default: {},
    }),
  },
  labelText: {
    color: '#000000',
    fontFamily: getMonospaceFontFamily(),
  },
  timerText: {
    marginLeft: 8,
  },
  timer: {
    position: 'absolute',
    top: 16,
    right: 16,
  },

  dealCard: {
    position: 'absolute',
    left: 0,
    top: 0,
    zIndex: 20,
  },

  playersHidden: {
    opacity: 0,
    pointerEvents: 'none',
  },

  nameplate: {
    backgroundColor: '#ffffff',
    borderWidth: 4,
    borderColor: '#000000',
    paddingHorizontal: 12,
    paddingVertical: 6,

    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOpacity: 1,
        shadowRadius: 0,
        shadowOffset: { width: 4, height: 4 },
      },
      android: {
        elevation: 6,
      },
      default: {},
    }),
  },
  nameplateYou: {
    backgroundColor: '#000000',
    marginTop: 8,
  },
  labelTextYou: {
    color: '#ffffff',
  },
  nameplateActive: {
    backgroundColor: '#000000',
  },
  labelTextActive: {
    color: '#ffffff',
  },

  actionHaloFill: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(250, 204, 21, 0.45)',
    borderRadius: 6,
  },

  topPlayer: {
    position: 'absolute',
    top: 45,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  leftPlayer: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingLeft: 16,
  },
  rightPlayer: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingRight: 16,
  },
  bottomPlayer: {
    position: 'absolute',
    bottom: 12,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingBottom: 8,
    paddingHorizontal: 16,
  },

  centerArea: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerStack: {
    alignItems: 'center',
  },
  centerBlock: {
    alignItems: 'center',
  },
  mt24: {
    marginTop: 24,
  },
  caption: {
    color: '#000000',
    fontFamily: getMonospaceFontFamily(),
    fontSize: 12,
    marginTop: 8,
  },
  playSlot: {
    width: 64,
    height: 96,
    backgroundColor: '#ffffff',
    borderWidth: 4,
    borderColor: '#000000',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',

    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOpacity: 1,
        shadowRadius: 0,
        shadowOffset: { width: 4, height: 4 },
      },
      android: {
        elevation: 6,
      },
      default: {},
    }),
  },
  playSlotText: {
    color: 'rgba(0,0,0,0.5)',
    fontFamily: getMonospaceFontFamily(),
    fontSize: 12,
  },

  row: {
    flexDirection: 'row',
    marginTop: 8,
  },
  col: {
    flexDirection: 'column',
    marginTop: 8,
  },
  mr4: {
    marginRight: 4,
  },
  mr8: {
    marginRight: 8,
  },
  mb4: {
    marginBottom: 4,
  },
  mb2: {
    marginBottom: -8,
  },
});
