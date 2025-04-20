// Remove unused logo imports
// import crxLogo from '@/assets/crx.svg' 
// import reactLogo from '@/assets/react.svg'
// import viteLogo from '@/assets/vite.svg'

// Use named import for HelloWorld
import { HelloWorld } from './components/HelloWorld' 
// import './App.css'

export default function App() {
  return (
    <div className="p-4"> 
      {/* Render the actual HelloWorld test component */}
      <HelloWorld /> 
    </div>
  )
}
