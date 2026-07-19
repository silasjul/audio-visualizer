import Visualizer from '@/components/visualizer/VisualizerClient'
import LevaControls from '@/components/LevaControls'

export default function Home() {
  return (
    <main className="w-full h-lvh">
      <LevaControls />
      <Visualizer />
    </main>
  )
}
