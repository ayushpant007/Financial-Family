'use client'

import * as React from 'react'
import { motion, useMotionValue, useTransform } from 'framer-motion'
import { cn } from '@/lib/utils'
import { Button, type ButtonProps } from '@/components/ui/button'

interface AnimatedFeatureSpotlight3DProps extends React.HTMLAttributes<HTMLElement> {
  preheaderIcon?: React.ReactNode
  preheaderText: string
  heading: React.ReactNode
  description: string
  buttonText: string
  buttonProps?: ButtonProps
  imageUrl: string
  imageAlt?: string
}

export const AnimatedFeatureSpotlight3D = React.forwardRef<
  HTMLElement,
  AnimatedFeatureSpotlight3DProps
>(
  (
    {
      className,
      preheaderIcon,
      preheaderText,
      heading,
      description,
      buttonText,
      buttonProps,
      imageUrl,
      imageAlt = 'Feature image',
      ...props
    },
    ref
  ) => {
    const x = useMotionValue(0)
    const y = useMotionValue(0)
    const rotateX = useTransform(y, [-100, 100], [15, -15])
    const rotateY = useTransform(x, [-100, 100], [-15, 15])

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
      const rect = e.currentTarget.getBoundingClientRect()
      const offsetX = e.clientX - rect.left - rect.width / 2
      const offsetY = e.clientY - rect.top - rect.height / 2
      x.set(offsetX)
      y.set(offsetY)
    }

    const handleMouseLeave = () => {
      x.set(0)
      y.set(0)
    }

    return (
      <section
        ref={ref}
        className={cn(
          'w-full p-4 md:p-8 rounded-3xl bg-background border border-border/10 overflow-hidden glass shadow-xl md:shadow-2xl',
          className
        )}
        aria-labelledby="feature-spotlight-heading"
        {...props}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 items-center">
          {/* Text Section */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="flex flex-col space-y-4 md:space-y-6 text-center md:text-left items-center md:items-start order-2 md:order-1"
          >
            <div className="flex items-center space-x-2 text-xs md:text-sm font-medium text-muted-foreground uppercase tracking-widest">
              {preheaderIcon}
              <span>{preheaderText}</span>
            </div>
            <motion.h2
              id="feature-spotlight-heading"
              className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight text-foreground leading-[1.1]"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.6 }}
            >
              {heading}
            </motion.h2>
            <motion.p
              className="text-base md:text-lg text-muted-foreground leading-relaxed max-w-md"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.6 }}
            >
              {description}
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.6 }}
              className="w-full md:w-auto"
            >
              <Button size="lg" className="w-full md:w-auto rounded-full px-8 h-12 md:h-14 shadow-lg shadow-primary/20" {...buttonProps}>
                {buttonText}
              </Button>
            </motion.div>
          </motion.div>

          {/* Image Section with 3D Hover */}
          <motion.div
            className="relative w-full min-h-[180px] md:min-h-[320px] flex items-center justify-center order-1 md:order-2"
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            style={{ perspective: 1000 }}
          >
            <motion.div
              style={{
                rotateX: typeof window !== 'undefined' && window.innerWidth < 768 ? 0 : rotateX,
                rotateY: typeof window !== 'undefined' && window.innerWidth < 768 ? 0 : rotateY,
                x: typeof window !== 'undefined' && window.innerWidth < 768 ? 0 : x,
                y: typeof window !== 'undefined' && window.innerWidth < 768 ? 0 : y,
                transformStyle: 'preserve-3d',
              }}
              transition={{ type: 'spring', stiffness: 200, damping: 15 }}
              className="w-full max-w-[240px] md:max-w-xs relative"
            >
              <motion.img
                src={imageUrl}
                alt={imageAlt}
                className="w-full object-contain rounded-2xl md:rounded-3xl shadow-2xl"
                whileHover={window.innerWidth < 768 ? {} : { scale: 1.05 }}
                transition={{ duration: 0.3 }}
              />
              <div className="absolute inset-0 pointer-events-none rounded-2xl md:rounded-3xl ring-1 ring-inset ring-white/10" />
            </motion.div>
          </motion.div>
        </div>
      </section>
    )
  }
)

AnimatedFeatureSpotlight3D.displayName = 'AnimatedFeatureSpotlight3D'
