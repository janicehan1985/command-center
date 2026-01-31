import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'
import { format, parseISO } from 'date-fns'

const DOCUMENTS_DIR = path.join(process.cwd(), 'documents')

// Get all documents from the directory structure
function getAllDocuments() {
  const documents = []
  
  function scanDirectory(dir, type) {
    if (!fs.existsSync(dir)) return
    
    const files = fs.readdirSync(dir)
    
    files.forEach(file => {
      const filePath = path.join(dir, file)
      const stat = fs.statSync(filePath)
      
      if (stat.isDirectory()) {
        scanDirectory(filePath, type || file)
      } else if (file.endsWith('.md')) {
        const content = fs.readFileSync(filePath, 'utf8')
        const { data, content: markdown } = matter(content)
        
        documents.push({
          id: file.replace('.md', ''),
          title: data.title || file.replace('.md', '').replace(/-/g, ' '),
          type: data.type || type || 'note',
          tags: data.tags || [],
          date: data.date || String(stat.mtime.toISOString()),
          created: data.created || (stat.birthtime ? String(stat.birthtime.toISOString()) : String(stat.mtime.toISOString())),
          updated: String(stat.mtime.toISOString()),
          content: markdown,
          path: filePath,
          category: type || 'general'
        })
      }
    })
  }
  
  scanDirectory(path.join(DOCUMENTS_DIR, 'concepts'), 'concept')
  scanDirectory(path.join(DOCUMENTS_DIR, 'journal'), 'journal')
  
  // Sort by date descending
  return documents.sort((a, b) => new Date(b.date) - new Date(a.date))
}

function formatDate(dateString) {
  try {
    // Handle both ISO strings and full date strings
    if (dateString.includes('GMT')) {
      return dateString.split(' ').slice(0, 4).join(' ')
    }
    return format(parseISO(dateString), 'MMM d, yyyy')
  } catch (e) {
    return dateString.split(' ').slice(0, 4).join(' ')
  }
}

function formatRelativeTime(dateString) {
  try {
    const date = parseISO(dateString)
    const now = new Date()
    const diffMs = now - date
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    
    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays} days ago`
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`
    return formatDate(dateString)
  } catch (e) {
    return String(dateString)
  }
}

function getTagsArray(tags) {
  if (!tags) return []
  if (Array.isArray(tags)) return tags
  if (typeof tags === 'string') return tags.split(',').map(t => t.trim()).filter(Boolean)
  return []
}

// Simple markdown to HTML converter (for basic formatting)
function markdownToHtml(markdown) {
  let html = markdown
  
  // Headers
  html = html.replace(/^### (.*$)/gim, '<h3 id="$1">$1</h3>')
  html = html.replace(/^## (.*$)/gim, '<h2 id="$1">$1</h2>')
  html = html.replace(/^# (.*$)/gim, '<h1 id="$1">$1</h1>')
  
  // Bold/Italic
  html = html.replace(/\*\*\*(.*?)\*\*\*/gim, '<strong><em>$1</em></strong>')
  html = html.replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
  html = html.replace(/\*(.*?)\*/gim, '<em>$1</em>')
  
  // Code blocks
  html = html.replace(/```(\w*)\n([\s\S]*?)```/gim, '<pre><code>$2</code></pre>')
  html = html.replace(/`([^`]+)`/gim, '<code>$1</code>')
  
  // Links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/gim, '<a href="$2" target="_blank">$1</a>')
  
  // Blockquotes
  html = html.replace(/^> (.*$)/gim, '<blockquote>$1</blockquote>')
  
  // Horizontal rules
  html = html.replace(/^---$/gim, '<hr/>')
  
  // Unordered lists
  html = html.replace(/^- (.*$)/gim, '<li>$1</li>')
  html = html.replace(/(<li>.*<\/li>\n?)+/gim, '<ul>$&</ul>')
  
  // Numbered lists
  html = html.replace(/^\d+\. (.*$)/gim, '<li>$1</li>')
  
  // Tables - simple pattern
  html = html.replace(/\|(.+)\|/gim, (match) => {
    const cells = match.split('|').filter(c => c.trim())
    if (cells[0].includes('---')) return ''
    const isHeader = cells.some(c => c.trim().match(/^[-:]+$/))
    const rowType = isHeader ? 'th' : 'td'
    return '<tr>' + cells.map(c => `<${rowType}>${c.trim()}</${rowType}>`).join('') + '</tr>'
  })
  
  // Paragraphs (lines that aren't already HTML)
  const lines = html.split('\n')
  let inList = false
  let inParagraph = false
  let result = ''
  
  lines.forEach(line => {
    const trimmed = line.trim()
    if (!trimmed) {
      if (inParagraph) { result += '</p>'; inParagraph = false }
      if (inList) { result += '</ul>'; inList = false }
      return
    }
    
    if (trimmed.startsWith('<h') || trimmed.startsWith('<ul') || trimmed.startsWith('<pre') || trimmed.startsWith('<blockquote') || trimmed.startsWith('<hr')) {
      if (inParagraph) { result += '</p>'; inParagraph = false }
      if (inList) { result += '</ul>'; inList = false }
      result += trimmed + '\n'
      return
    }
    
    if (trimmed.startsWith('<li>')) {
      if (!inList) { result += '<ul>'; inList = true }
      result += trimmed + '\n'
      return
    }
    
    if (trimmed.startsWith('<')) {
      result += trimmed + '\n'
      return
    }
    
    if (!inParagraph) {
      result += '<p>'
      inParagraph = true
    }
    result += trimmed + ' '
  })
  
  if (inParagraph) result += '</p>'
  if (inList) result += '</ul>'
  
  return html
}

export default function Home() {
  const documents = getAllDocuments()
  const recentDocs = documents.slice(0, 10)
  const concepts = documents.filter(d => d.type === 'concept' || d.category === 'concepts')
  const journals = documents.filter(d => d.type === 'journal' || d.category === 'journal')
  
  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Sidebar */}
      <aside style={{
        width: '280px',
        borderRight: '1px solid var(--border-color)',
        background: 'var(--bg-secondary)',
        padding: '1.5rem',
        position: 'fixed',
        height: '100vh',
        overflowY: 'auto'
      }}>
        <h1 style={{ fontSize: '1.25rem', marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '1.5rem' }}>🧠</span>
          Command Center
        </h1>
        
        <div style={{ marginBottom: '1.5rem' }}>
          <h3 style={{ 
            fontSize: '0.75rem', 
            textTransform: 'uppercase', 
            letterSpacing: '0.05em',
            color: 'var(--text-muted)',
            marginBottom: '0.75rem'
          }}>
            Recent Documents
          </h3>
          {recentDocs.slice(0, 5).map(doc => (
            <div 
              key={doc.id}
              style={{
                display: 'block',
                padding: '0.5rem 0.75rem',
                marginBottom: '0.25rem',
                borderRadius: '6px',
                color: 'var(--text-secondary)',
                fontSize: '0.875rem',
                cursor: 'pointer'
              }}
            >
              <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>
                {doc.title}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                {formatRelativeTime(doc.date)}
              </div>
            </div>
          ))}
        </div>
        
        <div style={{ marginBottom: '1.5rem' }}>
          <h3 style={{ 
            fontSize: '0.75rem', 
            textTransform: 'uppercase', 
            letterSpacing: '0.05em',
            color: 'var(--text-muted)',
            marginBottom: '0.75rem'
          }}>
            Concepts ({concepts.length})
          </h3>
          {concepts.slice(0, 5).map(doc => (
            <div 
              key={doc.id}
              style={{
                display: 'block',
                padding: '0.5rem 0.75rem',
                marginBottom: '0.25rem',
                borderRadius: '6px',
                color: 'var(--text-secondary)',
                fontSize: '0.875rem'
              }}
            >
              {doc.title}
            </div>
          ))}
        </div>
        
        <div>
          <h3 style={{ 
            fontSize: '0.75rem', 
            textTransform: 'uppercase', 
            letterSpacing: '0.05em',
            color: 'var(--text-muted)',
            marginBottom: '0.75rem'
          }}>
            Journal ({journals.length})
          </h3>
          {journals.slice(0, 5).map(doc => (
            <div 
              key={doc.id}
              style={{
                display: 'block',
                padding: '0.5rem 0.75rem',
                marginBottom: '0.25rem',
                borderRadius: '6px',
                color: 'var(--text-secondary)',
                fontSize: '0.875rem'
              }}
            >
              {formatDate(doc.date)}
            </div>
          ))}
        </div>
      </aside>
      
      {/* Main Content */}
      <main style={{
        flex: 1,
        marginLeft: '280px',
        padding: '3rem',
        maxWidth: '900px'
      }}>
        <div style={{ marginBottom: '3rem', paddingBottom: '2rem', borderBottom: '1px solid var(--border-color)' }}>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>
            Welcome to Your Command Center
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1.125rem' }}>
            Your second brain for capturing important concepts and daily discussions.
          </p>
        </div>
        
        {documents.map(doc => (
          <article 
            key={doc.id} 
            style={{
              marginBottom: '4rem',
              paddingBottom: '2rem',
              borderBottom: '1px solid var(--border-color)'
            }}
          >
            <header style={{ marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                <span style={{ 
                  background: doc.type === 'journal' ? '#e3f2fd' : '#e8f5e9',
                  color: doc.type === 'journal' ? '#1565c0' : '#2e7d32',
                  padding: '0.25rem 0.5rem',
                  borderRadius: '4px',
                  fontSize: '0.75rem',
                  fontWeight: 500
                }}>
                  {doc.type}
                </span>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                  {formatRelativeTime(doc.date)}
                </span>
              </div>
              <h2 style={{ 
                fontSize: '1.5rem', 
                fontWeight: 600, 
                marginTop: 0,
                paddingTop: 0,
                borderTop: 'none',
                marginBottom: '0.5rem'
              }}>
                {doc.title}
              </h2>
              {doc.tags && getTagsArray(doc.tags).length > 0 && (
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {getTagsArray(doc.tags).map(tag => (
                    <span 
                      key={tag}
                      style={{
                        background: 'var(--bg-tertiary)',
                        padding: '0.25rem 0.5rem',
                        borderRadius: '4px',
                        fontSize: '0.75rem',
                        color: 'var(--text-secondary)'
                      }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </header>
            
            <div 
              className="document-content"
              dangerouslySetInnerHTML={{ __html: markdownToHtml(doc.content) }}
            />
          </article>
        ))}
        
        {documents.length === 0 && (
          <div style={{ 
            textAlign: 'center', 
            padding: '4rem', 
            color: 'var(--text-muted)',
            background: 'var(--bg-secondary)',
            borderRadius: '12px'
          }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📝</div>
            <h3 style={{ marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>No documents yet</h3>
            <p>Documents will appear here as we discuss important concepts together.</p>
          </div>
        )}
      </main>
    </div>
  )
}

