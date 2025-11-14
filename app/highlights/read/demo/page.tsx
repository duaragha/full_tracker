import { ArticleReader } from '@/components/reader/article-reader'

/**
 * Demo page for ArticleReader component
 * Shows the reader with sample article content
 */
export default function ArticleReaderDemoPage() {
  // Sample article content
  const sampleArticle = `
    <h2>Introduction to Modern Web Development</h2>

    <p>
      Modern web development has evolved significantly over the past decade.
      Today's web applications are more complex, performant, and user-friendly
      than ever before. This evolution has been driven by improvements in browser
      capabilities, JavaScript frameworks, and development tools.
    </p>

    <h3>The Rise of Component-Based Architecture</h3>

    <p>
      Component-based architecture has revolutionized how we build user interfaces.
      Instead of creating monolithic applications, developers now compose smaller,
      reusable components that can be tested and maintained independently. This
      approach leads to more maintainable and scalable codebases.
    </p>

    <blockquote>
      "The best architecture is the one that makes change easy." - Uncle Bob
    </blockquote>

    <p>
      Frameworks like React, Vue, and Svelte have popularized this approach, making
      it the de facto standard for modern web applications. Each framework brings
      its own philosophy and trade-offs, but they all share the core principle of
      component composition.
    </p>

    <h3>TypeScript and Type Safety</h3>

    <p>
      TypeScript has become an essential tool in the modern web developer's toolkit.
      By adding static typing to JavaScript, TypeScript helps catch errors early in
      the development process and provides better tooling support through intelligent
      code completion and refactoring capabilities.
    </p>

    <p>
      The benefits of TypeScript become more apparent as projects grow in size and
      complexity. Large codebases with multiple contributors benefit significantly
      from the safety and documentation that types provide. TypeScript's gradual
      adoption path also makes it easy to introduce into existing projects.
    </p>

    <h3>Server-Side Rendering and Performance</h3>

    <p>
      Server-side rendering (SSR) has made a comeback with frameworks like Next.js
      and Remix. By rendering initial HTML on the server, these frameworks provide
      better performance, SEO, and user experience. The combination of SSR with
      client-side hydration creates fast, interactive applications.
    </p>

    <p>
      Performance optimization has become a critical concern for web applications.
      Techniques like code splitting, lazy loading, and efficient bundling help
      reduce initial load times and improve the overall user experience. Tools like
      Lighthouse and Web Vitals provide metrics to measure and improve performance.
    </p>

    <h3>The Future of Web Development</h3>

    <p>
      Looking ahead, several trends are shaping the future of web development.
      WebAssembly promises near-native performance for web applications. Progressive
      Web Apps (PWAs) blur the line between web and native applications. Edge
      computing brings server-side logic closer to users for reduced latency.
    </p>

    <p>
      Artificial intelligence and machine learning are also making their way into
      web development tools. From code completion to automated testing, AI-powered
      tools are helping developers write better code faster. The integration of
      these technologies will continue to evolve and improve developer productivity.
    </p>

    <h3>Conclusion</h3>

    <p>
      Modern web development is an exciting field with constant innovation and
      improvement. By staying current with best practices, using the right tools,
      and focusing on user experience, developers can create applications that are
      both powerful and delightful to use. The journey of learning and adaptation
      never stops in this dynamic field.
    </p>
  `

  // Sample existing highlights
  const sampleHighlights = [
    {
      id: 1,
      text: 'Component-based architecture has revolutionized',
      color: 'yellow',
      location: {},
      locationStart: 450,
      locationEnd: 496,
    },
    {
      id: 2,
      text: 'TypeScript helps catch errors early',
      color: 'green',
      location: {},
      locationStart: 1250,
      locationEnd: 1286,
    },
    {
      id: 3,
      text: 'Server-side rendering (SSR) has made a comeback',
      color: 'blue',
      location: {},
      locationStart: 2100,
      locationEnd: 2147,
    },
  ]

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8">
        {/* Demo Header */}
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold mb-2">Article Reader Demo</h1>
          <p className="text-muted-foreground">
            Try selecting text to create highlights. Scroll to see progress tracking.
          </p>
        </div>

        {/* Article Reader */}
        <ArticleReader
          sourceId={999}
          title="Modern Web Development: A Comprehensive Guide"
          author="Demo Author"
          htmlContent={sampleArticle}
          existingHighlights={sampleHighlights}
          onProgressUpdate={(progress) => {
            console.log(`Reading progress: ${progress}%`)
          }}
        />

        {/* Demo Instructions */}
        <div className="max-w-2xl mx-auto mt-12 p-6 bg-muted rounded-lg">
          <h2 className="text-xl font-semibold mb-4">How to Use the Reader</h2>

          <div className="space-y-4">
            <div>
              <h3 className="font-medium mb-2">1. Create Highlights</h3>
              <p className="text-sm text-muted-foreground">
                Select any text with your mouse. A popover will appear above the selection.
                Choose a color and optionally add a note, then click "Highlight".
              </p>
            </div>

            <div>
              <h3 className="font-medium mb-2">2. View Existing Highlights</h3>
              <p className="text-sm text-muted-foreground">
                Highlighted text appears with colored backgrounds. The demo includes three
                pre-existing highlights in yellow, green, and blue.
              </p>
            </div>

            <div>
              <h3 className="font-medium mb-2">3. Track Reading Progress</h3>
              <p className="text-sm text-muted-foreground">
                As you scroll through the article, your reading progress is automatically
                tracked and saved every 3 seconds. Check the browser console for updates.
              </p>
            </div>

            <div>
              <h3 className="font-medium mb-2">4. Keyboard Shortcuts</h3>
              <p className="text-sm text-muted-foreground">
                • ESC: Close the highlight popover<br />
                • Tab: Navigate through popover controls<br />
                • Enter: Create highlight (when focused on button)
              </p>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-border">
            <h3 className="font-medium mb-2">Available Highlight Colors</h3>
            <div className="flex gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded bg-yellow-200 dark:bg-yellow-900/40 border border-border" />
                <span className="text-sm">Yellow</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded bg-green-200 dark:bg-green-900/40 border border-border" />
                <span className="text-sm">Green</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded bg-blue-200 dark:bg-blue-900/40 border border-border" />
                <span className="text-sm">Blue</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded bg-pink-200 dark:bg-pink-900/40 border border-border" />
                <span className="text-sm">Pink</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded bg-purple-200 dark:bg-purple-900/40 border border-border" />
                <span className="text-sm">Purple</span>
              </div>
            </div>
          </div>
        </div>

        {/* Implementation Info */}
        <div className="max-w-2xl mx-auto mt-8 p-6 bg-muted/50 rounded-lg">
          <h2 className="text-xl font-semibold mb-4">Implementation Details</h2>

          <div className="space-y-2 text-sm">
            <p className="flex items-center gap-2">
              <span className="font-medium">Component:</span>
              <code className="bg-background px-2 py-1 rounded">
                components/reader/article-reader.tsx
              </code>
            </p>
            <p className="flex items-center gap-2">
              <span className="font-medium">Selection Manager:</span>
              <code className="bg-background px-2 py-1 rounded">
                lib/reader/selection-manager.ts
              </code>
            </p>
            <p className="flex items-center gap-2">
              <span className="font-medium">Highlight Popover:</span>
              <code className="bg-background px-2 py-1 rounded">
                components/reader/highlight-popover.tsx
              </code>
            </p>
            <p className="flex items-center gap-2">
              <span className="font-medium">Route:</span>
              <code className="bg-background px-2 py-1 rounded">
                /highlights/read/[sourceId]
              </code>
            </p>
          </div>

          <div className="mt-4 pt-4 border-t border-border">
            <p className="text-sm text-muted-foreground">
              For complete documentation, see:{' '}
              <code className="bg-background px-2 py-1 rounded">
                components/reader/README.md
              </code>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
