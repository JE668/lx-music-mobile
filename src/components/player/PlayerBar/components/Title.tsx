import { TouchableOpacity, View } from 'react-native'
import { navigations } from '@/navigation'
import { usePlayerMusicInfo, useCurrentPlayQuality } from '@/store/player/hook'
// import { toast } from '@/utils/tools'
import { useSettingValue } from '@/store/setting/hook'
import { useTheme } from '@/store/theme/hook'
import commonState from '@/store/common/state'
import playerState from '@/store/player/state'
import Text from '@/components/common/Text'
import { LIST_IDS } from '@/config/constant'
import { createStyle, formatMusicName } from '@/utils/tools'

const QUALITY_SHORT: Record<LX.Quality, string> = {
  'master': 'MST',
  'atmos_plus': 'A+',
  'atmos': 'ATM',
  'hires': 'HR',
  'flac24bit': '24bit',
  'flac': 'FLAC',
  'ape': 'APE',
  'wav': 'WAV',
  '320k': '320K',
  '192k': '192K',
  '128k': '128K',
}

/** 音质徽章 */
const QualityBadge = () => {
  const quality = useCurrentPlayQuality()
  const showBadge = useSettingValue('player.showQualityBadge')
  const theme = useTheme()

  if (!showBadge || !quality) return null

  return (
    <View style={styles.badge}>
      <Text size={9} color={theme['c-content-background']} numberOfLines={1}>
        {QUALITY_SHORT[quality] ?? quality}
      </Text>
    </View>
  )
}


export default ({ isHome }: { isHome: boolean }) => {
  // const { t } = useTranslation()
  const musicInfo = usePlayerMusicInfo()
  const downloadFileName = useSettingValue('download.fileName')
  const theme = useTheme()

  const handlePress = () => {
    // console.log('')
    // console.log(playMusicInfo)
    if (!musicInfo.id) return
    navigations.pushPlayDetailScreen(commonState.componentIds.home!)
    // toast(global.i18n.t('play_detail_todo_tip'), 'long')
  }

  const handleLongPress = () => {
    const listId = playerState.playMusicInfo.listId
    if (!listId || listId == LIST_IDS.DOWNLOAD) return
    global.app_event.jumpListPosition()
  }
  // console.log('render title')

  const title = musicInfo.id
    ? musicInfo.singer
      ? formatMusicName(downloadFileName, musicInfo.name, musicInfo.singer)
      : musicInfo.name
    : ''
  // console.log(playMusicInfo)
  return (
    <TouchableOpacity style={styles.container} onLongPress={handleLongPress} onPress={handlePress} activeOpacity={0.7} >
      <View style={styles.titleRow}>
        <Text color={theme['c-font-label']} numberOfLines={1} style={styles.titleText}>{title}</Text>
        <QualityBadge />
      </View>
    </TouchableOpacity>
  )
}

const styles = createStyle({
  container: {
    width: '100%',
    paddingHorizontal: 2,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  titleText: {
    flexGrow: 1,
    flexShrink: 1,
  },
  badge: {
    flexGrow: 0,
    flexShrink: 0,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 4,
    paddingVertical: 1,
    paddingHorizontal: 4,
  },
})
