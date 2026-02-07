import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'
import { format, parseISO } from 'date-fns'

const DOCUMENTS_DIR = path.join(process.cwd(), 'documents')

function scanDirectory(dir, baseCategory = 'general') {
  const documents = []
  
  if (!fs.existsSync(dir)) return documents
  
  function scan(dirPath, category) {
    const files = fs.readdirSync(dirPath)
    
    files.forEach(file => {
      const filePath = path.join(dirPath, file)
      const stat = fs.statSync(filePath)
      
      if (stat.isDirectory()) {
        scan(filePath, file)
      } else if (file.endsWith('.md')) {
        const content = fs.readFileSync(filePath, 'utf8')
        const { data, content: markdown } = matter(content)
        
        // Extract year/month from path for reports
        let docType = data.type || category || 'document'
        if (category === 'morning-brief') docType = 'morning-brief'
        if (category === 'research-report') docType = 'research-report'
        
        documents.push({
          id: file.replace('.md', ''),
          title: data.title || file.replace('.md', '').replace(/-/g, ' '),
          type: docType,
          tags: data.tags || [],
          date: data.date || String(stat.mtime.toISOString()),
          created: String(stat.birthtime || stat.mtime),
          updated: String(stat.mtime.toISOString()),
          content: markdown,
          path: filePath,
          category: category || 'general'
        })
      }
    })
  }
  
  scan(dir, baseCategory)
  return documents
}

function getAllDocuments() {
  const docs = []
  const reportsDir = path.join(DOCUMENTS_DIR, 'reports')
  
  // Scan reports
  if (fs.existsSync(reportsDir)) {
    const subdirs = fs.readdirSync(reportsDir)
    subdirs.forEach(subdir => {
      const subdirPath = path.join(reportsDir, subdir)
      if (fs.statSync(subdirPath).isDirectory()) {
        const yearDirs = fs.readdirSync(subdirPath)
        yearDirs.forEach(yearDir => {
          const yearPath = path.join(subdirPath, yearDir)
          if (fs.statSync(yearPath).isDirectory()) {
            const files = fs.readdirSync(yearPath)
            files.forEach(file => {
              if (file.endsWith('.md')) {
                const filePath = path.join(yearPath, file)
                const content = fs.readFileSync(filePath, 'utf8')
                const { data, content: markdown } = matter(content)
                docs.push({
                  id: file.replace('.md', ''),
                  title: data.title || file.replace('.md', '').replace(/-/g, ' '),
                  type: subdir.replace('-', '_'),
                  tags: data.tags || [],
                  date: data.date || file.replace('.md', ''),
                  content: markdown,
                  path: filePath,
                  category: subdir
                })
              }
            })
          }
        })
      }
    })
  }
  
  // Scan concepts and journal
  docs.push(...scanDirectory(path.join(DOCUMENTS_DIR, 'concepts'), 'concept'))
  docs.push(...scanDirectory(path.join(DOCUMENTS_DIR, 'journal'), 'journal'))
  
  // Scan root documents
  docs.push(...scanDirectory(DOCUMENTS_DIR, 'document'))
  
  return docs.sort((a, b) => new Date(b.date) - new Date(a.date))
}

function formatDate(dateString) {
  try {
    if (dateString.includes('GMT')) return dateString.split(' ').slice(0, 4).join(' ')
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      return format(parseISO(dateString), 'MMMM d, yyyy')
    }
    return format(parseISO(dateString), 'MMM d, yyyy')
  } catch (e) {
    return dateString
  }
}

function formatRelativeTime(dateString) {
  try {
    const date = /^\d{4}-\d{2}-\d{2}$/.test(dateString) 
      ? parseISO(dateString + 'T00:00:00')
      : parseISO(dateString)
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

function markdownToHtml(markdown) {
  let html = markdown
  
  // Headers
  html = html.replace(/^### (.*$)/gim, '<h3 id="$1">$1</h3>')
  html = html.replace(/^## (.*$)/gim, '<h2 id="$1">$1</h2>')
  html = html.replace(/^# (.*$)/gim, '<h1 id="$1">$1</h1>')
  
  // Bold/Italic
  html = html.replace(/\*\*\*([^*]+)\*\*\*/gim, '<strong><em>$1</em></strong>')
  html = html.replace(/\*\*([^*]+)\*\*/gim, '<strong>$1</strong>')
  html = html.replace(/\*([^*]+)\*/gim, '<em>$1</em>')
  
  // Code
  html = html.replace(/```(\w*)\n([\s\S]*?)```/gim, '<pre style="background: #f4f4f5; padding: 16px; border-radius: 8px; overflow-x: auto; margin: 16px 0;"><code>$2</code></pre>')
  html = html.replace(/`([^`]+)`/gim, '<code style="background: #f4f4f5; padding: 2px 6px; border-radius: 4px; font-size: 0.9em;">$1</code>')
  
  // Links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/gim, '<a href="$2" target="_blank" style="color: #10b981; text-decoration: underline;">$1</a>')
  
  // Blockquote
  html = html.replace(/^> (.*$)/gim, '<blockquote style="border-left: 3px solid #10b981; padding-left: 16px; margin: 16px 0; color: #6b7280; font-style: italic;">$1</blockquote>')
  
  // Horizontal rule
  html = html.replace(/^---$/gim, '<hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;"/>')
  
  // Lists
  html = html.replace(/^- (.*$)/gim, '<li style="margin-left: 20px; margin-bottom: 4px;">$1</li>')
  
  // Paragraphs
  const lines = html.split('\n')
  let result = ''
  let inList = false
  let inParagraph = false
  
  lines.forEach(line => {
    const trimmed = line.trim()
    if (!trimmed) {
      if (inParagraph) { result += '</p>'; inParagraph = false }
      if (inList) { result += '</ul>'; inList = false }
      return
    }
    
    if (trimmed.startsWith('<h') || trimmed.startsWith('<pre') || trimmed.startsWith('<blockquote') || trimmed.startsWith('<hr') || trimmed.startsWith('<ul')) {
      if (inParagraph) { result += '</p>'; inParagraph = false }
      if (inList) { result += '</ul>'; inList = false }
      result += trimmed + '\n'
      return
    }
    
    if (trimmed.startsWith('<li>')) {
      if (!inList) { result += '<ul style="margin: 12px 0; padding-left: 20px;">'; inList = true }
      result += trimmed + '\n'
      return
    }
    
    if (trimmed.startsWith('<')) {
      result += trimmed + '\n'
      return
    }
    
    if (!inParagraph) {
      result += '<p style="margin: 12px 0; line-height: 1.8;">'
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
  
  const morningBriefs = documents.filter(d => d.type === 'morning-brief').sort((a, b) => new Date(b.date) - new Date(a.date))
  const researchReports = documents.filter(d => d.type === 'research-report').sort((a, b) => new Date(b.date) - new Date(a.date))
  const concepts = documents.filter(d => d.type === 'concept')
  const journals = documents.filter(d => d.type === 'journal')
  const otherDocs = documents.filter(d => !['morning-brief', 'research-report', 'concept', 'journal'].includes(d.type))
  
  return (
    <div style={{ 
      minHeight: '100vh', 
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      background: '#f7f9fc',
      color: '#1a1a2e'
    }}>
      {/* Header */}
      <header style={{
        background: '#fff',
        borderBottom: '1px solid #e1e5eb',
        padding: '1rem 2rem',
        position: 'sticky',
        top: 0,
        zIndex: 100
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            📚 Command Center
          </h1>
          <nav style={{ display: 'flex', gap: '1rem' }}>
            <a href="#morning-briefs" style={{ color: '#6b7280', textDecoration: 'none', fontSize: '0.875rem' }}>☀️ Morning Briefs</a>
            <a href="#research-reports" style={{ color: '#6b7280', textDecoration: 'none', fontSize: '0.875rem' }}>📚 Research Reports</a>
            <a href="#concepts" style={{ color: '#6b7280', textDecoration: 'none', fontSize: '0.875rem' }}>💡 Concepts</a>
          </nav>
        </div>
      </header>

      <main style={{ maxWidth: '900px', margin: '0 auto', padding: '2rem' }}>
        {/* Welcome */}
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '0.5rem' }}>📚 Document Library</h1>
          <p style={{ color: '#6b7280' }}>{documents.length} documents stored</p>
        </div>

        {/* Morning Briefs Section */}
        {morningBriefs.length > 0 && (
          <section id="morning-briefs" style={{ marginBottom: '3rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              ☀️ Morning Briefs <span style={{ fontSize: '0.875rem', fontWeight: 400, color: '#6b7280' }}>{morningBriefs.length}</span>
            </h2>
            <div style={{ display: 'grid', gap: '1rem' }}>
              {morningBriefs.slice(0, 5).map(doc => (
                <article key={doc.id} id={`doc-${doc.id}`} style={{
                  background: '#fff',
                  border: '1px solid #e1e5eb',
                  borderRadius: '12px',
                  padding: '1.5rem',
                  transition: 'all 0.2s ease'
                }}>
                  <header style={{ marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                      <h3 style={{ fontSize: '1.125rem', fontWeight: 600, margin: 0 }}>{doc.title}</h3>
                      <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>{formatRelativeTime(doc.date)}</span>
                    </div>
                    {doc.tags && getTagsArray(doc.tags).length > 0 && (
                      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
                        {getTagsArray(doc.tags).slice(0, 4).map(tag => (
                          <span key={tag} style={{ background: '#f3f4f6', padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', color: '#6b7280' }}>#{tag}</span>
                        ))}
                      </div>
                    )}
                  </header>
                  <div dangerouslySetInnerHTML={{ __html: markdownToHtml(doc.content.substring(0, 300) + '...') }} />
                  <a href={`#doc-${doc.id}`} style={{ display: 'inline-block', marginTop: '1rem', color: '#10b981', textDecoration: 'none', fontSize: '0.875rem', fontWeight: 500 }}>Read full document →</a>
                </article>
              ))}
            </div>
          </section>
        )}

        {/* Research Reports Section */}
        {researchReports.length > 0 && (
          <section id="research-reports" style={{ marginBottom: '3rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              📚 Research Reports <span style={{ fontSize: '0.875rem', fontWeight: 400, color: '#6b7280' }}>{researchReports.length}</span>
            </h2>
            <div style={{ display: 'grid', gap: '1rem' }}>
              {researchReports.slice(0, 5).map(doc => (
                <article key={doc.id} id={`doc-${doc.id}`} style={{
                  background: '#fff',
                  border: '1px solid #e1e5eb',
                  borderRadius: '12px',
                  padding: '1.5rem',
                  transition: 'all 0.2s ease'
                }}>
                  <header style={{ marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                      <h3 style={{ fontSize: '1.125rem', fontWeight: 600, margin: 0 }}>{doc.title}</h3>
                      <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>{formatRelativeTime(doc.date)}</span>
                    </div>
                    {doc.tags && getTagsArray(doc.tags).length > 0 && (
                      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
                        {getTagsArray(doc.tags).slice(0, 4).map(tag => (
                          <span key={tag} style={{ background: '#f3f4f6', padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', color: '#6b7280' }}>#{tag}</span>
                        ))}
                      </div>
                    )}
                  </header>
                  <div dangerouslySetInnerHTML={{ __html: markdownToHtml(doc.content.substring(0, 400) + '...') }} />
                  <a href={`#doc-${doc.id}`} style={{ display: 'inline-block', marginTop: '1rem', color: '#10b981', textDecoration: 'none', fontSize: '0.875rem', fontWeight: 500 }}>Read full document →</a>
                </article>
              ))}
            </div>
          </section>
        )}

        {/* Concepts Section */}
        {concepts.length > 0 && (
          <section id="concepts" style={{ marginBottom: '3rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              💡 Concepts <span style={{ fontSize: '0.875rem', fontWeight: 400, color: '#6b7280' }}>{concepts.length}</span>
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '1rem' }}>
              {concepts.map(doc => (
                <article key={doc.id} id={`doc-${doc.id}`} style={{
                  background: '#fff',
                  border: '1px solid #e1e5eb',
                  borderRadius: '12px',
                  padding: '1.25rem',
                  transition: 'all 0.2s ease'
                }}>
                  <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.5rem' }}>{doc.title}</h3>
                  <p style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.5rem' }}>
                    {doc.content.substring(0, 100).replace(/[#*`]/g, '')}...
                  </p>
                  <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>{formatRelativeTime(doc.date)}</span>
                </article>
              ))}
            </div>
          </section>
        )}

        {/* Journal Section */}
        {journals.length > 0 && (
          <section id="journal" style={{ marginBottom: '3rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              📓 Journal <span style={{ fontSize: '0.875rem', fontWeight: 400, color: '#6b7280' }}>{journals.length}</span>
            </h2>
            <div style={{ display: 'grid', gap: '0.75rem' }}>
              {journals.slice(0, 10).map(doc => (
                <div key={doc.id} id={`doc-${doc.id}`} style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '1rem 1.25rem',
                  background: '#fff',
                  border: '1px solid #e1e5eb',
                  borderRadius: '8px'
                }}>
                  <span style={{ fontWeight: 500 }}>{doc.title}</span>
                  <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>{formatDate(doc.date)}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Other Documents */}
        {otherDocs.length > 0 && (
          <section id="documents" style={{ marginBottom: '3rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem' }}>📄 Documents</h2>
            <div style={{ display: 'grid', gap: '0.75rem' }}>
              {otherDocs.map(doc => (
                <div key={doc.id} id={`doc-${doc.id}`} style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '1rem 1.25rem',
                  background: '#fff',
                  border: '1px solid #e1e5eb',
                  borderRadius: '8px'
                }}>
                  <span style={{ fontWeight: 500 }}>{doc.title}</span>
                  <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>{formatRelativeTime(doc.date)}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Empty State */}
        {documents.length === 0 && (
          <div style={{ textAlign: 'center', padding: '4rem', background: '#fff', borderRadius: '12px', border: '1px solid #e1e5eb' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📚</div>
            <h3 style={{ marginBottom: '0.5rem', color: '#6b7280' }}>No documents yet</h3>
            <p style={{ color: '#9ca3af' }}>Morning briefs and research reports will appear here automatically.</p>
          </div>
        )}
      </main>
    </div>
  )
}
