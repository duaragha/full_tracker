/**
 * Test page for Table of Contents system
 *
 * Navigate to: http://localhost:3000/test-toc
 */

import { ArticleReader } from '@/components/reader/article-reader'

const SAMPLE_ARTICLE = `
  <h1>The Complete Guide to Modern Web Development</h1>

  <p>Web development has evolved significantly over the past decade. This comprehensive guide will walk you through the essential concepts and technologies you need to know to build modern web applications.</p>

  <h2>Introduction to Web Technologies</h2>

  <p>Before diving into specific frameworks and tools, it's important to understand the fundamental technologies that power the web. These core technologies form the foundation of everything we build.</p>

  <h3>HTML: The Structure</h3>

  <p>HTML (HyperText Markup Language) is the backbone of any web page. It provides the structure and semantic meaning to your content. Modern HTML5 introduces many new elements that make it easier to create accessible and well-structured documents.</p>

  <h3>CSS: The Presentation</h3>

  <p>CSS (Cascading Style Sheets) controls the visual presentation of your HTML. With modern CSS3, you can create complex layouts, animations, and responsive designs without relying on JavaScript.</p>

  <h4>Flexbox</h4>

  <p>Flexbox is a one-dimensional layout method for arranging items in rows or columns. It makes it easy to distribute space and align content in ways that were previously difficult with traditional CSS.</p>

  <h4>Grid</h4>

  <p>CSS Grid Layout is a two-dimensional layout system for the web. It lets you lay content out in rows and columns, making it perfect for creating complex responsive layouts.</p>

  <h3>JavaScript: The Behavior</h3>

  <p>JavaScript is the programming language of the web. It allows you to add interactivity, handle user events, manipulate the DOM, and communicate with servers.</p>

  <h4>ES6+ Features</h4>

  <p>Modern JavaScript (ES6 and beyond) introduced many new features that make code more readable and maintainable, including arrow functions, destructuring, and async/await.</p>

  <h4>TypeScript</h4>

  <p>TypeScript is a superset of JavaScript that adds static typing. It helps catch errors early and makes large codebases more maintainable.</p>

  <h2>Frontend Frameworks</h2>

  <p>Frontend frameworks provide structure and tools to build complex applications more efficiently. They handle common tasks like state management, routing, and component composition.</p>

  <h3>React</h3>

  <p>React is a JavaScript library for building user interfaces. It uses a component-based architecture and a virtual DOM for efficient updates.</p>

  <h4>Components</h4>

  <p>React applications are built from components - reusable pieces of UI that manage their own state and logic.</p>

  <h4>Hooks</h4>

  <p>Hooks let you use state and other React features in function components, making your code more concise and easier to understand.</p>

  <h5>useState</h5>

  <p>The useState hook lets you add state to function components. It returns the current state value and a function to update it.</p>

  <h5>useEffect</h5>

  <p>The useEffect hook lets you perform side effects in function components. It's similar to lifecycle methods in class components.</p>

  <h3>Vue.js</h3>

  <p>Vue.js is a progressive framework for building user interfaces. It's designed to be incrementally adoptable and focuses on the view layer.</p>

  <h3>Angular</h3>

  <p>Angular is a full-featured framework by Google. It includes everything you need to build large-scale applications, including TypeScript by default.</p>

  <h2>Backend Development</h2>

  <p>While frontend frameworks handle the user interface, backend development powers the server-side logic, database interactions, and API endpoints.</p>

  <h3>Node.js</h3>

  <p>Node.js allows you to run JavaScript on the server. It's built on Chrome's V8 engine and provides an event-driven, non-blocking I/O model.</p>

  <h4>Express.js</h4>

  <p>Express is a minimal and flexible Node.js web application framework. It provides a robust set of features for web and mobile applications.</p>

  <h4>Next.js</h4>

  <p>Next.js is a React framework that enables server-side rendering and static site generation. It's perfect for building production-ready applications.</p>

  <h3>Databases</h3>

  <p>Databases store and organize your application's data. There are two main types: relational (SQL) and non-relational (NoSQL).</p>

  <h4>SQL Databases</h4>

  <p>SQL databases like PostgreSQL and MySQL use structured schemas and are great for complex queries and relationships.</p>

  <h4>NoSQL Databases</h4>

  <p>NoSQL databases like MongoDB and Redis offer flexible schemas and are optimized for specific use cases like document storage or caching.</p>

  <h2>Development Tools</h2>

  <p>Modern web development relies on various tools to improve productivity, code quality, and developer experience.</p>

  <h3>Version Control</h3>

  <p>Git is the de facto standard for version control. It allows teams to collaborate, track changes, and manage different versions of code.</p>

  <h3>Package Managers</h3>

  <p>Package managers like npm and yarn help you install, update, and manage project dependencies.</p>

  <h3>Build Tools</h3>

  <p>Build tools like Webpack, Vite, and esbuild bundle your code, optimize assets, and provide development servers with hot reloading.</p>

  <h2>Testing</h2>

  <p>Testing ensures your application works as expected and helps prevent bugs from reaching production.</p>

  <h3>Unit Testing</h3>

  <p>Unit tests verify that individual functions and components work correctly in isolation. Libraries like Jest and Vitest make unit testing easy.</p>

  <h3>Integration Testing</h3>

  <p>Integration tests verify that different parts of your application work together correctly.</p>

  <h3>End-to-End Testing</h3>

  <p>E2E tests simulate real user interactions and test your entire application flow. Tools like Playwright and Cypress make this easier.</p>

  <h2>Deployment</h2>

  <p>Deployment is the process of making your application available to users. Modern platforms make this easier than ever.</p>

  <h3>Cloud Platforms</h3>

  <p>Platforms like Vercel, Netlify, and AWS provide hosting, continuous deployment, and scaling capabilities.</p>

  <h3>Containers</h3>

  <p>Docker containers package your application with all its dependencies, ensuring it runs consistently across different environments.</p>

  <h2>Best Practices</h2>

  <p>Following best practices helps you write maintainable, performant, and secure code.</p>

  <h3>Code Organization</h3>

  <p>Organize your code into logical modules and components. Use consistent naming conventions and folder structures.</p>

  <h3>Performance Optimization</h3>

  <p>Optimize images, minimize bundle sizes, implement lazy loading, and use caching strategies to improve performance.</p>

  <h3>Security</h3>

  <p>Always validate user input, use HTTPS, implement proper authentication and authorization, and keep dependencies updated.</p>

  <h2>Conclusion</h2>

  <p>Modern web development is a vast and constantly evolving field. This guide covered the essential technologies and concepts, but there's always more to learn. Keep practicing, building projects, and staying curious!</p>

  <p>Remember, the best way to learn is by doing. Start with small projects and gradually take on more complex challenges as you grow your skills.</p>
`

export default function TestTOCPage() {
  return (
    <div className="container mx-auto py-8">
      <div className="mb-8 text-center">
        <h1 className="text-4xl font-bold mb-2">Table of Contents Test Page</h1>
        <p className="text-muted-foreground">
          This page demonstrates the TOC navigation system. Try scrolling and clicking on TOC items!
        </p>
      </div>

      <ArticleReader
        sourceId={999}
        title="The Complete Guide to Modern Web Development"
        author="Claude Code"
        htmlContent={SAMPLE_ARTICLE}
        existingHighlights={[]}
      />
    </div>
  )
}
