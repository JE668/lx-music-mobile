import { updateSetting } from '@/core/common'
import { useI18n } from '@/lang'
import { createStyle } from '@/utils/tools'
import { memo } from 'react'
import { View } from 'react-native'
import { useSettingValue } from '@/store/setting/hook'
import { setWakeLock } from '@/utils/keepAwake'

import CheckBoxItem from '../../components/CheckBoxItem'


export default memo(() => {
  const t = useI18n()
  const carMode = useSettingValue('common.carMode')
  const carSafetyMode = useSettingValue('common.carSafetyMode')
  const keepScreenOn = useSettingValue('common.keepScreenOn')

  const setCarMode = (checked: boolean) => {
    updateSetting({
      'common.carMode': checked,
      // 车机模式：强制深色主题
      'theme.id': checked ? 'black' : 'green',
      'theme.darkId': checked ? 'black' : 'black',
      'theme.lightId': checked ? 'black' : 'green',
    })
  }

  const setSafetyMode = (checked: boolean) => {
    updateSetting({ 'common.carSafetyMode': checked })
  }

  const setKeepScreenOn = (checked: boolean) => {
    updateSetting({ 'common.keepScreenOn': checked })
    setWakeLock(checked)
  }

  return (
    <View style={styles.content}>
      <CheckBoxItem
        check={carMode}
        label={t('setting_basic_car_mode')}
        onChange={setCarMode}
        helpTitle={t('setting_basic_car_mode')}
        helpDesc={t('setting_basic_car_mode_tip')}
      />
      <CheckBoxItem
        check={carSafetyMode}
        label={t('setting_basic_car_safety_mode')}
        onChange={setSafetyMode}
        helpTitle={t('setting_basic_car_safety_mode')}
        helpDesc={t('setting_basic_car_safety_mode_tip')}
      />
      <CheckBoxItem
        check={keepScreenOn}
        label={t('setting_basic_keep_screen_on')}
        onChange={setKeepScreenOn}
        helpTitle={t('setting_basic_keep_screen_on')}
        helpDesc={t('setting_basic_keep_screen_on_tip')}
      />
    </View>
  )
})

const styles = createStyle({
  content: {
    marginTop: 5,
  },
})
