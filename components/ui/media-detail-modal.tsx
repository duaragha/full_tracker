"use client"

import * as React from "react"
import Image from "next/image"
import { X, Pencil, Trash2, Star } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"

export interface MediaDetailField {
  label: string
  value: string | number | React.ReactNode
  icon?: React.ReactNode
  fullWidth?: boolean
}

export interface MediaDetailAction {
  label: string
  icon: React.ReactNode
  onClick: () => void
  variant?: "default" | "outline" | "destructive" | "ghost"
  disabled?: boolean
}

export interface MediaDetailModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void

  // Main content
  title: string
  subtitle?: string
  imageUrl: string
  posterAspectRatio?: "portrait" | "square" | "landscape"

  // Metadata sections
  primaryFields?: MediaDetailField[]
  secondaryFields?: MediaDetailField[]

  // Additional content
  badges?: Array<{ label: string; variant?: "default" | "secondary" | "destructive" | "outline" }>
  rating?: {
    value: number
    max: number
    label?: string
  }
  notes?: string

  // Actions
  actions?: MediaDetailAction[]

  // Custom content
  children?: React.ReactNode

  // Styling
  className?: string
}

export function MediaDetailModal({
  open,
  onOpenChange,
  title,
  subtitle,
  imageUrl,
  posterAspectRatio = "portrait",
  primaryFields = [],
  secondaryFields = [],
  badges = [],
  rating,
  notes,
  actions = [],
  children,
  className,
}: MediaDetailModalProps) {
  const getAspectRatioClass = () => {
    switch (posterAspectRatio) {
      case "portrait":
        return "aspect-[2/3]"
      case "square":
        return "aspect-square"
      case "landscape":
        return "aspect-video"
      default:
        return "aspect-[2/3]"
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "max-w-[95vw] w-[95vw] md:max-w-[90vw] md:w-[90vw] lg:max-w-[85vw] lg:w-[85vw] max-h-[95vh] p-0",
          "data-[state=open]:animate-in data-[state=closed]:animate-out",
          "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
          "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
          "data-[state=closed]:slide-out-to-bottom-[5%]",
          "data-[state=open]:slide-in-from-bottom-[5%]",
          className
        )}
        showCloseButton={false}
      >
        <ScrollArea className="max-h-[95vh]">
          <div className="relative">
            {/* Close Button */}
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-4 right-4 z-20 h-10 w-10 rounded-full bg-background/80 backdrop-blur-sm hover:bg-background/95"
              onClick={() => onOpenChange(false)}
            >
              <X className="h-5 w-5" />
              <span className="sr-only">Close</span>
            </Button>

            {/* Header with Image */}
            <div className="grid md:grid-cols-[335px_1fr] lg:grid-cols-[385px_1fr] gap-6 md:gap-8 p-6 md:p-8">
              {/* Poster Image */}
              <div className="flex justify-center md:justify-start">
                <div className={cn(
                  "relative overflow-hidden rounded-lg bg-muted w-full max-w-[335px] md:max-w-[385px]",
                  getAspectRatioClass()
                )}>
                  <Image
                    src={imageUrl}
                    alt={title}
                    fill
                    sizes="(max-width: 768px) 335px, 385px"
                    className="object-cover"
                    priority
                    onError={(e) => {
                      const target = e.target as HTMLImageElement
                      target.src = "/placeholder-image.png"
                    }}
                  />
                </div>
              </div>

              {/* Title and Primary Info */}
              <div className="space-y-4 md:space-y-5">
                <div className="space-y-2">
                  <DialogTitle className="text-3xl md:text-4xl font-bold leading-tight">
                    {title}
                  </DialogTitle>
                  {subtitle && (
                    <p className="text-lg text-muted-foreground">{subtitle}</p>
                  )}
                </div>

                {/* Badges */}
                {badges.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {badges.map((badge, index) => (
                      <Badge key={index} variant={badge.variant || "default"}>
                        {badge.label}
                      </Badge>
                    ))}
                  </div>
                )}

                {/* Rating */}
                {rating && (
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <Star className="h-6 w-6 fill-yellow-400 text-yellow-400" />
                      <span className="text-2xl font-semibold">
                        {rating.value}/{rating.max}
                      </span>
                    </div>
                    {rating.label && (
                      <span className="text-base text-muted-foreground">
                        {rating.label}
                      </span>
                    )}
                  </div>
                )}

                {/* Primary Fields */}
                {primaryFields.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {primaryFields.map((field, index) => (
                      <div
                        key={index}
                        className={cn(
                          "space-y-1.5",
                          field.fullWidth && "sm:col-span-2 lg:col-span-3"
                        )}
                      >
                        <div className="flex items-center gap-2">
                          {field.icon && (
                            <span className="text-muted-foreground">
                              {field.icon}
                            </span>
                          )}
                          <span className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                            {field.label}
                          </span>
                        </div>
                        <div className="text-lg font-medium">
                          {field.value}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Action Buttons */}
                {actions.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-2">
                    {actions.map((action, index) => (
                      <Button
                        key={index}
                        variant={action.variant || "outline"}
                        size="sm"
                        onClick={action.onClick}
                        disabled={action.disabled}
                        className="flex items-center gap-2"
                      >
                        {action.icon}
                        {action.label}
                      </Button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Secondary Fields */}
            {secondaryFields.length > 0 && (
              <>
                <Separator />
                <div className="p-6 md:p-8 space-y-4 md:space-y-5">
                  <h3 className="text-xl font-semibold">Additional Information</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-5">
                    {secondaryFields.map((field, index) => (
                      <div
                        key={index}
                        className={cn(
                          "space-y-1.5",
                          field.fullWidth && "sm:col-span-2 md:col-span-3 lg:col-span-4 xl:col-span-5"
                        )}
                      >
                        <div className="flex items-center gap-2">
                          {field.icon && (
                            <span className="text-muted-foreground">
                              {field.icon}
                            </span>
                          )}
                          <span className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                            {field.label}
                          </span>
                        </div>
                        <div className="text-base">
                          {field.value}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Notes */}
            {notes && (
              <>
                <Separator />
                <div className="p-8 space-y-4">
                  <h3 className="text-xl font-semibold">Notes</h3>
                  <p className="text-base text-muted-foreground leading-relaxed whitespace-pre-wrap">
                    {notes}
                  </p>
                </div>
              </>
            )}

            {/* Custom Content */}
            {children && (
              <>
                <Separator />
                <div className="p-6">
                  {children}
                </div>
              </>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
