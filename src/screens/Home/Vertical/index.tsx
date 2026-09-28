import Content from './Content'
import PlayerBar from '@/components/player/PlayerBar'
import CarFocusPlay from '@/components/player/CarFocusPlay'

export default () => {
  return (
    <>
      <Content />
      <PlayerBar isHome />
      <CarFocusPlay />
    </>
  )
}
