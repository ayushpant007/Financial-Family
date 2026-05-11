'use client'

import { Gift } from 'lucide-react'
import { AnimatedFeatureSpotlight3D } from '@/components/ui/animated-feature-spotlight3d'

export default function FeatureSpotlightDemo() {
  return (
    <main className="min-h-screen flex items-center justify-center py-20 mx-8 bg-background">
      <AnimatedFeatureSpotlight3D
        preheaderIcon={<Gift className="w-4 h-4 text-primary" />}
        preheaderText="Smart Gifting Made Easy"
        heading={
          <>
            Send <span className="text-primary">Joy in a Box</span> to Anyone
          </>
        }
        description="Celebrate every occasion with personalized gifts that speak from the heart. Choose, customize, and deliver thoughtful presents — all in one beautifully designed platform."
        buttonText="Explore Gifts"
        imageUrl="https://pub-940ccf6255b54fa799a9b01050e6c227.r2.dev/gift-2.png"
      />
    </main>
  )
}
