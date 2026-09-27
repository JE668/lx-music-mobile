import { memo, useMemo } from 'react'
import { View, TouchableOpacity } from 'react-native'

import SubTitle from '../../components/SubTitle'
import CheckBoxItem from '../../components/CheckBoxItem'
import { QUALITY_ORDER } from '@/core/music/utils'
import { useSettingValue } from '@/store/setting/hook'
import { updateSetting } from '@/core/common'
import { useI18n } from '@/lang'
import { useTheme } from '@/store/theme/hook'
import { createStyle, tipDialog } from '@/utils/tools'
import Text from '@/components/common/Text'
import { Icon } from '@/components/common/Icon'

/**
 * 音质设置
 * - 音质选择（11种，标注当前源支持的）
 * - 后备模式（5种策略）
 * - 降级开关
 * - 播放栏音质徽章
 */

const FALLBACK_MODES: Array<{ id: LX.AppSetting['player.qualityFallback'], key: string, tipKey: string }> = [
  { id: 'same_source_higher', key: 'setting_play_quality_fallback_same_source_higher', tipKey: 'setting_play_quality_fallback_same_source_higher_tip' },
  { id: 'all_sources_higher', key: 'setting_play_quality_fallback_all_sources_higher', tipKey: 'setting_play_quality_fallback_all_sources_higher_tip' },
  { id: 'best', key: 'setting_play_quality_fallback_best', tipKey: 'setting_play_quality_fallback_best_tip' },
  { id: 'downgrade', key: 'setting_play_quality_fallback_downgrade', tipKey: 'setting_play_quality_fallback_downgrade_tip' },
  { id: 'strict', key: 'setting_play_quality_fallback_strict', tipKey: 'setting_play_quality_fallback_strict_tip' },
]

const QUALITY_LABELS: Record<LX.Quality, string> = {
  'master': 'Master',
  'atmos_plus': 'Atmos+',
  'atmos': 'Atmos',
  'hires': 'Hi-Res',
  'flac24bit': 'FLAC 24bit',
  'flac': 'FLAC',
  'ape': 'APE',
  'wav': 'WAV',
  '320k': 'MP3 320K',
  '192k': 'MP3 192K',
  '128k': 'MP3 128K',
}

const QualityRow = ({ quality, supported }: { quality: LX.Quality, supported: boolean }) => {
  const playQuality = useSettingValue('player.playQuality')
  const theme = useTheme()
  const isActive = playQuality === quality

  return (
    <TouchableOpacity
      style={{ ...styles.qualityRow, opacity: supported ? 1 : 0.35 }}
      onPress={() => { if (supported) updateSetting({ 'player.playQuality': quality }) }}
      disabled={!supported}
      activeOpacity={0.6}
    >
      <Icon
        name={isActive ? 'checkbox-marked' : 'checkbox-blank-outline'}
        size={16}
        color={isActive ? theme['c-primary'] : theme['c-400']}
        style={{ marginRight: 8 }}
      />
      <Text size={14} color={isActive ? theme['c-primary'] : theme['c-400']} numberOfLines={1}>
        {QUALITY_LABELS[quality]}
      </Text>
      {supported && !isActive && (
        <Text size={11} color={theme['c-600']} style={{ marginLeft: 6 }}>可用</Text>
      )}
      {!supported && (
        <Text size={11} color={theme['c-600']} style={{ marginLeft: 6 }}>不可用</Text>
      )}
    </TouchableOpacity>
  )
}

const FallbackModeSelector = () => {
  const t = useI18n()
  const fallbackMode = useSettingValue('player.qualityFallback')
  const theme = useTheme()
  const allowDowngrade = useSettingValue('player.qualityAllowDowngrade')

  return (
    <View style={styles.fallbackContainer}>
      {FALLBACK_MODES.map(mode => (
        <TouchableOpacity
          key={mode.id}
          style={{ ...styles.fallbackItem, borderColor: fallbackMode === mode.id ? theme['c-primary'] : theme['c-border'] }}
          onPress={() => updateSetting({ 'player.qualityFallback': mode.id })}
          activeOpacity={0.6}
        >
          <Text
            size={12}
            color={fallbackMode === mode.id ? theme['c-primary'] : theme['c-400']}
            numberOfLines={1}
            style={styles.fallbackLabel}
          >
            {t(mode.key as any)}
          </Text>
        </TouchableOpacity>
      ))}
      <TouchableOpacity
        style={{ marginTop: 4 }}
        onPress={() => {
          const current = FALLBACK_MODES.find(m => m.id === fallbackMode)
          if (current) {
            void tipDialog({
              title: t(current.key as any),
              message: t(current.tipKey as any),
              btnText: t('understand'),
            })
          }
        }}
      >
        <Text size={11} color={theme['c-600']} numberOfLines={2}>
          {t('setting_play_quality_fallback')} ⓘ
        </Text>
      </TouchableOpacity>

      <CheckBoxItem
        check={allowDowngrade}
        onChange={(checked) => updateSetting({ 'player.qualityAllowDowngrade': checked })}
        label={t('setting_play_quality_allow_downgrade')}
        helpTitle={t('setting_play_quality_allow_downgrade')}
        helpDesc={t('setting_play_quality_allow_downgrade_tip')}
      />
    </View>
  )
}

export default memo(() => {
  const t = useI18n()
  const showQualityBadge = useSettingValue('player.showQualityBadge')

  // 当前源支持的所有音质
  const sourceQualitys = useMemo(() => {
    return Object.values(global.lx.qualityList).flat()
  }, [])

  return (
    <View>
      <SubTitle title={t('setting_play_play_quality')}>
        <View style={styles.qualityList}>
          {QUALITY_ORDER.map(q => (
            <QualityRow key={q} quality={q} supported={sourceQualitys.includes(q)} />
          ))}
        </View>
      </SubTitle>

      <FallbackModeSelector />

      <CheckBoxItem
        check={showQualityBadge}
        onChange={(checked) => updateSetting({ 'player.showQualityBadge': checked })}
        label={t('setting_play_quality_badge')}
      />
    </View>
  )
})

const styles = createStyle({
  qualityList: {
    gap: 2,
  },
  qualityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingLeft: 4,
    borderRadius: 6,
  },
  fallbackContainer: {
    marginTop: 8,
    marginBottom: 8,
    gap: 4,
  },
  fallbackItem: {
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
    alignItems: 'center',
  },
  fallbackLabel: {
    textAlign: 'center',
  },
})
