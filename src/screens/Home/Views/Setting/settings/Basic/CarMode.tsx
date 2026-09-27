import { updateSetting } from '@/core/common'
import { useI18n } from '@/lang'
import { createStyle } from '@/utils/tools'
import { memo } from 'react'
import { View } from 'react-native'
import { useSettingValue } from '@/store/setting/hook'

import CheckBoxItem from '../../components/CheckBoxItem'


export default memo(() => {
  const t = useI18n()
  const carMode = useSettingValue('common.carMode')

  const setCarMode = (checked: boolean) => {
    updateSetting({
      'common.carMode': checked,
      // 车机模式：强制深色主题
      'theme.id': checked ? 'black' : 'green',
      'theme.darkId': checked ? 'black' : 'black',
      'theme.lightId': checked ? 'black' : 'green',
    })
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
    </View>
  )
})

const styles = createStyle({
  content: {
    marginTop: 5,
  },
})
