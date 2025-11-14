/**
 * Type definitions for react-reader
 * These types provide TypeScript support for the react-reader package
 */

declare module 'react-reader' {
  import { CSSProperties } from 'react'
  import { Book, Rendition, NavItem, Contents } from 'epubjs'

  export interface ReactReaderStyle {
    container: CSSProperties
    readerArea: CSSProperties
    containerExpanded: CSSProperties
    titleArea: CSSProperties
    reader: CSSProperties
    swipeWrapper: CSSProperties
    prev: CSSProperties
    next: CSSProperties
    arrow: CSSProperties
    arrowHover: CSSProperties
    tocBackground: CSSProperties
    tocArea: CSSProperties
    tocAreaButton: CSSProperties
    tocButton: CSSProperties
    tocButtonExpanded: CSSProperties
    tocButtonBar: CSSProperties
    tocButtonBarTop: CSSProperties
  }

  export const ReactReaderStyle: ReactReaderStyle

  export interface EpubViewProps {
    url: string | ArrayBuffer
    location?: string | number
    locationChanged?: (loc: string) => void
    tocChanged?: (toc: NavItem[]) => void
    getRendition?: (rendition: Rendition) => void
    handleKeyPress?: () => void
    handleTextSelected?: (cfiRange: string, contents: Contents) => void
    epubInitOptions?: {
      requestHeaders?: Record<string, string>
      [key: string]: any
    }
    epubOptions?: {
      flow?: 'paginated' | 'scrolled-doc' | 'scrolled'
      manager?: 'default' | 'continuous'
      width?: number
      height?: number
      spread?: 'none' | 'auto'
      minSpreadWidth?: number
      stylesheet?: string
      resizeOnOrientationChange?: boolean
      script?: string
      snap?: boolean
      allowPopups?: boolean
      allowScriptedContent?: boolean
      [key: string]: any
    }
    loadingView?: React.ReactNode
    styles?: ReactReaderStyle
    swipeable?: boolean
    title?: string
  }

  export interface ReactReaderProps extends EpubViewProps {
    title?: string
    showToc?: boolean
    readerStyles?: ReactReaderStyle
    swipeable?: boolean
  }

  export const EpubView: React.FC<EpubViewProps>
  export const ReactReader: React.FC<ReactReaderProps>
}

declare module 'epubjs' {
  export interface NavItem {
    id: string
    href: string
    label: string
    subitems?: NavItem[]
    parent?: string
  }

  export interface Location {
    start: {
      index: number
      href: string
      displayed: {
        page: number
        total: number
      }
      cfi: string
    }
    end: {
      index: number
      href: string
      displayed: {
        page: number
        total: number
      }
      cfi: string
    }
    atStart: boolean
    atEnd: boolean
  }

  export interface Locations {
    total: number
    length(): number
    locationFromCfi(cfi: string): number
    percentageFromCfi(cfi: string): number
    cfiFromLocation(loc: number): string
    cfiFromPercentage(percentage: number): string
    generate(chars?: number): Promise<string[]>
  }

  export interface DisplayedLocation {
    start: number
    end: number
    page: number
    total: number
  }

  export interface Themes {
    default(styles: Record<string, any>): void
    fontSize(size: string): void
    font(fontFamily: string): void
    override(name: string, styles: Record<string, any>, important?: boolean): void
    select(name: string): void
    register(name: string, styles: Record<string, any>): void
  }

  export interface Annotations {
    add(
      type: string,
      cfiRange: string,
      data?: any,
      cb?: (() => void) | undefined,
      className?: string,
      styles?: Record<string, any>
    ): void
    remove(cfiRange: string, type?: string): void
    highlight(cfiRange: string, data?: any, cb?: () => void, className?: string, styles?: Record<string, any>): void
    underline(cfiRange: string, data?: any, cb?: () => void, className?: string, styles?: Record<string, any>): void
    mark(cfiRange: string, data?: any, cb?: () => void): void
    each(callback: (annotation: any) => void): void
  }

  export interface Contents {
    document: Document
    window: Window
    documentElement: HTMLElement
    content: HTMLElement
    width(): number
    height(): number
    textWidth(): number
    textHeight(): number
    scrollWidth(): number
    scrollHeight(): number
  }

  export interface Rendition {
    book: Book
    display(target?: string | number): Promise<void>
    prev(): Promise<void>
    next(): Promise<void>
    clear(): void
    destroy(): void
    themes: Themes
    annotations: Annotations
    getRange(cfi: string): Range
    on(event: string, callback: (...args: any[]) => void): void
    off(event: string, callback?: (...args: any[]) => void): void
    once(event: string, callback: (...args: any[]) => void): void
    currentLocation(): Location
    displayed: {
      page: number
      total: number
    }
    location: Location
    resize(width?: number, height?: number): void
    flow(flow: 'paginated' | 'scrolled'): void
    spread(spread: 'none' | 'auto', min?: number): void
    moveTo(cfi: string): void
    reportLocation(): void
  }

  export interface Spine {
    get(target: string | number): any
    each(callback: (item: any) => void): void
  }

  export interface Navigation {
    toc: NavItem[]
    landmarks: NavItem[]
    pageList: NavItem[]
  }

  export interface Metadata {
    title: string
    creator: string
    description: string
    pubdate: string
    publisher: string
    identifier: string
    language: string
    rights: string
    modified_date: string
    layout: string
    orientation: string
    flow: string
    viewport: string
    spread: string
  }

  export interface Book {
    ready: Promise<void>
    opened: Promise<void>
    locations: Locations
    navigation: Navigation
    spine: Spine
    metadata: Metadata
    rendition(options?: any): Rendition
    renderTo(element: HTMLElement | string, options?: any): Rendition
    destroy(): void
    getRange(cfi: string): Range
    key(identifier?: string): string
    load(path: string): Promise<Contents>
    resolve(path: string, relative?: boolean): string
    canonical(path: string): string
    section(target: string | number): any
    cover(url: string): Promise<string>
  }

  export default function ePub(url: string | ArrayBuffer, options?: any): Book
}
